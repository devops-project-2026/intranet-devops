export type CompanyStage = "IDEA" | "PRE_SEED" | "SEED" | "SERIES_A" | "GROWTH";
export type CompanyStatus = "PENDING" | "ACTIVE" | "GRADUATED" | "SUSPENDED";
export type CompanyMemberRole = "OWNER" | "CO_FOUNDER" | "MEMBER";
export type CompanyMemberStatus = "ACTIVE" | "INVITED" | "LEFT";

export type UserCompanyMembership = {
  id: number;
  name: string;
  stage: string;
  status: string;
  sector?: string | null;
  cohort?: string | null;
  role: string;
  title?: string | null;
};

export type UserSummary = {
  id: number;
  name: string | null;
  email: string;
  roles: string[];
  avatarUrl: string | null;
};

export type CompanyMember = {
  id: number;
  role: CompanyMemberRole;
  title: string | null;
  ownershipPercent: string | null;
  isPrimaryContact: boolean;
  status: CompanyMemberStatus;
  joinedAt: string;
  user: UserSummary;
};

export type Company = {
  id: number;
  name: string;
  legalName: string | null;
  logoUrl: string | null;
  description: string | null;
  sector: string | null;
  stage: CompanyStage;
  status: CompanyStatus;
  cohort: string | null;
  foundedAt: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary | null;
  memberCount: number;
  postCount: number;
  members?: CompanyMember[];
  myMembership?: CompanyMember;
};

export const COMPANY_STAGES: { value: CompanyStage; label: string }[] = [
  { value: "IDEA", label: "Idea" },
  { value: "PRE_SEED", label: "Pre-seed" },
  { value: "SEED", label: "Seed" },
  { value: "SERIES_A", label: "Series A" },
  { value: "GROWTH", label: "Growth" },
];

export const COMPANY_STATUSES: { value: CompanyStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "SUSPENDED", label: "Suspended" },
];

export const COMPANY_MEMBER_ROLES: { value: CompanyMemberRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "CO_FOUNDER", label: "Co-founder" },
  { value: "MEMBER", label: "Member" },
];

export function formatCompanyStage(stage: string | null | undefined) {
  return COMPANY_STAGES.find((item) => item.value === stage)?.label ?? "Not set";
}

export function formatCompanyStatus(status: string | null | undefined) {
  return COMPANY_STATUSES.find((item) => item.value === status)?.label ?? "Unknown";
}

export function formatMemberRole(role: string | null | undefined) {
  return COMPANY_MEMBER_ROLES.find((item) => item.value === role)?.label ?? "Member";
}

export function formatMembershipTitle(role: string | null | undefined, title?: string | null) {
  const roleLabel = formatMemberRole(role);
  const cleanTitle = title?.trim();
  return cleanTitle ? `${roleLabel} - ${cleanTitle}` : roleLabel;
}

export function getCompanyProfessionalTitle(company?: UserCompanyMembership | null) {
  if (!company) return null;
  return formatMembershipTitle(company.role, company.title);
}
