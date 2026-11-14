<?php

namespace App\Controller;

use App\Entity\Post;
use App\Entity\PostLike;
use App\Entity\Comment;
use App\Entity\PostAttachment;
use App\Entity\DownloadRequest;
use App\Entity\AppUser;
use App\Entity\Company;
use App\Entity\CompanyMember;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/posts')]
class PostController extends AbstractController
{
    #[Route('/me', name: 'api_posts_me', methods: ['GET'])]
    // List posts authored by the current user with engagement totals.
    public function myPosts(EntityManagerInterface $entityManager): JsonResponse
    {
        $currentUser = $this->getUser();
        if (!$currentUser instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $posts = $entityManager->getRepository(Post::class)->findBy(['author' => $currentUser], ['createdAt' => 'DESC']);
        $data = [];

        foreach ($posts as $post) {
            $author = $post->getAuthor();
            
            // Count likes
            $likeCount = $entityManager->getRepository(PostLike::class)->count(['post' => $post]);
            
            // Check if current user liked
            $userLiked = false;
            $existingLike = $entityManager->getRepository(PostLike::class)->findOneBy([
                'user' => $currentUser,
                'post' => $post
            ]);
            $userLiked = $existingLike !== null;
            
            // Count comments
            $commentCount = $entityManager->getRepository(Comment::class)->count(['post' => $post]);

            // Attachments
            $attachments = $entityManager->getRepository(PostAttachment::class)->findBy(['post' => $post]);
            $attachmentData = [];
            foreach ($attachments as $att) {
                $attachmentData[] = [
                    'id' => $att->getId(),
                    'fileName' => $att->getFileName(),
                    'mimeType' => $att->getMimeType(),
                    'fileSize' => $att->getFileSize(),
                    'accessType' => $att->getAccessType(),
                ];
            }

            $data[] = [
                'id' => $post->getId(),
                'content' => $post->getContent(),
                'createdAt' => $post->getCreatedAt()->format('c'),
                'author' => $this->serializePostAuthor($author, $post->getCompany(), $entityManager),
                'company' => $this->serializeCompanySummary($post->getCompany()),
                'likeCount' => $likeCount,
                'commentCount' => $commentCount,
                'userLiked' => $userLiked,
                'attachments' => $attachmentData,
            ];
        }

        return $this->json($data);
    }

    #[Route('', name: 'api_posts_list', methods: ['GET'])]
    // List all posts with like/comment counts and attachment metadata.
    public function index(EntityManagerInterface $entityManager): JsonResponse
    {
        $currentUser = $this->getUser();
        $posts = $entityManager->getRepository(Post::class)->findBy([], ['createdAt' => 'DESC']);
        $data = [];

        foreach ($posts as $post) {
            $author = $post->getAuthor();
            
            // Count likes
            $likeCount = $entityManager->getRepository(PostLike::class)->count(['post' => $post]);
            
            // Check if current user liked
            $userLiked = false;
            if ($currentUser instanceof AppUser) {
                $existingLike = $entityManager->getRepository(PostLike::class)->findOneBy([
                    'user' => $currentUser,
                    'post' => $post
                ]);
                $userLiked = $existingLike !== null;
            }
            
            // Count comments
            $commentCount = $entityManager->getRepository(Comment::class)->count(['post' => $post]);

            // Attachments
            $attachments = $entityManager->getRepository(PostAttachment::class)->findBy(['post' => $post]);
            $attachmentData = [];
            foreach ($attachments as $att) {
                $requestStatus = null;
                if ($att->getAccessType() === 'private' && $currentUser instanceof AppUser && $author->getId() !== $currentUser->getId()) {
                    $dr = $entityManager->getRepository(DownloadRequest::class)->findOneBy([
                        'requester' => $currentUser, 'attachment' => $att
                    ]);
                    $requestStatus = $dr ? $dr->getStatus() : null;
                }
                $attachmentData[] = [
                    'id' => $att->getId(),
                    'fileName' => $att->getFileName(),
                    'mimeType' => $att->getMimeType(),
                    'fileSize' => $att->getFileSize(),
                    'accessType' => $att->getAccessType(),
                    'requestStatus' => $requestStatus,
                ];
            }

            $data[] = [
                'id' => $post->getId(),
                'content' => $post->getContent(),
                'createdAt' => $post->getCreatedAt()->format('c'),
                'author' => $this->serializePostAuthor($author, $post->getCompany(), $entityManager),
                'company' => $this->serializeCompanySummary($post->getCompany()),
                'likeCount' => $likeCount,
                'commentCount' => $commentCount,
                'userLiked' => $userLiked,
                'attachments' => $attachmentData,
            ];
        }

        return $this->json($data);
    }

    #[Route('', name: 'api_posts_create', methods: ['POST'])]
    // Create a new post for the user or their primary company.
    public function create(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? null;
        $company = null;

        if (!$content) {
            return $this->json(['message' => 'Content is required'], Response::HTTP_BAD_REQUEST);
        }

        if (!empty($data['companyId'])) {
            $company = $entityManager->getRepository(Company::class)->find((int) $data['companyId']);
            if (!$company) {
                return $this->json(['message' => 'Company not found'], Response::HTTP_NOT_FOUND);
            }

            if (!$this->userCanPostForCompany($user, $company, $entityManager)) {
                return $this->json(['message' => 'You are not a member of this company'], Response::HTTP_FORBIDDEN);
            }
        } else {
            $company = $this->getPrimaryCompany($user, $entityManager);
        }

        $post = new Post();
        $post->setContent($content);
        $post->setAuthor($user);
        $post->setCompany($company);

        $entityManager->persist($post);
        $entityManager->flush();

        return $this->json([
            'id' => $post->getId(),
            'content' => $post->getContent(),
            'createdAt' => $post->getCreatedAt()->format('c'),
            'author' => $this->serializePostAuthor($user, $post->getCompany(), $entityManager),
            'company' => $this->serializeCompanySummary($post->getCompany()),
            'likeCount' => 0,
            'commentCount' => 0,
            'userLiked' => false,
            'message' => 'Post created successfully'
        ], Response::HTTP_CREATED);
    }

    // ========== LIKES ==========

    #[Route('/{id}/like', name: 'api_posts_like', methods: ['POST'])]
    // Toggle the like state for the current user on a post.
    public function toggleLike(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $post = $entityManager->getRepository(Post::class)->find($id);
        if (!$post) {
            return $this->json(['message' => 'Post not found'], Response::HTTP_NOT_FOUND);
        }

        // Check if already liked
        $existingLike = $entityManager->getRepository(PostLike::class)->findOneBy([
            'user' => $user,
            'post' => $post
        ]);

        if ($existingLike) {
            // Unlike
            $entityManager->remove($existingLike);
            $entityManager->flush();
            $liked = false;
        } else {
            // Like
            $like = new PostLike();
            $like->setUser($user);
            $like->setPost($post);
            $entityManager->persist($like);
            $entityManager->flush();
            $liked = true;
        }

        $newCount = $entityManager->getRepository(PostLike::class)->count(['post' => $post]);

        return $this->json([
            'liked' => $liked,
            'likeCount' => $newCount
        ]);
    }

    // ========== COMMENTS ==========

    #[Route('/{id}/comments', name: 'api_posts_comments_list', methods: ['GET'])]
    // Fetch all comments for a post in chronological order.
    public function getComments(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        $post = $entityManager->getRepository(Post::class)->find($id);
        if (!$post) {
            return $this->json(['message' => 'Post not found'], Response::HTTP_NOT_FOUND);
        }

        $comments = $entityManager->getRepository(Comment::class)->findBy(
            ['post' => $post],
            ['createdAt' => 'ASC']
        );

        $data = [];
        foreach ($comments as $comment) {
            $data[] = [
                'id' => $comment->getId(),
                'content' => $comment->getContent(),
                'createdAt' => $comment->getCreatedAt()->format('c'),
                'author' => [
                    'id' => $comment->getAuthor()->getId(),
                    'name' => $comment->getAuthor()->getName(),
                    'roles' => $comment->getAuthor()->getRoles(),
                ]
            ];
        }

        return $this->json($data);
    }

    #[Route('/{id}/comments', name: 'api_posts_comments_create', methods: ['POST'])]
    // Add a new comment to a post by the current user.
    public function addComment(int $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $post = $entityManager->getRepository(Post::class)->find($id);
        if (!$post) {
            return $this->json(['message' => 'Post not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? null;

        if (!$content) {
            return $this->json(['message' => 'Content is required'], Response::HTTP_BAD_REQUEST);
        }

        $comment = new Comment();
        $comment->setContent($content);
        $comment->setAuthor($user);
        $comment->setPost($post);

        $entityManager->persist($comment);
        $entityManager->flush();

        return $this->json([
            'id' => $comment->getId(),
            'content' => $comment->getContent(),
            'createdAt' => $comment->getCreatedAt()->format('c'),
            'author' => [
                'id' => $user->getId(),
                'name' => $user->getName(),
                'roles' => $user->getRoles(),
            ]
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_posts_delete', methods: ['DELETE'])]
    // Delete a post owned by the current user.
    public function deletePost(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $post = $entityManager->getRepository(Post::class)->find($id);
        if (!$post) {
            return $this->json(['message' => 'Post not found'], Response::HTTP_NOT_FOUND);
        }

        if ($post->getAuthor()->getId() !== $user->getId()) {
            return $this->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $entityManager->remove($post);
        $entityManager->flush();

        return $this->json(['message' => 'Post deleted successfully']);
    }

    // Build a minimal company payload for post responses.
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
            'sector' => $company->getSector(),
            'cohort' => $company->getCohort(),
            'logoUrl' => $company->getLogoUrl(),
        ];
    }

    // Build a post author payload with membership info.
    private function serializePostAuthor(AppUser $author, ?Company $company, EntityManagerInterface $entityManager): array
    {
        return [
            'id' => $author->getId(),
            'name' => $author->getName(),
            'roles' => $author->getRoles(),
            'avatarUrl' => $author->getAvatarUrl(),
            'professionalTitle' => $author->getProfessionalTitle(),
            'companyMembership' => $this->serializeAuthorCompanyMembership($author, $company, $entityManager),
        ];
    }

    // Resolve the author's membership details for the post company.
    private function serializeAuthorCompanyMembership(AppUser $author, ?Company $company, EntityManagerInterface $entityManager): ?array
    {
        if (!$company) {
            return null;
        }

        $membership = $entityManager->getRepository(CompanyMember::class)->findOneBy([
            'user' => $author,
            'company' => $company,
            'status' => CompanyMember::STATUS_ACTIVE,
        ]);

        if (!$membership) {
            return null;
        }

        return [
            'id' => $membership->getId(),
            'role' => $membership->getRole(),
            'title' => $membership->getTitle(),
            'status' => $membership->getStatus(),
        ];
    }

    // Determine the user's primary active company.
    private function getPrimaryCompany(AppUser $user, EntityManagerInterface $entityManager): ?Company
    {
        $membership = $entityManager->getRepository(CompanyMember::class)->findOneBy([
            'user' => $user,
            'status' => CompanyMember::STATUS_ACTIVE,
        ]);

        return $membership?->getCompany();
    }

    // Check if the user can post on behalf of the company.
    private function userCanPostForCompany(AppUser $user, Company $company, EntityManagerInterface $entityManager): bool
    {
        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        $membership = $entityManager->getRepository(CompanyMember::class)->findOneBy([
            'user' => $user,
            'company' => $company,
            'status' => CompanyMember::STATUS_ACTIVE,
        ]);

        return $membership !== null;
    }
}
