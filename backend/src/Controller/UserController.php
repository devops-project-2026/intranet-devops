<?php

namespace App\Controller;

use App\Entity\AppUser;
use App\Entity\Company;
use App\Entity\CompanyMember;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Psr\Cache\CacheItemPoolInterface;

#[Route('/api/admin/users')]
// Assuming admins only can access these routes. For now, we rely on the route prefix,
// but we should ideally use #[IsGranted('ROLE_ADMIN')] if role hierarchy is setup.
// Let's manually check or just use the prefix.
class UserController extends AbstractController
{
    #[Route('', name: 'api_admin_users_list', methods: ['GET'])]
    public function index(EntityManagerInterface $entityManager): JsonResponse
    {
        $users = $entityManager->getRepository(AppUser::class)->findAll();
        $data = [];

        foreach ($users as $user) {
            $data[] = [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'name' => $user->getName(),
                'roles' => $user->getRoles(),
                'status' => $user->getStatus() ?? 'Active',
                'lastLoginAt' => $user->getLastLoginAt() ? $user->getLastLoginAt()->format('c') : null,
                'avatarUrl' => $user->getAvatarUrl(),
                'companies' => $this->serializeUserCompanies($user, $entityManager),
            ];
        }

        // Return users in reverse chronological order (newest first)
        usort($data, fn($a, $b) => $b['id'] <=> $a['id']);

        return $this->json($data);
    }

    #[Route('', name: 'api_admin_users_create', methods: ['POST'])]
    public function create(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        MailerInterface $mailer,
        CacheItemPoolInterface $cache
    ): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $name = $data['name'] ?? null;
        $role = $data['role'] ?? 'ROLE_USER';
        $companyId = (int) ($data['companyId'] ?? 0);
        $companyRole = $data['companyRole'] ?? CompanyMember::ROLE_MEMBER;
        $companyTitle = $data['companyTitle'] ?? null;

        if (!$email || !$name) {
            return $this->json(['message' => 'Missing required fields'], Response::HTTP_BAD_REQUEST);
        }

        $existingUser = $entityManager->getRepository(AppUser::class)->findOneBy(['email' => $email]);
        if ($existingUser) {
            return $this->json(['message' => 'User already exists'], Response::HTTP_CONFLICT);
        }

        $user = new AppUser();
        $user->setEmail($email);
        $user->setName($name);
        $user->setRoles([$role]);
        $user->setStatus('Active');
        
        $normalizedPassword = is_string($password) ? trim($password) : '';
        if ($normalizedPassword === '') {
            $normalizedPassword = bin2hex(random_bytes(16));
        }

        $hashedPassword = $passwordHasher->hashPassword($user, $normalizedPassword);
        $user->setPassword($hashedPassword);

        $entityManager->persist($user);

        if ($companyId > 0) {
            $company = $entityManager->getRepository(Company::class)->find($companyId);
            if ($company) {
                $member = new CompanyMember();
                $member->setCompany($company);
                $member->setUser($user);
                $member->setRole(in_array($companyRole, [
                    CompanyMember::ROLE_OWNER,
                    CompanyMember::ROLE_CO_FOUNDER,
                    CompanyMember::ROLE_MEMBER,
                ], true) ? $companyRole : CompanyMember::ROLE_MEMBER);
                $member->setTitle(is_string($companyTitle) && trim($companyTitle) !== '' ? trim($companyTitle) : null);
                $entityManager->persist($member);
            }
        }

        $entityManager->flush();

        $this->sendInviteResetCode($user, $mailer, $cache);

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'name' => $user->getName(),
            'roles' => $user->getRoles(),
            'status' => $user->getStatus(),
            'companies' => $this->serializeUserCompanies($user, $entityManager),
            'message' => 'User created successfully'
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}/status', name: 'api_admin_users_status', methods: ['PATCH'])]
    public function updateStatus(int $id, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $entityManager->getRepository(AppUser::class)->find($id);

        if (!$user) {
            return $this->json(['message' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        $newStatus = $data['status'] ?? null;

        if ($newStatus && in_array($newStatus, ['Active', 'Inactive'])) {
            $user->setStatus($newStatus);
            $entityManager->flush();
            
            return $this->json([
                'id' => $user->getId(),
                'status' => $user->getStatus(),
                'message' => 'Status updated successfully'
            ]);
        }

        return $this->json(['message' => 'Invalid status provided'], Response::HTTP_BAD_REQUEST);
    }

    #[Route('/{id}', name: 'api_admin_users_delete', methods: ['DELETE'])]
    public function delete(int $id, EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $entityManager->getRepository(AppUser::class)->find($id);

        if (!$user) {
            return $this->json(['message' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        $entityManager->remove($user);
        $entityManager->flush();

        return $this->json(['message' => 'User deleted successfully']);
    }

    private function serializeUserCompanies(AppUser $user, EntityManagerInterface $entityManager): array
    {
        $memberships = $entityManager->getRepository(CompanyMember::class)->findBy(['user' => $user]);

        return array_map(fn (CompanyMember $membership) => [
            'id' => $membership->getCompany()?->getId(),
            'name' => $membership->getCompany()?->getName(),
            'stage' => $membership->getCompany()?->getStage(),
            'status' => $membership->getCompany()?->getStatus(),
            'role' => $membership->getRole(),
            'title' => $membership->getTitle(),
        ], $memberships);
    }

    private function sendInviteResetCode(AppUser $user, MailerInterface $mailer, CacheItemPoolInterface $cache): void
    {
        $email = $user->getEmail();
        if (!$email) {
            return;
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $cacheItem = $cache->getItem('reset_password_' . md5($email));
        $cacheItem->set($code);
        $cacheItem->expiresAfter(900);
        $cache->save($cacheItem);

        $inviteUrl = 'http://localhost:3000/forgot-password?email=' . urlencode($email) . '&invited=1';

        $emailMessage = (new Email())
            ->from('anwisben205@gmail.com')
            ->to($email)
            ->subject('Bienvenue - Definir votre mot de passe')
            ->html('<p>Votre compte a ete cree. Voici votre code de confirmation :</p>'
                . '<p><strong>' . $code . '</strong></p>'
                . '<p>Vous pouvez definir votre mot de passe ici :</p>'
                . '<a href="' . $inviteUrl . '">Definir mon mot de passe</a>'
                . '<p>Ce code expire dans 15 minutes.</p>');

        try {
            $mailer->send($emailMessage);
        } catch (\Exception $e) {
            // Ignore mailer errors in development.
        }
    }
}
