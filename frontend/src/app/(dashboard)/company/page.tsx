"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Check, Link as LinkIcon, Loader2, Pencil, Plus, Save, Trash2, UserPlus, Users, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import {
  Company,
  CompanyMember,
  COMPANY_MEMBER_ROLES,
  COMPANY_STAGES,
  CompanyMemberRole,
  formatCompanyStage,
  formatCompanyStatus,
  formatMembershipTitle,
  UserSummary,
} from "@/lib/companyTypes";

type CompanyForm = {
  name: string;
  legalName: string;
  sector: string;
  stage: string;
  cohort: string;
  foundedAt: string;
  website: string;
  description: string;
};

type MemberForm = {
  userId: string;
  role: CompanyMemberRole;
  title: string;
  ownershipPercent: string;
  isPrimaryContact: boolean;
};

type MemberEditForm = Omit<MemberForm, "userId">;


const emptyCompanyForm: CompanyForm = {
  name: "",
  legalName: "",
  sector: "",
  stage: "IDEA",
  cohort: "",
  foundedAt: "",
  website: "",
  description: "",
};

const emptyMemberForm: MemberForm = {
  userId: "",
  role: "MEMBER",
  title: "",
  ownershipPercent: "",
  isPrimaryContact: false,
};

const emptyMemberEditForm: MemberEditForm = {
  role: "MEMBER",
  title: "",
  ownershipPercent: "",
  isPrimaryContact: false,
};


