"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Save, Search, Trash2, Users } from "lucide-react";
import {
  Company,
  COMPANY_STATUSES,
  CompanyStatus,
  formatCompanyStage,
  formatCompanyStatus,
  formatMembershipTitle,
} from "@/lib/companyTypes";

const REVIEW_STATUSES = COMPANY_STATUSES.filter((status) =>
  status.value === "PENDING" || status.value === "ACTIVE",
);

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [status, setStatus] = useState<CompanyStatus>("PENDING");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? companies[0] ?? null,
    [companies, selectedCompanyId],
  );

  const filteredCompanies = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter((company) =>
      [company.name, company.legalName, company.sector, company.cohort]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [companies, query]);

  const activeCompanies = companies.filter((company) => company.status === "ACTIVE").length;
  const pendingCompanies = companies.filter((company) => company.status === "PENDING").length;
  const totalMembers = companies.reduce((sum, company) => sum + company.memberCount, 0);

  const headers = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const selectCompany = (company: Company | null) => {
    setSelectedCompanyId(company?.id ?? null);
    setStatus((company?.status === "ACTIVE" ? "ACTIVE" : "PENDING") as CompanyStatus);
  };

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/admin/companies", { headers: headers() });

      if (res.ok) {
        const data: Company[] = await res.json();
        setCompanies(data);
        const next = data.find((company) => company.id === selectedCompanyId) ?? data[0] ?? null;
        selectCompany(next);
      }
    } catch {
      setError("Could not load companies.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setIsSaving(true);
    setError("");

    try {
      const res = await fetch(`http://localhost:8000/api/admin/companies/${selectedCompany.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not update company status.");
      }

      const updated: Company = await res.json();
      setCompanies((prev) => prev.map((company) => (company.id === updated.id ? updated : company)));
      setStatus(updated.status === "ACTIVE" ? "ACTIVE" : "PENDING");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update company status.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCompany = async () => {
    if (!selectedCompany || !confirm(`Delete ${selectedCompany.name}?`)) return;

    const res = await fetch(`http://localhost:8000/api/admin/companies/${selectedCompany.id}`, {
      method: "DELETE",
      headers: headers(),
    });

    if (res.ok) {
      const remaining = companies.filter((company) => company.id !== selectedCompany.id);
      setCompanies(remaining);
      selectCompany(remaining[0] ?? null);
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
    <div className="hide-scrollbar h-full overflow-y-auto p-4 sm:p-6 lg:p-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-blue-600 uppercase mb-2">Incubator Registry</p>
            <h1 className="text-[32px] font-bold text-[#0a1b44] tracking-tight">Companies</h1>
            <p className="text-[14px] text-gray-500 mt-2">
              Review owner-managed company profiles, approve active status, or remove invalid records.
            </p>
          </div>
        </div>

        {error && <div className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-[13px] font-bold">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 mb-8">
          <Metric label="Total Companies" value={String(companies.length)} />
          <Metric label="Active" value={String(activeCompanies)} />
          <Metric label="Pending" value={String(pendingCompanies)} />
          <Metric label="Members" value={String(totalMembers)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search companies..."
                  className="w-full pl-10 pr-4 py-3 bg-[#f8f9fc] border border-gray-100 rounded-xl text-[13px] font-medium text-gray-800 outline-none"
                />
              </div>
            </div>

            <div className="hide-scrollbar max-h-[720px] overflow-y-auto divide-y divide-gray-50">
              {filteredCompanies.length === 0 ? (
                <div className="p-8 text-center text-[13px] text-gray-400">No companies found.</div>
              ) : filteredCompanies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => selectCompany(company)}
                  className={`w-full text-left p-5 transition-colors ${selectedCompany?.id === company.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#0a1b44] text-white flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <h3 className="text-[14px] font-bold text-gray-900 truncate">{company.name}</h3>
                        <span className="text-[10px] font-bold text-blue-700 uppercase">{formatCompanyStatus(company.status)}</span>
                      </div>
                      <p className="text-[12px] text-gray-500 mt-1 truncate">{company.sector || "No sector"} - {formatCompanyStage(company.stage)}</p>
                      <p className="text-[11px] text-gray-400 mt-2">{company.memberCount} members</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selectedCompany ? (
            <div className="space-y-8">
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-[#0a1b44] px-7 py-8 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-widest text-blue-200 uppercase mb-2">{formatCompanyStatus(selectedCompany.status)}</p>
                      <h2 className="text-[28px] font-bold truncate">{selectedCompany.name}</h2>
                      <p className="text-[13px] text-blue-100 mt-3 leading-relaxed max-w-3xl">
                        {selectedCompany.description || "No company concept has been added yet."}
                      </p>
                    </div>
                    <button type="button" onClick={deleteCompany} className="text-red-600 bg-white px-3 py-2 rounded-lg text-[12px] font-bold flex items-center gap-2 hover:bg-red-50">
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="p-7">
                  <form onSubmit={saveStatus} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end mb-7 pb-7 border-b border-gray-100">
                    <div>
                      <label className="block text-[11px] font-bold tracking-widest text-gray-700 uppercase mb-2">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as CompanyStatus)}
                        className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl text-[14px] font-medium text-gray-800 outline-none"
                      >
                        {REVIEW_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </div>
                    <button disabled={isSaving} className="bg-[#0a1b44] text-white px-6 py-3 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#11265c] disabled:opacity-50">
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Status
                    </button>
                  </form>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                    <InfoLine label="Legal Name" value={selectedCompany.legalName || "Not set"} />
                    <InfoLine label="Stage" value={formatCompanyStage(selectedCompany.stage)} />
                    <InfoLine label="Sector" value={selectedCompany.sector || "Not set"} />
                    <InfoLine label="Cohort" value={selectedCompany.cohort || "Not set"} />
                    <InfoLine label="Founded" value={selectedCompany.foundedAt ? new Date(selectedCompany.foundedAt).toLocaleDateString() : "Not set"} />
                    <InfoLine label="Website" value={selectedCompany.website || "Not set"} />
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[18px] font-bold text-gray-900">Members</h2>
                    <Users size={18} className="text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    {selectedCompany.members?.length ? selectedCompany.members.map((member) => (
                      <div key={member.id} className="bg-[#f8f9fc] border border-gray-100 rounded-xl p-3">
                        <p className="text-[14px] font-bold text-gray-900">{member.user.name || member.user.email}</p>
                        <p className="text-[12px] text-gray-500">{formatMembershipTitle(member.role, member.title)}</p>
                      </div>
                    )) : <p className="text-[13px] text-gray-400 bg-[#f8f9fc] rounded-xl p-4 text-center">No members yet.</p>}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-[14px] text-gray-500">
              Select a company to review.
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">{label}</p>
      <p className="text-[30px] font-black text-[#0a1b44]">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">{label}</span>
      <span className="text-[13px] font-bold text-gray-900 text-right break-words">{value}</span>
    </div>
  );
}
