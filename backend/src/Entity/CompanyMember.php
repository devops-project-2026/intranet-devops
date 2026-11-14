<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'unique_company_member', columns: ['company_id', 'user_id'])]
class CompanyMember
{
    public const ROLE_OWNER = 'OWNER';
    public const ROLE_CO_FOUNDER = 'CO_FOUNDER';
    public const ROLE_MEMBER = 'MEMBER';

    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_INVITED = 'INVITED';
    public const STATUS_LEFT = 'LEFT';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Company::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Company $company = null;

    #[ORM\ManyToOne(targetEntity: AppUser::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?AppUser $user = null;

    #[ORM\Column(length: 40)]
    private string $role = self::ROLE_MEMBER;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $title = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, nullable: true)]
    private ?string $ownershipPercent = null;

    #[ORM\Column]
    private bool $isPrimaryContact = false;

    #[ORM\Column(length: 40)]
    private string $status = self::STATUS_ACTIVE;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $joinedAt = null;

    public function __construct()
    {
        $this->joinedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getCompany(): ?Company { return $this->company; }
    public function setCompany(?Company $company): static { $this->company = $company; return $this; }
    public function getUser(): ?AppUser { return $this->user; }
    public function setUser(?AppUser $user): static { $this->user = $user; return $this; }
    public function getRole(): string { return $this->role; }
    public function setRole(string $role): static { $this->role = $role; return $this; }
    public function getTitle(): ?string { return $this->title; }
    public function setTitle(?string $title): static { $this->title = $title; return $this; }
    public function getOwnershipPercent(): ?string { return $this->ownershipPercent; }
    public function setOwnershipPercent(?string $ownershipPercent): static { $this->ownershipPercent = $ownershipPercent; return $this; }
    public function isPrimaryContact(): bool { return $this->isPrimaryContact; }
    public function setIsPrimaryContact(bool $isPrimaryContact): static { $this->isPrimaryContact = $isPrimaryContact; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getJoinedAt(): ?\DateTimeInterface { return $this->joinedAt; }
    public function setJoinedAt(\DateTimeInterface $joinedAt): static { $this->joinedAt = $joinedAt; return $this; }
}
