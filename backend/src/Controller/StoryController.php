<?php

namespace App\Controller;

use App\Entity\Story;
use App\Entity\AppUser;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/stories')]
class StoryController extends AbstractController
{
    #[Route('', name: 'api_stories_list', methods: ['GET'])]
    public function index(EntityManagerInterface $entityManager): JsonResponse
    {
        $now = new \DateTime();

        // Fetch only non-expired stories, newest first
        $qb = $entityManager->createQueryBuilder();
        $stories = $qb->select('s')
            ->from(Story::class, 's')
            ->where('s.expiresAt > :now')
            ->setParameter('now', $now)
            ->orderBy('s.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        // Group stories by author
        $grouped = [];
        foreach ($stories as $story) {
            $authorId = $story->getAuthor()->getId();
            if (!isset($grouped[$authorId])) {
                $grouped[$authorId] = [
                    'author' => [
                        'id' => $story->getAuthor()->getId(),
                        'name' => $story->getAuthor()->getName(),
                        'avatarUrl' => $story->getAuthor()->getAvatarUrl(),
                    ],
                    'stories' => []
                ];
            }
            $grouped[$authorId]['stories'][] = [
                'id' => $story->getId(),
                'content' => $story->getContent(),
                'createdAt' => $story->getCreatedAt()->format('c'),
                'expiresAt' => $story->getExpiresAt()->format('c'),
            ];
        }

        return $this->json(array_values($grouped));
    }

    #[Route('', name: 'api_stories_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? null;

        if (!$content) {
            return $this->json(['message' => 'Content is required'], Response::HTTP_BAD_REQUEST);
        }

        $story = new Story();
        $story->setContent($content);
        $story->setAuthor($user);

        $entityManager->persist($story);
        $entityManager->flush();

        return $this->json([
            'id' => $story->getId(),
            'content' => $story->getContent(),
            'createdAt' => $story->getCreatedAt()->format('c'),
            'expiresAt' => $story->getExpiresAt()->format('c'),
            'author' => [
                'id' => $user->getId(),
                'name' => $user->getName(),
            ],
            'message' => 'Story created successfully'
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_stories_delete', methods: ['DELETE'])]
    public function delete(Story $story, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();
        if ($story->getAuthor() !== $user && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $entityManager->remove($story);
        $entityManager->flush();

        return $this->json(['message' => 'Story deleted successfully']);
    }
}