export default function CompanyPage() {
  const { user, setUser } = useUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<UserSummary[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [memberEditForm, setMemberEditForm] = useState<MemberEditForm>(emptyMemberEditForm);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? null,
    [companies, selectedCompanyId],
  );

  const canManage = Boolean(
    selectedCompany?.myMembership?.role === "OWNER",
  );

  const showCompanyForm = !selectedCompany || canManage;

  const availableMembers = contacts.filter(
    (contact) => !selectedCompany?.members?.some((member) => member.user.id === contact.id),
  );


  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  function fillCompanyForm(company: Company) {
    setCompanyForm({
      name: company.name ?? "",
      legalName: company.legalName ?? "",
      sector: company.sector ?? "",
      stage: company.stage ?? "IDEA",
      cohort: company.cohort ?? "",
      foundedAt: company.foundedAt ?? "",
      website: company.website ?? "",
      description: company.description ?? "",
    });
  }

  const refreshUser = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8000/api/user/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setUser(await res.json());
    }
  };

  const fetchCompanies = async () => {
    setError("");
    try {
      const [companiesRes, contactsRes] = await Promise.all([
        fetch("http://localhost:8000/api/companies/mine", { headers: authHeaders() }),
        fetch("http://localhost:8000/api/messages/contacts", { headers: authHeaders() }),
      ]);

      if (companiesRes.ok) {
        const data: Company[] = await companiesRes.json();
        setCompanies(data);
        const nextCompany = data.find((company) => company.id === selectedCompanyId) ?? data[0] ?? null;
        setSelectedCompanyId(nextCompany?.id ?? null);
        if (nextCompany) {
          fillCompanyForm(nextCompany);
        }
      }

      if (contactsRes.ok) {
        setContacts(await contactsRes.json());
      }
    } catch {
      setError("Could not load company information.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchCompanies();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const isCreate = !selectedCompany;
      const res = await fetch(`http://localhost:8000/api/companies${isCreate ? "" : `/${selectedCompany.id}`}`, {
        method: isCreate ? "POST" : "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(companyForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save company.");
      }

      const saved: Company = await res.json();
      setCompanies((prev) => {
        const withoutSaved = prev.filter((company) => company.id !== saved.id);
        return [saved, ...withoutSaved];
      });
      setSelectedCompanyId(saved.id);
      fillCompanyForm(saved);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save company.");
    } finally {
      setIsSaving(false);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !memberForm.userId) return;

    const res = await fetch(`http://localhost:8000/api/companies/${selectedCompany.id}/members`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(memberForm),
    });

    if (res.ok) {
      const updated: Company = await res.json();
      setCompanies((prev) => prev.map((company) => (company.id === updated.id ? updated : company)));
      setMemberForm(emptyMemberForm);
    } else {
      setError("Could not add member.");
    }
  };

  const removeMember = async (memberId: number) => {
    if (!selectedCompany || !confirm("Remove this member from the company?")) return;

    const res = await fetch(`http://localhost:8000/api/companies/${selectedCompany.id}/members/${memberId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (res.ok) {
      const updated: Company = await res.json();
      setCompanies((prev) => prev.map((company) => (company.id === updated.id ? updated : company)));
    }
  };

  const startEditingMember = (member: CompanyMember) => {
    setEditingMemberId(member.id);
    setMemberEditForm({
      role: member.role,
      title: member.title ?? "",
      ownershipPercent: member.ownershipPercent ?? "",
      isPrimaryContact: member.isPrimaryContact,
    });
  };

  const updateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !editingMemberId) return;
    const editedMember = selectedCompany.members?.find((member) => member.id === editingMemberId);

    const res = await fetch(`http://localhost:8000/api/companies/${selectedCompany.id}/members/${editingMemberId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(memberEditForm),
    });

    if (res.ok) {
      const updated: Company = await res.json();
      setCompanies((prev) => prev.map((company) => (company.id === updated.id ? updated : company)));
      setEditingMemberId(null);
      setMemberEditForm(emptyMemberEditForm);
      if (editedMember?.user.id === user?.id) {
        await refreshUser();
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Could not update member.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="hide-scrollbar h-full overflow-y-auto px-10 py-8">
      <div className="max-w-[1180px] mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-blue-600 uppercase mb-2">Company Workspace</p>
            <h1 className="text-[32px] font-bold text-[#0a1b44] tracking-tight">My Company</h1>
            <p className="text-[14px] text-gray-500 mt-2">
              Manage the startup profile, ownership, and members connected to your account.
            </p>
          </div>

          {companies.length > 1 && (
            <select
              value={selectedCompany?.id ?? ""}
              onChange={(e) => {
                const next = companies.find((company) => company.id === Number(e.target.value));
                setSelectedCompanyId(next?.id ?? null);
                setEditingMemberId(null);
                if (next) fillCompanyForm(next);
              }}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-bold text-gray-700 outline-none"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-[13px] font-bold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-8">
            {showCompanyForm ? (
            <form onSubmit={saveCompany} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[18px] font-bold text-gray-900">
                    {selectedCompany ? "Company Profile" : "Create Your Company"}
                  </h2>
                  <p className="text-[12px] text-gray-500 mt-1">
                    This information is used by admins and the community.
                  </p>
                </div>
                {selectedCompany && (
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    {formatCompanyStatus(selectedCompany.status)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Company Name" value={companyForm.name} required onChange={(value) => setCompanyForm({ ...companyForm, name: value })} />
                <Field label="Legal Name" value={companyForm.legalName} onChange={(value) => setCompanyForm({ ...companyForm, legalName: value })} />
                <Field label="Sector" value={companyForm.sector} placeholder="AI, SaaS, AgriTech..." onChange={(value) => setCompanyForm({ ...companyForm, sector: value })} />
                <div>
                  <label className="block text-[11px] font-bold tracking-widest text-gray-700 uppercase mb-2">Stage</label>
                  <select
                    value={companyForm.stage}
                    onChange={(e) => setCompanyForm({ ...companyForm, stage: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#0a1b44]"
                  >
                    {COMPANY_STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </div>
                <Field label="Cohort" value={companyForm.cohort} placeholder="Series A Track" onChange={(value) => setCompanyForm({ ...companyForm, cohort: value })} />
                <Field label="Founded Date" value={companyForm.foundedAt} type="date" onChange={(value) => setCompanyForm({ ...companyForm, foundedAt: value })} />
                <Field label="Website" value={companyForm.website} placeholder="https://example.com" onChange={(value) => setCompanyForm({ ...companyForm, website: value })} />
              </div>

              <div className="mt-4">
                <label className="block text-[11px] font-bold tracking-widest text-gray-700 uppercase mb-2">Concept</label>
                <textarea
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  placeholder="Explain what the company builds, who it serves, and what support it needs from the incubator."
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#0a1b44] min-h-[130px] resize-none"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving || (!canManage && Boolean(selectedCompany))}
                  className="bg-[#0a1b44] text-white px-6 py-3 rounded-xl text-[13px] font-bold hover:bg-[#11265c] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {selectedCompany ? "Save Company" : "Create Company"}
                </button>
              </div>
            </form>
            ) : selectedCompany ? (
              <CompanyProfileSummary company={selectedCompany} />
            ) : null}

            {selectedCompany && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[18px] font-bold text-gray-900">Owners & Members</h2>
                    <Users size={18} className="text-gray-400" />
                  </div>

                  <div className="space-y-3 mb-6">
                    {selectedCompany.members?.map((member) => {
                      const isEditing = editingMemberId === member.id;

                      return (
                        <div key={member.id} className="flex items-center justify-between gap-3 bg-[#f8f9fc] rounded-xl p-3 border border-gray-100">
                          {isEditing ? (
                            <form onSubmit={updateMember} className="flex-1 min-w-0 space-y-3">
                              <p className="text-[14px] font-bold text-gray-900 truncate">{member.user.name || member.user.email}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <select
                                  value={memberEditForm.role}
                                  onChange={(e) => setMemberEditForm({ ...memberEditForm, role: e.target.value as CompanyMemberRole })}
                                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 outline-none"
                                >
                                  {COMPANY_MEMBER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                                </select>
                                <input
                                  value={memberEditForm.title}
                                  onChange={(e) => setMemberEditForm({ ...memberEditForm, title: e.target.value })}
                                  placeholder="Title"
                                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-medium text-gray-800 outline-none"
                                />
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex items-center gap-2 text-[12px] font-bold text-gray-500">
                                  <input
                                    type="checkbox"
                                    checked={memberEditForm.isPrimaryContact}
                                    onChange={(e) => setMemberEditForm({ ...memberEditForm, isPrimaryContact: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  Primary contact
                                </label>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMemberId(null);
                                      setMemberEditForm(emptyMemberEditForm);
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg"
                                  >
                                    <X size={15} />
                                  </button>
                                  <button type="submit" className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg">
                                    <Check size={15} />
                                  </button>
                                </div>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="min-w-0">
                                <p className="text-[14px] font-bold text-gray-900 truncate">{member.user.name || member.user.email}</p>
                                <p className="text-[12px] text-gray-500">
                                  {formatMembershipTitle(member.role, member.title)}
                                </p>
                              </div>
                              {canManage && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => startEditingMember(member)} className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                                    <Pencil size={15} />
                                  </button>
                                  {member.user.id !== user?.id && (
                                    <button onClick={() => removeMember(member.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {canManage && (
                    <form onSubmit={addMember} className="space-y-3 border-t border-gray-100 pt-5">
                      <select
                        value={memberForm.userId}
                        onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 outline-none"
                        required
                      >
                        <option value="">Select user</option>
                        {availableMembers.map((contact) => (
                          <option key={contact.id} value={contact.id}>{contact.name || contact.email}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={memberForm.role}
                          onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as CompanyMemberRole })}
                          className="px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 outline-none"
                        >
                          {COMPANY_MEMBER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                        <input
                          value={memberForm.title}
                          onChange={(e) => setMemberForm({ ...memberForm, title: e.target.value })}
                          placeholder="Title"
                          className="px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl text-[13px] font-medium text-gray-800 outline-none"
                        />
                      </div>
                      <button className="w-full bg-blue-50 text-blue-700 px-4 py-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-blue-100">
                        <UserPlus size={16} />
                        Add Member
                      </button>
                    </form>
                  )}
                </section>

              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="bg-[#0a1b44] rounded-2xl p-6 text-white">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                <Building2 size={20} />
              </div>
              <h3 className="text-[20px] font-bold mb-2">{selectedCompany?.name || "No company yet"}</h3>
              <p className="text-[13px] text-blue-200 leading-relaxed">
                {selectedCompany?.description || "Create your company profile so the incubator can connect your team to requests."}
              </p>
            </div>

            {selectedCompany && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <InfoLine label="Stage" value={formatCompanyStage(selectedCompany.stage)} />
                <InfoLine label="Status" value={formatCompanyStatus(selectedCompany.status)} />
                <InfoLine label="Sector" value={selectedCompany.sector || "Not set"} />
                <InfoLine label="Cohort" value={selectedCompany.cohort || "Not set"} />
                <InfoLine label="Members" value={String(selectedCompany.memberCount)} />
                <InfoLine label="Posts" value={String(selectedCompany.postCount)} />
                {selectedCompany.website && (
                  <a href={selectedCompany.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] font-bold text-blue-700 hover:underline">
                    <LinkIcon size={14} />
                    Visit website
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function CompanyProfileSummary({ company }: { company: Company }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-[#0a1b44] px-6 py-7 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-widest text-blue-200 uppercase mb-1">{formatCompanyStatus(company.status)}</p>
            <h2 className="text-[24px] font-bold truncate">{company.name}</h2>
          </div>
        </div>
        <p className="text-[13px] text-blue-100 leading-relaxed mt-5 max-w-3xl">
          {company.description || "No company concept has been added yet."}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 p-6">
        <InfoLine label="Stage" value={formatCompanyStage(company.stage)} />
        <InfoLine label="Sector" value={company.sector || "Not set"} />
        <InfoLine label="Cohort" value={company.cohort || "Not set"} />
        <InfoLine label="Founded" value={company.foundedAt ? new Date(company.foundedAt).toLocaleDateString() : "Not set"} />
        <InfoLine label="Legal Name" value={company.legalName || "Not set"} />
        <InfoLine label="Website" value={company.website || "Not set"} />
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-widest text-gray-700 uppercase mb-2">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#0a1b44]"
      />
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">{label}</span>
      <span className="text-[13px] font-bold text-gray-900 text-right">{value}</span>
    </div>
  );
}
