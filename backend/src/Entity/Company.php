<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Company
{
    public const STAGE_IDEA = 'IDEA';
    public const STAGE_PRE_SEED = 'PRE_SEED';
    public const STAGE_SEED = 'SEED';
    public const STAGE_SERIES_A = 'SERIES_A';
    public const STAGE_GROWTH = 'GROWTH';

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_GRADUATED = 'GRADUATED';
    public const STATUS_SUSPENDED = 'SUSPENDED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $legalName = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $logoUrl = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $sector = null;

    #[ORM\Column(length: 40)]
    private string $stage = self::STAGE_IDEA;

    #[ORM\Column(length: 40)]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(length: 120, nullable: true)]
    private ?string $cohort = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $foundedAt = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $website = null;

    #[ORM\ManyToOne(targetEntity: AppUser::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?AppUser $createdBy = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $updatedAt = null;

    public function __construct()
    {
        $now = new \DateTime();
        $this->createdAt = $now;
        $this->updatedAt = clone $now;
    }

    public function getId(): ?int { return $this->id; }
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }
    public function getLegalName(): ?string { return $this->legalName; }
    public function setLegalName(?string $legalName): static { $this->legalName = $legalName; return $this; }
    public function getLogoUrl(): ?string { return $this->logoUrl; }
    public function setLogoUrl(?string $logoUrl): static { $this->logoUrl = $logoUrl; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }
    public function getSector(): ?string { return $this->sector; }
    public function setSector(?string $sector): static { $this->sector = $sector; return $this; }
    public function getStage(): string { return $this->stage; }
    public function setStage(string $stage): static { $this->stage = $stage; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getCohort(): ?string { return $this->cohort; }
    public function setCohort(?string $cohort): static { $this->cohort = $cohort; return $this; }
    public function getFoundedAt(): ?\DateTimeInterface { return $this->foundedAt; }
    public function setFoundedAt(?\DateTimeInterface $foundedAt): static { $this->foundedAt = $foundedAt; return $this; }
    public function getWebsite(): ?string { return $this->website; }
    public function setWebsite(?string $website): static { $this->website = $website; return $this; }
    public function getCreatedBy(): ?AppUser { return $this->createdBy; }
    public function setCreatedBy(?AppUser $createdBy): static { $this->createdBy = $createdBy; return $this; }
    public function getCreatedAt(): ?\DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $createdAt): static { $this->createdAt = $createdAt; return $this; }
    public function getUpdatedAt(): ?\DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $updatedAt): static { $this->updatedAt = $updatedAt; return $this; }
    public function touch(): static { $this->updatedAt = new \DateTime(); return $this; }
}
