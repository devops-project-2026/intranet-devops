<?php

namespace App\Controller;

use App\Entity\AppUser;
use App\Entity\Company;
use App\Entity\CompanyMember;
use App\Entity\Post;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class CompanyController extends AbstractController
{
    private const STAGES = [
        Company::STAGE_IDEA,
        Company::STAGE_PRE_SEED,
        Company::STAGE_SEED,
        Company::STAGE_SERIES_A,
        Company::STAGE_GROWTH,
    ];

    private const STATUSES = [
        Company::STATUS_PENDING,
        Company::STATUS_ACTIVE,
        Company::STATUS_GRADUATED,
        Company::STATUS_SUSPENDED,
    ];

    private const ADMIN_MUTABLE_STATUSES = [
        Company::STATUS_PENDING,
        Company::STATUS_ACTIVE,
    ];

    private const MEMBER_ROLES = [
        CompanyMember::ROLE_OWNER,
        CompanyMember::ROLE_CO_FOUNDER,
        CompanyMember::ROLE_MEMBER,
    ];

    private const MEMBER_STATUSES = [
        CompanyMember::STATUS_ACTIVE,
        CompanyMember::STATUS_INVITED,
        CompanyMember::STATUS_LEFT,
    ];

    #[Route('/api/companies', name: 'api_companies_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $companies = $em->getRepository(Company::class)->findBy(
            ['status' => Company::STATUS_ACTIVE],
            ['name' => 'ASC']
        );

        return $this->json(array_map(
            fn (Company $company) => $this->serializeCompany($company, $em, false),
            $companies
        ));
    }

    #[Route('/api/companies/mine', name: 'api_companies_mine', methods: ['GET'])]
    public function mine(EntityManagerInterface $em): JsonResponse
    {
        $user = $this->requireUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $memberships = $em->getRepository(CompanyMember::class)->findBy(
            ['user' => $user],
            ['joinedAt' => 'DESC']
        );

        return $this->json(array_map(
            fn (CompanyMember $membership) => [
                ...$this->serializeCompany($membership->getCompany(), $em, true),
                'myMembership' => $this->serializeMember($membership),
            ],
            $memberships
        ));
    }

    #[Route('/api/companies', name: 'api_companies_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->requireUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        if ($this->isAdmin($user)) {
            return $this->json(['message' => 'Admins can only review company status or delete companies.'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true) ?: [];
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return $this->json(['message' => 'Company name is required'], Response::HTTP_BAD_REQUEST);
        }

        if ($this->findCompanyByName($name, $em)) {
            return $this->json(
                ['message' => 'Company name already exists. Please choose another name.'],
                Response::HTTP_CONFLICT
            );
        }

        $company = new Company();
        $company->setName($name);
        $company->setCreatedBy($user);
        $company->setStatus($this->isAdmin($user) ? Company::STATUS_ACTIVE : Company::STATUS_PENDING);
        $this->applyCompanyData($company, $data, $this->isAdmin($user));

        $member = new CompanyMember();
        $member->setCompany($company);
        $member->setUser($user);
        $member->setRole(CompanyMember::ROLE_OWNER);
        $member->setTitle($data['ownerTitle'] ?? 'Founder');
        $member->setIsPrimaryContact(true);
        $member->setStatus(CompanyMember::STATUS_ACTIVE);

        $em->persist($company);
        $em->persist($member);
        $em->flush();

        return $this->json($this->serializeCompanyForUser($company, $em, true, $user), Response::HTTP_CREATED);
    }

    #[Route('/api/companies/{id}', name: 'api_companies_show', methods: ['GET'])]
    public function show(int $id, EntityManagerInterface $em): JsonResponse
    {
        $company = $em->getRepository(Company::class)->find($id);
        if (!$company) {
            return $this->json(['message' => 'Company not found'], Response::HTTP_NOT_FOUND);
        }

        $user = $this->getUser();
        $canView = $company->getStatus() === Company::STATUS_ACTIVE
            || ($user instanceof AppUser && ($this->isAdmin($user) || $this->findMembership($company, $user, $em)));

        if (!$canView) {
            return $this->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        return $this->json($this->serializeCompanyForUser(
            $company,
            $em,
            true,
            $user instanceof AppUser ? $user : null
        ));
    }

    #[Route('/api/companies/{id}', name: 'api_companies_update', methods: ['PATCH'])]
    public function update(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->requireUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $company = $em->getRepository(Company::class)->find($id);
        if (!$company) {
            return $this->json(['message' => 'Company not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canManageCompany($company, $user, $em)) {
            return $this->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true) ?: [];
        if (array_key_exists('name', $data)) {
            $requestedName = trim((string) $data['name']);
            if ($requestedName === '') {
                return $this->json(['message' => 'Company name is required'], Response::HTTP_BAD_REQUEST);
            }

            if ($this->findCompanyByName($requestedName, $em, $company->getId())) {
                return $this->json(
                    ['message' => 'Company name already exists. Please choose another name.'],
                    Response::HTTP_CONFLICT
                );
            }
        }

        $this->applyCompanyData($company, $data, false);
        $company->touch();
        $em->flush();

        return $this->json($this->serializeCompanyForUser($company, $em, true, $user));
    }

    #[Route('/api/companies/{id}/members', name: 'api_companies_members_add', methods: ['POST'])]
    public function addMember(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->requireUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $company = $em->getRepository(Company::class)->find($id);
        if (!$company) {
            return $this->json(['message' => 'Company not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canManageCompany($company, $user, $em)) {
            return $this->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true) ?: [];
        $memberUserId = (int) ($data['userId'] ?? 0);
        $memberUser = $em->getRepository(AppUser::class)->find($memberUserId);
        if (!$memberUser) {
            return $this->json(['message' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        $membership = $this->findMembership($company, $memberUser, $em) ?? new CompanyMember();
        $membership->setCompany($company);
        $membership->setUser($memberUser);
        $this->applyMemberData($membership, $data);

        $em->persist($membership);
        $company->touch();
        $em->flush();

        return $this->json($this->serializeCompanyForUser($company, $em, true, $user), Response::HTTP_CREATED);
    }

    #[Route('/api/companies/{companyId}/members/{memberId}', name: 'api_companies_members_update', methods: ['PATCH'])]
    public function updateMember(int $companyId, int $memberId, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->requireUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $company = $em->getRepository(Company::class)->find($companyId);
        $membership = $em->getRepository(CompanyMember::class)->find($memberId);

        if (!$company || !$membership || $membership->getCompany()?->getId() !== $company->getId()) {
            return $this->json(['message' => 'Member not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canManageCompany($company, $user, $em)) {
            return $this->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true) ?: [];
        if ($this->wouldRemoveLastOwner($membership, $data, $em)) {
            return $this->json(['message' => 'A company must keep at least one active owner.'], Response::HTTP_BAD_REQUEST);
        }

        $this->applyMemberData($membership, $data);
        $company->touch();
        $em->flush();

        return $this->json($this->serializeCompanyForUser($company, $em, true, $user));
    }

    #[Route('/api/companies/{companyId}/members/{memberId}', name: 'api_companies_members_delete', methods: ['DELETE'])]
    public function deleteMember(int $companyId, int $memberId, EntityManagerInterface $em): JsonResponse
    {
        $user = $this->requireUser();
        if (!$user instanceof AppUser) {
            return $this->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $company = $em->getRepository(Company::class)->find($companyId);
        $membership = $em->getRepository(CompanyMember::class)->find($memberId);

        if (!$company || !$membership || $membership->getCompany()?->getId() !== $company->getId()) {
            return $this->json(['message' => 'Member not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canManageCompany($company, $user, $em)) {
            return $this->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        if ($this->isLastActiveOwner($membership, $em)) {
            return $this->json(['message' => 'A company must keep at least one active owner.'], Response::HTTP_BAD_REQUEST);
        }

        $em->remove($membership);
        $company->touch();
        $em->flush();

        return $this->json($this->serializeCompanyForUser($company, $em, true, $user));
    }

    #[Route('/api/admin/companies', name: 'api_admin_companies_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminList(EntityManagerInterface $em): JsonResponse
    {
        $companies = $em->getRepository(Company::class)->findBy([], ['createdAt' => 'DESC']);

        return $this->json(array_map(
            fn (Company $company) => $this->serializeCompany($company, $em, true),
            $companies
        ));
    }

    #[Route('/api/admin/companies', name: 'api_admin_companies_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminCreate(Request $request, EntityManagerInterface $em): JsonResponse
    {
        return $this->json(['message' => 'Admins can only review company status or delete companies.'], Response::HTTP_FORBIDDEN);
    }

    #[Route('/api/admin/companies/{id}', name: 'api_admin_companies_update', methods: ['PATCH'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminUpdate(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $company = $em->getRepository(Company::class)->find($id);
        if (!$company) {
            return $this->json(['message' => 'Company not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?: [];
        $status = $data['status'] ?? null;

        if (!in_array($status, self::ADMIN_MUTABLE_STATUSES, true)) {
            return $this->json(['message' => 'Status must be Pending or Active.'], Response::HTTP_BAD_REQUEST);
        }

        $company->setStatus($status);
        $company->touch();
        $em->flush();

        return $this->json($this->serializeCompany($company, $em, true));
    }

    #[Route('/api/admin/companies/{id}', name: 'api_admin_companies_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function adminDelete(int $id, EntityManagerInterface $em): JsonResponse
    {
        $company = $em->getRepository(Company::class)->find($id);
        if (!$company) {
            return $this->json(['message' => 'Company not found'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($company);
        $em->flush();

        return $this->json(['message' => 'Company deleted successfully']);
    }

    private function applyCompanyData(Company $company, array $data, bool $canSetStatus): void
    {
        foreach (['name', 'legalName', 'logoUrl', 'description', 'sector', 'cohort', 'website'] as $field) {
            if (array_key_exists($field, $data)) {
                $value = is_string($data[$field]) ? trim($data[$field]) : null;
                $value = $value === '' ? null : $value;
                match ($field) {
                    'name' => $value !== null ? $company->setName($value) : null,
                    'legalName' => $company->setLegalName($value),
                    'logoUrl' => $company->setLogoUrl($value),
                    'description' => $company->setDescription($value),
                    'sector' => $company->setSector($value),
                    'cohort' => $company->setCohort($value),
                    'website' => $company->setWebsite($value),
                };
            }
        }

        if (isset($data['stage']) && in_array($data['stage'], self::STAGES, true)) {
            $company->setStage($data['stage']);
        }

        if ($canSetStatus && isset($data['status']) && in_array($data['status'], self::STATUSES, true)) {
            $company->setStatus($data['status']);
        }

        if (array_key_exists('foundedAt', $data)) {
            $company->setFoundedAt($this->parseDate($data['foundedAt'] ?? null));
        }
    }

    private function applyMemberData(CompanyMember $membership, array $data): void
    {
        if (isset($data['role']) && in_array($data['role'], self::MEMBER_ROLES, true)) {
            $membership->setRole($data['role']);
        }

        if (array_key_exists('title', $data)) {
            $title = is_string($data['title']) ? trim($data['title']) : null;
            $membership->setTitle($title === '' ? null : $title);
        }

        if (array_key_exists('ownershipPercent', $data)) {
            $value = $data['ownershipPercent'];
            $membership->setOwnershipPercent($value === null || $value === '' ? null : (string) $value);
        }

        if (array_key_exists('isPrimaryContact', $data)) {
            $membership->setIsPrimaryContact((bool) $data['isPrimaryContact']);
        }

        if (isset($data['status']) && in_array($data['status'], self::MEMBER_STATUSES, true)) {
            $membership->setStatus($data['status']);
        }
    }

    private function serializeCompany(?Company $company, EntityManagerInterface $em, bool $includeRelations): array
    {
        if (!$company) {
            return [];
        }

        $members = $em->getRepository(CompanyMember::class)->findBy(['company' => $company], ['joinedAt' => 'ASC']);
        $postCount = $em->getRepository(Post::class)->count(['company' => $company]);

        $data = [
            'id' => $company->getId(),
            'name' => $company->getName(),
            'legalName' => $company->getLegalName(),
            'logoUrl' => $company->getLogoUrl(),
            'description' => $company->getDescription(),
            'sector' => $company->getSector(),
            'stage' => $company->getStage(),
            'status' => $company->getStatus(),
            'cohort' => $company->getCohort(),
            'foundedAt' => $company->getFoundedAt()?->format('Y-m-d'),
            'website' => $company->getWebsite(),
            'createdAt' => $company->getCreatedAt()?->format('c'),
            'updatedAt' => $company->getUpdatedAt()?->format('c'),
            'createdBy' => $this->serializeUserSummary($company->getCreatedBy()),
            'memberCount' => count($members),
            'postCount' => $postCount,
        ];

        if ($includeRelations) {
            $data['members'] = array_map(fn (CompanyMember $member) => $this->serializeMember($member), $members);
        }

        return $data;
    }

    private function serializeCompanyForUser(?Company $company, EntityManagerInterface $em, bool $includeRelations, ?AppUser $user): array
    {
        $data = $this->serializeCompany($company, $em, $includeRelations);

        if (!$company || !$user) {
            return $data;
        }

        $membership = $this->findMembership($company, $user, $em);
        if ($membership) {
            $data['myMembership'] = $this->serializeMember($membership);
        }

        return $data;
    }

    private function serializeMember(CompanyMember $member): array
    {
        return [
            'id' => $member->getId(),
            'role' => $member->getRole(),
            'title' => $member->getTitle(),
            'ownershipPercent' => $member->getOwnershipPercent(),
            'isPrimaryContact' => $member->isPrimaryContact(),
            'status' => $member->getStatus(),
            'joinedAt' => $member->getJoinedAt()?->format('c'),
            'user' => $this->serializeUserSummary($member->getUser()),
        ];
    }

    private function serializeUserSummary(?AppUser $user): ?array
    {
        if (!$user) {
            return null;
        }

        return [
            'id' => $user->getId(),
            'name' => $user->getName(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'avatarUrl' => $user->getAvatarUrl(),
        ];
    }

    private function requireUser(): ?AppUser
    {
        $user = $this->getUser();
        return $user instanceof AppUser ? $user : null;
    }

    private function isAdmin(AppUser $user): bool
    {
        return in_array('ROLE_ADMIN', $user->getRoles(), true);
    }

    private function canManageCompany(Company $company, AppUser $user, EntityManagerInterface $em): bool
    {
        $membership = $this->findMembership($company, $user, $em);
        if (!$membership || $membership->getStatus() !== CompanyMember::STATUS_ACTIVE) {
            return false;
        }

        return $membership->getRole() === CompanyMember::ROLE_OWNER;
    }

    private function findMembership(Company $company, AppUser $user, EntityManagerInterface $em): ?CompanyMember
    {
        return $em->getRepository(CompanyMember::class)->findOneBy([
            'company' => $company,
            'user' => $user,
        ]);
    }

    private function wouldRemoveLastOwner(CompanyMember $membership, array $data, EntityManagerInterface $em): bool
    {
        if (!$this->isLastActiveOwner($membership, $em)) {
            return false;
        }

        $nextRole = $data['role'] ?? $membership->getRole();
        if (!in_array($nextRole, self::MEMBER_ROLES, true)) {
            $nextRole = $membership->getRole();
        }

        $nextStatus = $data['status'] ?? $membership->getStatus();
        if (!in_array($nextStatus, self::MEMBER_STATUSES, true)) {
            $nextStatus = $membership->getStatus();
        }

        return $nextRole !== CompanyMember::ROLE_OWNER || $nextStatus !== CompanyMember::STATUS_ACTIVE;
    }

    private function isLastActiveOwner(CompanyMember $membership, EntityManagerInterface $em): bool
    {
        return $membership->getRole() === CompanyMember::ROLE_OWNER
            && $membership->getStatus() === CompanyMember::STATUS_ACTIVE
            && $membership->getCompany() instanceof Company
            && $em->getRepository(CompanyMember::class)->count([
                'company' => $membership->getCompany(),
                'role' => CompanyMember::ROLE_OWNER,
                'status' => CompanyMember::STATUS_ACTIVE,
            ]) <= 1;
    }

    private function parseDate(mixed $value): ?\DateTimeInterface
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return new \DateTime($value);
        } catch (\Exception) {
            return null;
        }
    }

    private function findCompanyByName(string $name, EntityManagerInterface $em, ?int $excludeId = null): ?Company
    {
        $normalized = trim($name);
        if ($normalized === '') {
            return null;
        }

        $qb = $em->createQueryBuilder()
            ->select('c')
            ->from(Company::class, 'c')
            ->where('LOWER(c.name) = LOWER(:name)')
            ->setParameter('name', $normalized)
            ->setMaxResults(1);

        if ($excludeId !== null) {
            $qb
                ->andWhere('c.id != :excludeId')
                ->setParameter('excludeId', $excludeId);
        }

        return $qb->getQuery()->getOneOrNullResult();
    }
}
