<?php

namespace App\Controller;

use App\Entity\PostAttachment;
use App\Entity\DownloadRequest;
use App\Entity\Post;
use App\Entity\AppUser;
use App\Entity\Company;
use App\Entity\CompanyMember;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class AttachmentController extends AbstractController
{
    #[Route('/api/posts/{postId}/attachments', name: 'api_attachments_upload', methods: ['POST'])]
    public function upload(int $postId, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $post = $em->getRepository(Post::class)->find($postId);
        if (!$post || $post->getAuthor()->getId() !== $user->getId()) {
            return $this->json(['message' => 'Post not found or not yours'], Response::HTTP_FORBIDDEN);
        }

        $file = $request->files->get('file');
        if (!$file) {
            return $this->json(['message' => 'No file uploaded'], Response::HTTP_BAD_REQUEST);
        }

        $accessType = $request->request->get('accessType', 'public');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $fileSize = $file->getSize();
        $newFileName = uniqid() . '_' . $originalName;

        $uploadsDir = $this->getParameter('kernel.project_dir') . '/public/uploads';
        $file->move($uploadsDir, $newFileName);

        $attachment = new PostAttachment();
        $attachment->setFileName($originalName);
        $attachment->setFilePath('uploads/' . $newFileName);
        $attachment->setMimeType($mimeType);
        $attachment->setFileSize($fileSize);
        $attachment->setAccessType($accessType);
        $attachment->setPost($post);

        $em->persist($attachment);
        $em->flush();

        return $this->json([
            'id' => $attachment->getId(),
            'fileName' => $attachment->getFileName(),
            'mimeType' => $attachment->getMimeType(),
            'fileSize' => $attachment->getFileSize(),
            'accessType' => $attachment->getAccessType(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/attachments/{id}/download', name: 'api_attachments_download', methods: ['GET'])]
    public function download(int $id, EntityManagerInterface $em): Response
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $attachment = $em->getRepository(PostAttachment::class)->find($id);
        if (!$attachment) {
            return $this->json(['message' => 'Attachment not found'], Response::HTTP_NOT_FOUND);
        }

        $isOwner = $attachment->getPost()->getAuthor()->getId() === $user->getId();

        if ($attachment->getAccessType() === 'private' && !$isOwner) {
            // Check for approved download request
            $approved = $em->getRepository(DownloadRequest::class)->findOneBy([
                'requester' => $user,
                'attachment' => $attachment,
                'status' => 'approved'
            ]);
            if (!$approved) {
                return $this->json(['message' => 'Access denied. Request access first.'], Response::HTTP_FORBIDDEN);
            }
        }

        $filePath = $this->getParameter('kernel.project_dir') . '/public/' . $attachment->getFilePath();
        $response = new BinaryFileResponse($filePath);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $attachment->getFileName());
        return $response;
    }

    #[Route('/api/attachments/{id}/request', name: 'api_attachments_request', methods: ['POST'])]
    public function requestAccess(int $id, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $attachment = $em->getRepository(PostAttachment::class)->find($id);
        if (!$attachment) {
            return $this->json(['message' => 'Attachment not found'], Response::HTTP_NOT_FOUND);
        }

        // Check if already requested
        $existing = $em->getRepository(DownloadRequest::class)->findOneBy([
            'requester' => $user, 'attachment' => $attachment
        ]);
        if ($existing) {
            return $this->json(['message' => 'Already requested', 'status' => $existing->getStatus()]);
        }

        $dr = new DownloadRequest();
        $dr->setRequester($user);
        $dr->setAttachment($attachment);
        $dr->setCompany($this->getPrimaryCompany($user, $em));
        $em->persist($dr);
        $em->flush();

        return $this->json(['id' => $dr->getId(), 'status' => 'pending'], Response::HTTP_CREATED);
    }

    #[Route('/api/download-requests/{id}', name: 'api_download_requests_update', methods: ['PATCH'])]
    public function updateRequest(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $dr = $em->getRepository(DownloadRequest::class)->find($id);
        if (!$dr) {
            return $this->json(['message' => 'Request not found'], Response::HTTP_NOT_FOUND);
        }

        // Only the post author can approve/reject
        if ($dr->getAttachment()->getPost()->getAuthor()->getId() !== $user->getId()) {
            return $this->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);
        $status = $data['status'] ?? null;
        if (!in_array($status, ['approved', 'rejected'])) {
            return $this->json(['message' => 'Invalid status'], Response::HTTP_BAD_REQUEST);
        }

        $dr->setStatus($status);
        $em->flush();

        return $this->json(['id' => $dr->getId(), 'status' => $dr->getStatus()]);
    }

    #[Route('/api/my-download-requests', name: 'api_my_download_requests', methods: ['GET'])]
    public function myDownloadRequests(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        // Get all attachments from posts authored by this user
        $qb = $em->createQueryBuilder();
        $requests = $qb->select('dr')
            ->from(DownloadRequest::class, 'dr')
            ->join('dr.attachment', 'a')
            ->join('a.post', 'p')
            ->where('p.author = :user')
            ->setParameter('user', $user)
            ->orderBy('dr.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        $data = [];
        foreach ($requests as $dr) {
            $data[] = [
                'id' => $dr->getId(),
                'status' => $dr->getStatus(),
                'createdAt' => $dr->getCreatedAt()->format('c'),
                'requester' => [
                    'id' => $dr->getRequester()->getId(),
                    'name' => $dr->getRequester()->getName(),
                ],
                'company' => $this->serializeCompanySummary($dr->getCompany()),
                'attachment' => [
                    'id' => $dr->getAttachment()->getId(),
                    'fileName' => $dr->getAttachment()->getFileName(),
                ]
            ];
        }

        return $this->json($data);
    }

    #[Route('/api/sent-download-requests', name: 'api_sent_download_requests', methods: ['GET'])]
    public function sentDownloadRequests(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        // Get all requests sent by this user
        $requests = $em->getRepository(DownloadRequest::class)->findBy(
            ['requester' => $user],
            ['createdAt' => 'DESC']
        );

        $data = [];
        foreach ($requests as $dr) {
            $data[] = [
                'id' => $dr->getId(),
                'status' => $dr->getStatus(),
                'createdAt' => $dr->getCreatedAt()->format('c'),
                'author' => [
                    'id' => $dr->getAttachment()->getPost()->getAuthor()->getId(),
                    'name' => $dr->getAttachment()->getPost()->getAuthor()->getName(),
                ],
                'company' => $this->serializeCompanySummary($dr->getCompany()),
                'attachment' => [
                    'id' => $dr->getAttachment()->getId(),
                    'fileName' => $dr->getAttachment()->getFileName(),
                ]
            ];
        }

        return $this->json($data);
    }

    #[Route('/api/admin/requests', name: 'api_admin_requests_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminRequests(EntityManagerInterface $em): JsonResponse
    {
        $requests = $em->getRepository(DownloadRequest::class)->findBy([], ['createdAt' => 'DESC']);

        return $this->json(array_map(
            fn (DownloadRequest $request) => $this->serializeAdminDownloadRequest($request),
            $requests
        ));
    }

    #[Route('/api/admin/requests/{id}', name: 'api_admin_requests_update', methods: ['PATCH'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminUpdateRequest(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $downloadRequest = $em->getRepository(DownloadRequest::class)->find($id);
        if (!$downloadRequest) {
            return $this->json(['message' => 'Request not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?: [];
        $status = $data['status'] ?? null;
        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            return $this->json(['message' => 'Invalid status'], Response::HTTP_BAD_REQUEST);
        }

        $downloadRequest->setStatus($status);
        $em->flush();

        return $this->json($this->serializeAdminDownloadRequest($downloadRequest));
    }

    private function getPrimaryCompany(AppUser $user, EntityManagerInterface $em): ?Company
    {
        $membership = $em->getRepository(CompanyMember::class)->findOneBy([
            'user' => $user,
            'status' => CompanyMember::STATUS_ACTIVE,
        ]);

        return $membership?->getCompany();
    }

    private function serializeCompanySummary(?Company $company): ?array
    {
        if (!$company) {
            return null;
        }

        return [
            'id' => $company->getId(),
            'name' => $company->getName(),
            'stage' => $company->getStage(),
            'status' => $company->getStatus(),
        ];
    }

    private function serializeAdminDownloadRequest(DownloadRequest $request): array
    {
        $attachment = $request->getAttachment();
        $post = $attachment?->getPost();
        $author = $post?->getAuthor();
        $requester = $request->getRequester();

        return [
            'id' => $request->getId(),
            'status' => $request->getStatus(),
            'createdAt' => $request->getCreatedAt()?->format('c'),
            'requester' => [
                'id' => $requester?->getId(),
                'name' => $requester?->getName(),
                'email' => $requester?->getEmail(),
                'avatarUrl' => $requester?->getAvatarUrl(),
            ],
            'company' => $this->serializeCompanySummary($request->getCompany()),
            'attachment' => [
                'id' => $attachment?->getId(),
                'fileName' => $attachment?->getFileName(),
                'mimeType' => $attachment?->getMimeType(),
                'fileSize' => $attachment?->getFileSize(),
                'accessType' => $attachment?->getAccessType(),
            ],
            'post' => [
                'id' => $post?->getId(),
                'content' => $post?->getContent(),
                'createdAt' => $post?->getCreatedAt()?->format('c'),
                'author' => [
                    'id' => $author?->getId(),
                    'name' => $author?->getName(),
                    'email' => $author?->getEmail(),
                ],
            ],
        ];
    }
}
