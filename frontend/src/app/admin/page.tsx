"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  ClipboardList,
  CloudUpload,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Company, formatCompanyStage } from "@/lib/companyTypes";

const API_BASE = "http://localhost:8000";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  status: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
};

type DashboardPost = {
  id: number;
  content: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  author: {
    id: number;
    name: string;
    roles: string[];
  };
  company: {
    id: number;
    name: string;
    stage: string;
  } | null;
};

type Activity = {
  id: string;
  kind: "company" | "post" | "review" | "user";
  title: string;
  description: string;
  createdAt: string;
  badge?: string;
};

export default function AdminDashboardPage() {
  const { user } = useUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [posts, setPosts] = useState<DashboardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("You need to sign in again to load the admin dashboard.");
        setIsLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [usersRes, companiesRes, postsRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/users`, { headers }),
          fetch(`${API_BASE}/api/admin/companies`, { headers }),
          fetch(`${API_BASE}/api/posts`, { headers }),
        ]);

        if (!usersRes.ok || !companiesRes.ok || !postsRes.ok) {
          throw new Error("Could not load all dashboard data.");
        }

        const [usersData, companiesData, postsData] = await Promise.all([
          usersRes.json() as Promise<AdminUser[]>,
          companiesRes.json() as Promise<Company[]>,
          postsRes.json() as Promise<DashboardPost[]>,
        ]);

        setUsers(usersData);
        setCompanies(companiesData);
        setPosts(postsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboard();
  }, []);

  const dashboardDate = useMemo(
    () => new Date().toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    [],
  );

  const stats = useMemo(() => {
    const activeUsers = users.filter((item) => item.status !== "Inactive").length;
    const activeCompanies = companies.filter((item) => item.status === "ACTIVE").length;
    const pendingCompanies = companies.filter((item) => item.status === "PENDING").length;
    const postEngagement = posts.reduce((total, post) => total + post.likeCount + post.commentCount, 0);

    return {
      activeUsers,
      activeCompanies,
      pendingCompanies,
      postEngagement,
    };
  }, [companies, posts, users]);

  const recentActivity = useMemo<Activity[]>(() => {
    const companyEvents = companies.slice(0, 6).map((company) => ({
      id: `company-${company.id}`,
      kind: company.status === "PENDING" ? "review" as const : "company" as const,
      title: company.status === "PENDING" ? "Company awaiting review" : "Company profile updated",
      description: `${company.name} is in ${formatCompanyStage(company.stage)} stage.`,
      createdAt: company.updatedAt || company.createdAt,
      badge: company.status === "PENDING" ? "Review" : undefined,
    }));

    const postEvents = posts.slice(0, 6).map((post) => ({
      id: `post-${post.id}`,
      kind: "post" as const,
      title: "New community post",
      description: `${post.author.name} posted${post.company ? ` for ${post.company.name}` : ""}.`,
      createdAt: post.createdAt,
    }));

    return [...companyEvents, ...postEvents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [companies, posts]);

  const topCompanies = useMemo(
    () =>
      [...companies]
        .sort((a, b) => b.postCount + b.memberCount - (a.postCount + a.memberCount))
        .slice(0, 3),
    [companies],
  );

  return (
    <div className="hide-scrollbar h-full overflow-y-auto p-4 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-gray-900 sm:text-[32px]">
              Welcome back, {user?.name || "Admin"}
            </h1>
            <p className="mt-1 text-[14px] leading-relaxed text-gray-500 sm:text-[15px]">
              Live operating snapshot for users, companies, posts, and pending reviews.
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-[12px] font-bold uppercase tracking-widest text-gray-500 shadow-sm">
            <Calendar size={16} />
            {dashboardDate}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-12 xl:grid-cols-4 xl:gap-6">
          <MetricCard
            label="Total Users"
            value={isLoading ? "..." : formatNumber(users.length)}
            caption={`${stats.activeUsers} active`}
            icon={Users}
            accent="indigo"
            progress={users.length ? (stats.activeUsers / users.length) * 100 : 0}
          />
          <MetricCard
            label="Active Companies"
            value={isLoading ? "..." : formatNumber(stats.activeCompanies)}
            caption={`${companies.length} total`}
            icon={Building2}
            accent="purple"
            progress={companies.length ? (stats.activeCompanies / companies.length) * 100 : 0}
          />
          <MetricCard
            label="Posts Count"
            value={isLoading ? "..." : formatNumber(posts.length)}
            caption={`${formatNumber(stats.postEngagement)} interactions`}
            icon={MessageSquare}
            accent="orange"
            progress={Math.min(100, posts.length * 10)}
          />
          <MetricCard
            label="Pending Reviews"
            value={isLoading ? "..." : formatNumber(stats.pendingCompanies)}
            caption={stats.pendingCompanies ? "Needs attention" : "All clear"}
            icon={ClipboardList}
            accent="red"
            progress={companies.length ? (stats.pendingCompanies / companies.length) * 100 : 0}
          />
        </div>

        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-400 shadow-sm">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
              <section className="min-w-0">
                <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
                  <h2 className="text-[18px] font-bold text-gray-900">Recent Activity</h2>
                  <span className="text-[12px] font-bold text-[#0a1b44]">{recentActivity.length} updates</span>
                </div>

                <div className="space-y-4">
                  {recentActivity.length ? (
                    recentActivity.map((activity) => <ActivityItem key={activity.id} activity={activity} />)
                  ) : (
                    <EmptyState label="No activity yet." />
                  )}
                </div>
              </section>

              <aside className="min-w-0">
                <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
                  <h2 className="text-[18px] font-bold text-gray-900">Announcements</h2>
                  <span className="text-[12px] font-bold text-[#0a1b44]">Live</span>
                </div>

                <div className="mb-4 rounded-[24px] bg-gradient-to-br from-[#1a3375] to-[#0a1b44] p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
                  <span className="mb-4 inline-block rounded bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                    Review Queue
                  </span>
                  <h3 className="mb-2 text-[20px] font-bold leading-tight">
                    {stats.pendingCompanies ? `${stats.pendingCompanies} company profiles need review` : "No pending company reviews"}
                  </h3>
                  <p className="mb-6 text-[13px] leading-relaxed text-blue-200">
                    Keep company status decisions current so founders can access the right workspace.
                  </p>
                  <a href="/admin/companies" className="inline-flex rounded-lg bg-white px-5 py-2.5 text-[12px] font-bold text-[#0a1b44] transition-colors hover:bg-gray-50">
                    Review Companies
                  </a>
                </div>

                <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm">
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-gray-400">Network Health</span>
                  <h3 className="mb-2 text-[15px] font-bold leading-snug text-gray-900">
                    {formatNumber(stats.activeUsers)} active users across {formatNumber(stats.activeCompanies)} active companies
                  </h3>
                  <p className="text-[12px] leading-relaxed text-gray-500">
                    This snapshot updates from the admin APIs each time the dashboard loads.
                  </p>
                </div>
              </aside>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
              <section className="min-w-0">
                <h2 className="mb-5 text-[18px] font-bold text-gray-900 sm:mb-6">Top Performing Ventures</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {topCompanies.length ? (
                    topCompanies.map((company, index) => (
                      <VentureCard key={company.id} company={company} index={index} />
                    ))
                  ) : (
                    <div className="md:col-span-2 xl:col-span-3">
                      <EmptyState label="No companies available yet." />
                    </div>
                  )}
                </div>
              </section>

              <aside className="min-w-0">
                <h2 className="mb-5 text-[18px] font-bold text-gray-900 sm:mb-6">Admin Tools</h2>
                <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
                  <ToolButton icon={CloudUpload} label="Upload" />
                  <ToolButton icon={Mail} label="Email" />
                  <ToolButton icon={FileText} label="Reports" />
                  <ToolButton icon={Shield} label="Security" />
                </div>

                <div className="relative overflow-hidden rounded-[24px] bg-[#6366f1] p-6 text-white shadow-md">
                  <span className="pointer-events-none absolute -bottom-6 -right-4 text-[120px] font-black leading-none text-white opacity-[0.08]">?</span>
                  <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-indigo-200">Help Desk</span>
                  <h3 className="mb-6 max-w-[180px] text-[16px] font-bold leading-tight text-white">Need technical assistance?</h3>
                  <button className="rounded-lg bg-white/20 px-5 py-2.5 text-[12px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/30">
                    Support Chat
                  </button>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  accent,
  progress,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: "indigo" | "purple" | "orange" | "red";
  progress: number;
}) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-500",
  };

  const bars = {
    indigo: "bg-[#0a1b44]",
    purple: "bg-purple-600",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  return (
    <div className="flex min-h-[180px] flex-col justify-between rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[accent]}`}>
          <Icon size={20} />
        </div>
        <span className="rounded-md bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500">{caption}</span>
      </div>
      <div>
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</h3>
        <span className="text-4xl font-black text-gray-900">{value}</span>
      </div>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${bars[accent]}`} style={{ width: `${Math.max(5, Math.min(100, progress))}%` }} />
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = activity.kind === "post" ? MessageSquare : activity.kind === "review" ? ClipboardList : activity.kind === "user" ? UserPlus : Building2;
  const colors = activity.kind === "post" ? "bg-blue-50 text-blue-600" : activity.kind === "review" ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600";

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-start">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${colors}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="mb-0.5 text-[14px] font-bold text-gray-900">{activity.title}</h4>
        <p className="text-[12px] leading-relaxed text-gray-500">{activity.description}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{timeAgo(activity.createdAt)}</span>
        {activity.badge && <span className="rounded-full bg-[#0a1b44] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">{activity.badge}</span>}
      </div>
    </div>
  );
}

function VentureCard({ company, index }: { company: Company; index: number }) {
  const backgrounds = ["bg-[#0a1b44]", "bg-[#1a1a1a]", "bg-[#1e293b]"];
  const score = Math.min(99, 70 + company.postCount * 4 + company.memberCount * 3);

  return (
    <div className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`relative flex h-28 items-center justify-center overflow-hidden ${backgrounds[index % backgrounds.length]} sm:h-32`}>
        <span className="absolute right-3 top-3 rounded bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
          {formatCompanyStage(company.stage)}
        </span>
        <div className="z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md">
          <Building2 size={20} />
        </div>
      </div>
      <div className="p-5">
        <h3 className="mb-1 truncate text-[15px] font-bold text-gray-900">{company.name}</h3>
        <p className="mb-4 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{company.sector || company.description || "Company profile awaiting more detail."}</p>
        <div className="flex items-end justify-between gap-4">
          <div className="text-[11px] font-medium text-gray-500">
            {company.memberCount} members
          </div>
          <span className="text-[11px] font-bold text-[#0a1b44]">{score}% KPI</span>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }) {
  return (
    <button className="flex min-h-[128px] flex-col items-center justify-center gap-3 rounded-[20px] border border-gray-100 bg-white p-5 text-gray-600 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-current">
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-gray-200 bg-white p-8 text-center text-[13px] font-medium text-gray-400">
      {label}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function timeAgo(value: string) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "recently";

  const diff = Date.now() - time;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}
