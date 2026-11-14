"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Loader2, Users } from "lucide-react";
import { Company, formatCompanyStage, formatCompanyStatus, formatMemberRole } from "@/lib/companyTypes";

export default function CompanyProfilePage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8000/api/companies/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Company not found.");
        }

        setCompany(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load company.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCompany();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-10">
        <Link href="/posts" className="inline-flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-[#0a1b44] mb-6">
          <ArrowLeft size={16} />
          Back to community
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-gray-500">{error || "Company not found."}</div>
      </div>
    );
  }

  return (
    <div className="hide-scrollbar h-full overflow-y-auto px-10 py-8">
      <div className="max-w-[980px] mx-auto">
        <Link href="/posts" className="inline-flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-[#0a1b44] mb-6">
          <ArrowLeft size={16} />
          Back to community
        </Link>

        <div className="bg-[#0a1b44] rounded-2xl p-8 text-white mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
            <Building2 size={26} />
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-blue-200 uppercase mb-2">{company.cohort || "Incubator Company"}</p>
              <h1 className="text-[36px] font-bold tracking-tight">{company.name}</h1>
              <p className="text-[14px] text-blue-100 mt-3 max-w-2xl leading-relaxed">
                {company.description || "No company concept has been added yet."}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-full">
                {formatCompanyStage(company.stage)}
              </span>
              <span className="bg-white text-[#0a1b44] text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-full">
                {formatCompanyStatus(company.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <Metric label="Sector" value={company.sector || "Not set"} />
          <Metric label="Members" value={String(company.memberCount)} />
          <Metric label="Posts" value={String(company.postCount)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-gray-900">Team</h2>
              <Users size={18} className="text-gray-400" />
            </div>
            <div className="space-y-3">
              {company.members?.map((member) => (
                <div key={member.id} className="bg-[#f8f9fc] rounded-xl p-4 border border-gray-100">
                  <p className="text-[14px] font-bold text-gray-900">{member.user.name || member.user.email}</p>
                  <p className="text-[12px] text-gray-500">
                    {formatMemberRole(member.role)}{member.title ? ` - ${member.title}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">{label}</p>
      <p className="text-[22px] font-black text-[#0a1b44] truncate">{value}</p>
    </div>
  );
}
