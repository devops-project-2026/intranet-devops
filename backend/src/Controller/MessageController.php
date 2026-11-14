<?php

namespace App\Controller;

use App\Entity\Message;
use App\Entity\MessageAttachment;
use App\Entity\AppUser;
use App\Entity\CompanyMember;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/messages')]
class MessageController extends AbstractController
{
    #[Route('/contacts', name: 'api_messages_contacts', methods: ['GET'])]
    public function getContacts(EntityManagerInterface $entityManager): JsonResponse
    {
        $currentUser = $this->getUser();
        if (!$currentUser instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        // For this implementation, return all users except the current user
        $users = $entityManager->getRepository(AppUser::class)->findAll();
        $contacts = [];

        foreach ($users as $user) {
            if ($user->getId() !== $currentUser->getId()) {
                $contacts[] = [
                    'id' => $user->getId(),
                    'name' => $user->getName(),
                    'email' => $user->getEmail(),
                    'roles' => $user->getRoles(),
                    'avatarUrl' => $user->getAvatarUrl(),
                    'status' => $user->getStatus(),
                    'companies' => $this->serializeUserCompanies($user, $entityManager),
                ];
            }
        }

        return $this->json($contacts);
    }

    #[Route('/{userId}', name: 'api_messages_history', methods: ['GET'])]
    public function getConversation(int $userId, EntityManagerInterface $entityManager): JsonResponse
    {
        $currentUser = $this->getUser();
        if (!$currentUser instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $otherUser = $entityManager->getRepository(AppUser::class)->find($userId);
        if (!$otherUser) {
            return $this->json(['message' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        // Fetch messages where (sender = me AND receiver = other) OR (sender = other AND receiver = me)
        $qb = $entityManager->createQueryBuilder();
        $messages = $qb->select('m')
            ->from(Message::class, 'm')
            ->where('(m.sender = :currentUser AND m.receiver = :otherUser) OR (m.sender = :otherUser AND m.receiver = :currentUser)')
            ->setParameter('currentUser', $currentUser)
            ->setParameter('otherUser', $otherUser)
            ->orderBy('m.createdAt', 'ASC') // Oldest first
            ->getQuery()
            ->getResult();

        $data = [];
        foreach ($messages as $msg) {
            $data[] = $this->serializeMessage($msg, $entityManager);
        }

        return $this->json($data);
    }

    #[Route('/attachments/{id}/download', name: 'api_messages_attachments_download', methods: ['GET'])]
    public function downloadAttachment(int $id, EntityManagerInterface $entityManager): Response
    {
        $currentUser = $this->getUser();
        if (!$currentUser instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $attachment = $entityManager->getRepository(MessageAttachment::class)->find($id);
        if (!$attachment || !$attachment->getMessage()) {
            return $this->json(['message' => 'Attachment not found'], Response::HTTP_NOT_FOUND);
        }

        $message = $attachment->getMessage();
        if (
            $message->getSender()?->getId() !== $currentUser->getId()
            && $message->getReceiver()?->getId() !== $currentUser->getId()
        ) {
            return $this->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $filePath = $this->getParameter('kernel.project_dir') . '/public/' . $attachment->getFilePath();
        if (!is_file($filePath)) {
            return $this->json(['message' => 'File not found'], Response::HTTP_NOT_FOUND);
        }

        $response = new BinaryFileResponse($filePath);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $attachment->getFileName());
        return $response;
    }

    #[Route('/{userId}', name: 'api_messages_send', methods: ['POST'])]
    public function sendMessage(int $userId, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $currentUser = $this->getUser();
        if (!$currentUser instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $otherUser = $entityManager->getRepository(AppUser::class)->find($userId);
        if (!$otherUser) {
            return $this->json(['message' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        $data = str_contains((string) $request->headers->get('Content-Type'), 'application/json')
            ? (json_decode($request->getContent(), true) ?: [])
            : [];
        $content = trim((string) ($request->request->get('content') ?? $data['content'] ?? ''));
        $files = $this->extractUploadedFiles($request);

        if ($content === '' && count($files) === 0) {
            return $this->json(['message' => 'Message text or an attachment is required'], Response::HTTP_BAD_REQUEST);
        }

        $message = new Message();
        $message->setSender($currentUser);
        $message->setReceiver($otherUser);
        $message->setContent($content);

        $entityManager->persist($message);

        foreach ($files as $file) {
            $entityManager->persist($this->storeAttachment($message, $file));
        }

        $entityManager->flush();

        return $this->json($this->serializeMessage($message, $entityManager), Response::HTTP_CREATED);
    }

    private function serializeUserCompanies(AppUser $user, EntityManagerInterface $entityManager): array
    {
        $memberships = $entityManager->getRepository(CompanyMember::class)->findBy(['user' => $user]);

        return array_map(fn (CompanyMember $membership) => [
            'id' => $membership->getCompany()?->getId(),
            'name' => $membership->getCompany()?->getName(),
            'role' => $membership->getRole(),
            'title' => $membership->getTitle(),
        ], $memberships);
    }

    private function serializeMessage(Message $message, EntityManagerInterface $entityManager): array
    {
        $attachments = $entityManager->getRepository(MessageAttachment::class)->findBy(
            ['message' => $message],
            ['createdAt' => 'ASC']
        );

        return [
            'id' => $message->getId(),
            'content' => $message->getContent(),
            'createdAt' => $message->getCreatedAt()?->format('c'),
            'sender' => [
                'id' => $message->getSender()?->getId(),
                'name' => $message->getSender()?->getName(),
                'avatarUrl' => $message->getSender()?->getAvatarUrl(),
            ],
            'attachments' => array_map(fn (MessageAttachment $attachment) => $this->serializeAttachment($attachment), $attachments),
        ];
    }

    private function serializeAttachment(MessageAttachment $attachment): array
    {
        return [
            'id' => $attachment->getId(),
            'fileName' => $attachment->getFileName(),
            'mimeType' => $attachment->getMimeType(),
            'fileSize' => $attachment->getFileSize(),
        ];
    }

    /**
     * @return list<UploadedFile>
     */
    private function extractUploadedFiles(Request $request): array
    {
        $files = [];
        $this->collectUploadedFiles($request->files->get('file'), $files);
        $this->collectUploadedFiles($request->files->get('files'), $files);

        return $files;
    }

    /**
     * @param list<UploadedFile> $files
     */
    private function collectUploadedFiles(mixed $value, array &$files): void
    {
        if ($value instanceof UploadedFile) {
            $files[] = $value;
            return;
        }

        if (!is_array($value)) {
            return;
        }

        foreach ($value as $item) {
            $this->collectUploadedFiles($item, $files);
        }
    }

    private function storeAttachment(Message $message, UploadedFile $file): MessageAttachment
    {
        $uploadsDir = $this->getParameter('kernel.project_dir') . '/public/uploads/messages';
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0775, true);
        }

        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';
        $fileSize = (int) $file->getSize();
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $newFileName = bin2hex(random_bytes(16)) . ($extension ? '.' . strtolower($extension) : '');
        $file->move($uploadsDir, $newFileName);

        $attachment = new MessageAttachment();
        $attachment->setFileName($originalName);
        $attachment->setFilePath('uploads/messages/' . $newFileName);
        $attachment->setMimeType($mimeType);
        $attachment->setFileSize($fileSize);
        $attachment->setMessage($message);

        return $attachment;
    }
}
