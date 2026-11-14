<?php

namespace App\Controller;

use App\Entity\AppUser;
use App\Entity\CompanyMember;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\String\Slugger\SluggerInterface;

#[Route('/api/profile')]
class ProfileController extends AbstractController
{
    #[Route('', name: 'api_profile_update', methods: ['POST'])]
    public function update(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $user->setName($data['name']);
        if (isset($data['bio'])) $user->setBio($data['bio']);
        if (isset($data['professionalTitle'])) $user->setProfessionalTitle($data['professionalTitle']);

        $em->flush();

        $companies = $this->serializeUserCompanies($user, $em);

        return $this->json([
            'id' => $user->getId(),
            'name' => $user->getName(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'bio' => $user->getBio(),
            'professionalTitle' => $user->getProfessionalTitle(),
            'avatarUrl' => $user->getAvatarUrl(),
            'companies' => $companies,
            'primaryCompany' => $companies[0] ?? null,
        ]);
    }

    #[Route('/avatar', name: 'api_profile_avatar', methods: ['POST'])]
    public function updateAvatar(Request $request, SluggerInterface $slugger, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $file = $request->files->get('avatar');
        if (!$file) {
            return $this->json(['message' => 'No file uploaded'], Response::HTTP_BAD_REQUEST);
        }

        $originalFilename = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeFilename = $slugger->slug($originalFilename);
        $newFilename = $safeFilename.'-'.uniqid().'.'.$file->guessExtension();

        try {
            $file->move(
                $this->getParameter('kernel.project_dir').'/public/uploads/avatars',
                $newFilename
            );
            $user->setAvatarUrl('/uploads/avatars/'.$newFilename);
            $em->flush();

            return $this->json([
                'avatarUrl' => $user->getAvatarUrl()
            ]);
        } catch (\Exception $e) {
            return $this->json(['message' => 'Failed to upload avatar'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[Route('/{id}', name: 'api_profile_show', methods: ['GET'])]
    public function show(int $id, EntityManagerInterface $em): JsonResponse
    {
        $user = $em->getRepository(AppUser::class)->find($id);

        if (!$user) {
            return $this->json(['message' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        // Also fetch posts if requested, but for now simple info is fine
        $companies = $this->serializeUserCompanies($user, $em);

        return $this->json([
            'id' => $user->getId(),
            'name' => $user->getName(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'bio' => $user->getBio(),
            'professionalTitle' => $user->getProfessionalTitle(),
            'avatarUrl' => $user->getAvatarUrl(),
            'companies' => $companies,
            'primaryCompany' => $companies[0] ?? null,
        ]);
    }

    private function serializeUserCompanies(AppUser $user, EntityManagerInterface $em): array
    {
        $memberships = $em->getRepository(CompanyMember::class)->findBy(['user' => $user], ['joinedAt' => 'DESC']);

        return array_map(fn (CompanyMember $membership) => [
            'id' => $membership->getCompany()?->getId(),
            'name' => $membership->getCompany()?->getName(),
            'stage' => $membership->getCompany()?->getStage(),
            'status' => $membership->getCompany()?->getStatus(),
            'sector' => $membership->getCompany()?->getSector(),
            'cohort' => $membership->getCompany()?->getCohort(),
            'role' => $membership->getRole(),
            'title' => $membership->getTitle(),
        ], $memberships);
    }
}
