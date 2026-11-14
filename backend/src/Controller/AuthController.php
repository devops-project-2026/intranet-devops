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
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\JWTDecodeFailureException;

class AuthController extends AbstractController
{
    #[Route('/api/signup', name: 'app_signup', methods: ['POST'])]
    public function signup(
        Request $request, 
        UserPasswordHasherInterface $passwordHasher, 
        EntityManagerInterface $entityManager,
        MailerInterface $mailer,
        JWTTokenManagerInterface $jwtManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $name = $data['name'] ?? null;
        $companyName = trim((string) ($data['companyName'] ?? ''));

        if (!$email || !$password || !$name) {
            return $this->json(['message' => 'Missing required fields'], Response::HTTP_BAD_REQUEST);
        }

        $existingUser = $entityManager->getRepository(AppUser::class)->findOneBy(['email' => $email]);
        if ($existingUser) {
            return $this->json(['message' => 'User already exists'], Response::HTTP_CONFLICT);
        }

        $user = new AppUser();
        $user->setEmail($email);
        $user->setName($name);
        // Founder accounts belong to the enterprise cohort by default.
        $user->setRoles(['ROLE_USER']);
        
        // Start as pending
        $user->setStatus('pending');
        
        // Hash the password
        $hashedPassword = $passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);

        $entityManager->persist($user);



        $entityManager->flush();

        // Generate an expiring verification token
        $payload = ['purpose' => 'email_verification', 'exp' => time() + 3600];
        $token = $jwtManager->createFromPayload($user, $payload);

        // Send the Verification Email
        $verificationUrl = 'http://localhost:3000/verify-email?token=' . $token;

        $emailMessage = (new Email())
            ->from('anwisben205@gmail.com')
            ->to($user->getEmail())
            ->subject('Please Confirm your Email')
            ->html('<p>Welcome! Please verify your email by clicking the link below:</p>
                    <a href="' . $verificationUrl . '">Verify My Email</a>');

        try {
            $mailer->send($emailMessage);
        } catch (\Exception $e) {
            // Log or ignore if dev mailer is not fully configured, but don't fail registration
        }

        return $this->json(['message' => 'User created successfully'], Response::HTTP_CREATED);
    }

    #[Route('/api/verify-email', name: 'api_verify_email', methods: ['POST'])]
    public function verifyEmail(
        Request $request, 
        JWTEncoderInterface $jwtEncoder,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $token = $data['token'] ?? null;

        if (!$token) {
            return $this->json(['message' => 'Token is required'], Response::HTTP_BAD_REQUEST);
        }

        try {
            // Decode the token. This throws an exception if invalid or expired
            $decoded = $jwtEncoder->decode($token);
            
            if (!isset($decoded['purpose']) || $decoded['purpose'] !== 'email_verification') {
                 return $this->json(['message' => 'Invalid token purpose'], Response::HTTP_BAD_REQUEST);
            }

            // 'username' is usually injected by LexikJWT containing the user identifier (email)
            $email = $decoded['username'];
            $user = $entityManager->getRepository(AppUser::class)->findOneBy(['email' => $email]);

            if (!$user) {
                return $this->json(['message' => 'User not found'], Response::HTTP_NOT_FOUND);
            }

            if ($user->getStatus() === 'active') {
                return $this->json(['message' => 'Email is already verified'], Response::HTTP_OK);
            }

            // Update user status
            $user->setStatus('active');
            $entityManager->flush();

            return $this->json(['message' => 'Email successfully verified'], Response::HTTP_OK);

        } catch (JWTDecodeFailureException $e) {
            return $this->json(['message' => 'Token is invalid or has expired'], Response::HTTP_UNAUTHORIZED);
        } catch (\Exception $e) {
            return $this->json(['message' => 'An error occurred during verification'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[Route('/api/user/me', name: 'app_user_me', methods: ['GET'])]
    public function me(EntityManagerInterface $entityManager): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $companies = $entityManager->getRepository(CompanyMember::class)->findBy(['user' => $user], ['joinedAt' => 'DESC']);
        $companyData = array_map(fn (CompanyMember $membership) => [
            'id' => $membership->getCompany()?->getId(),
            'name' => $membership->getCompany()?->getName(),
            'stage' => $membership->getCompany()?->getStage(),
            'status' => $membership->getCompany()?->getStatus(),
            'sector' => $membership->getCompany()?->getSector(),
            'cohort' => $membership->getCompany()?->getCohort(),
            'role' => $membership->getRole(),
            'title' => $membership->getTitle(),
        ], $companies);

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'name' => $user->getName(),
            'roles' => $user->getRoles(),
            'bio' => $user->getBio(),
            'professionalTitle' => $user->getProfessionalTitle(),
            'avatarUrl' => $user->getAvatarUrl(),
            'companies' => $companyData,
            'primaryCompany' => $companyData[0] ?? null,
        ]);
    }

    #[Route('/api/forgot-password', name: 'api_forgot_password', methods: ['POST'])]
    public function forgotPassword(
        Request $request,
        EntityManagerInterface $entityManager,
        MailerInterface $mailer,
        \Psr\Cache\CacheItemPoolInterface $cache
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email) {
            return $this->json(['message' => 'L\'adresse email est requise'], Response::HTTP_BAD_REQUEST);
        }

        $user = $entityManager->getRepository(AppUser::class)->findOneBy(['email' => $email]);

        if (!$user) {
            return $this->json(['message' => 'Si cette adresse email existe, un code a été envoyé.'], Response::HTTP_OK);
        }

        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        $cacheItem = $cache->getItem('reset_password_' . md5($email));
        $cacheItem->set($code);
        $cacheItem->expiresAfter(900); // 15 minutes
        $cache->save($cacheItem);

        $emailMessage = (new Email())
            ->from('anwisben205@gmail.com')
            ->to($user->getEmail())
            ->subject('Réinitialisation de votre mot de passe')
            ->html('<p>Voici votre code de confirmation pour réinitialiser votre mot de passe : <strong>' . $code . '</strong></p>
                    <p>Ce code expirera dans 15 minutes.</p>');

        try {
            $mailer->send($emailMessage);
        } catch (\Exception $e) {
            // Ignorer l'erreur si le mailer de développement n'est pas bien configuré
        }

        return $this->json(['message' => 'Veuillez vérifier votre email pour le code de réinitialisation.'], Response::HTTP_OK);
    }

    #[Route('/api/reset-password', name: 'api_reset_password', methods: ['POST'])]
    public function resetPassword(
        Request $request,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher,
        \Psr\Cache\CacheItemPoolInterface $cache
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;
        $code = $data['code'] ?? null;
        $newPassword = $data['password'] ?? null;

        if (!$email || !$code || !$newPassword) {
            return $this->json(['message' => 'Tous les champs (email, code, mot de passe) sont requis.'], Response::HTTP_BAD_REQUEST);
        }

        $user = $entityManager->getRepository(AppUser::class)->findOneBy(['email' => $email]);

        if (!$user) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_BAD_REQUEST);
        }

        $cacheItem = $cache->getItem('reset_password_' . md5($email));
        if (!$cacheItem->isHit() || $cacheItem->get() !== $code) {
            return $this->json(['message' => 'Code de réinitialisation invalide ou expiré.'], Response::HTTP_BAD_REQUEST);
        }

        $hashedPassword = $passwordHasher->hashPassword($user, $newPassword);
        $user->setPassword($hashedPassword);

        $entityManager->flush();
        $cache->deleteItem('reset_password_' . md5($email));

        return $this->json(['message' => 'Votre mot de passe a été modifié avec succès.'], Response::HTTP_OK);
    }
}


