"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, FileOutput, Filter, Loader2, Paperclip, Search, ShieldAlert, XCircle } from "lucide-react";

type RequestStatus = "all" | "pending" | "approved" | "rejected";

type AdminRequest = {
  id: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  requester: {
    id: number;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  company: {
    id: number;
    name: string;
    stage: string;
    status: string;
  } | null;
  attachment: {
    id: number;
    fileName: string;
    mimeType: string;
    fileSize: number;
    accessType: string;
  };
  post: {
    id: number;
    content: string;
    createdAt: string;
    author: {
      id: number;
      name: string | null;
      email: string | null;
    };
  };
};

const API_BASE = "http://localhost:8000";
const STATUS_FILTERS: { value: RequestStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<RequestStatus>("all");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRequests = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Could not load requests.");
      }

      setRequests(await res.json());
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load requests.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchRequests(), 0);
    const intervalId = window.setInterval(() => void fetchRequests(true), 10000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const term = query.trim().toLowerCase();
    return requests.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSearch = !term || [
        item.attachment.fileName,
        item.requester.name,
        item.requester.email,
        item.company?.name,
        item.post.author.name,
        item.post.author.email,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [query, requests, statusFilter]);

  const metrics = useMemo(() => {
    const pending = requests.filter((item) => item.status === "pending").length;
    const approved = requests.filter((item) => item.status === "approved").length;
    const rejected = requests.filter((item) => item.status === "rejected").length;
    const oldestPending = requests
      .filter((item) => item.status === "pending")
      .map((item) => new Date(item.createdAt).getTime())
      .filter((time) => !Number.isNaN(time))
      .sort((a, b) => a - b)[0];

    return {
      pending,
      approved,
      rejected,
      oldestPendingLabel: oldestPending ? ageLabel(oldestPending) : "None",
    };
  }, [requests]);

  const updateStatus = async (requestId: number, status: AdminRequest["status"]) => {
    setUpdatingId(requestId);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not update request.");
      }

      const updated: AdminRequest = await res.json();
      setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update request.");
    } finally {
      setUpdatingId(null);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["ID", "Status", "Requester", "Company", "Attachment", "Post Author", "Created At"],
      ...filteredRequests.map((item) => [
        item.id,
        item.status,
        item.requester.name || item.requester.email || "",
        item.company?.name || "",
        item.attachment.fileName,
        item.post.author.name || item.post.author.email || "",
        item.createdAt,
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-requests.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="mb-2 text-[32px] font-bold leading-tight tracking-tight text-gray-900">Requests Management</h1>
            <p className="text-[15px] leading-relaxed text-gray-500">
              Review file access requests in real time and approve or reject them from one queue.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button className="flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-[13px] font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
              <Filter size={16} />
              {isRefreshing ? "Refreshing..." : "Auto-refresh on"}
            </button>
            <button onClick={exportCsv} className="flex items-center justify-center gap-2 rounded-full bg-[#3b49df] px-6 py-3 text-[13px] font-bold text-white shadow-md shadow-indigo-500/20 transition-colors hover:bg-[#2d38b0]">
              <FileOutput size={16} />
              Export Report
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-bold text-red-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:mb-10 xl:grid-cols-4 xl:gap-6">
          <Metric label="Total Requests" value={isLoading ? "..." : String(requests.length)} accent="text-gray-900" />
          <Metric label="Pending Review" value={isLoading ? "..." : String(metrics.pending)} accent="text-orange-600" />
          <Metric label="Approved" value={isLoading ? "..." : String(metrics.approved)} accent="text-emerald-600" />
          <Metric label="Oldest Pending" value={isLoading ? "..." : metrics.oldestPendingLabel} accent="text-[#0a1b44]" compact />
        </div>

        <div className="mb-10 overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="hide-scrollbar flex overflow-x-auto rounded-xl border border-gray-100 bg-[#f8f9fc] p-1">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`whitespace-nowrap rounded-lg px-5 py-2 text-[12px] font-bold transition-colors ${statusFilter === filter.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-[320px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search requests..."
                  className="w-full rounded-xl border border-gray-100 bg-[#f8f9fc] py-3 pl-10 pr-4 text-[13px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#0a1b44]"
                />
              </div>
              <span className="text-[12px] font-medium text-gray-500">
                {filteredRequests.length} of {requests.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Request</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Requester</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Company</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-6 py-5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <Loader2 className="mx-auto animate-spin" size={22} />
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[13px] font-medium text-gray-400">No requests match this view.</td>
                  </tr>
                ) : filteredRequests.map((request) => (
                  <tr key={request.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Paperclip size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-[14px] font-bold text-gray-900">{request.attachment.fileName}</h4>
                          <p className="text-[11px] font-medium text-gray-400">Private file access - {formatFileSize(request.attachment.fileSize)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-bold text-gray-800">{request.requester.name || "Unnamed user"}</p>
                      <p className="text-[11px] text-gray-400">{request.requester.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] font-medium text-gray-700">{request.company?.name || "No company"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] text-gray-600">{new Date(request.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {request.status !== "approved" && (
                          <button
                            disabled={updatingId === request.id}
                            onClick={() => updateStatus(request.id, "approved")}
                            className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {request.status !== "rejected" && (
                          <button
                            disabled={updatingId === request.id}
                            onClick={() => updateStatus(request.id, "rejected")}
                            className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-gray-100 bg-white p-5 text-[12px] font-medium text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Showing <span className="font-bold text-gray-900">{filteredRequests.length}</span> matching requests</span>
            <span>{lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Waiting for first refresh"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1a3375] to-[#0a1b44] p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
            <div className="relative z-10 max-w-xl">
              <h2 className="mb-3 text-[24px] font-bold text-white">Review Guidelines</h2>
              <p className="mb-8 text-[14px] leading-relaxed text-blue-200">
                Approve access only when the requester has a valid operating need or is part of the owning company workflow.
              </p>
              <button className="rounded-xl bg-white px-6 py-3 text-[14px] font-bold text-[#0a1b44] shadow-sm transition-colors hover:bg-gray-50">
                Read Full Protocol
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-[#f3f4f6] p-6 sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <ShieldAlert size={20} />
            </div>
            <h3 className="mb-3 text-[18px] font-bold text-gray-900">Need Help?</h3>
            <p className="mb-6 text-[13px] leading-relaxed text-gray-600">
              Use the latest requester, company, and attachment context before changing status.
            </p>
            <button onClick={() => void fetchRequests(true)} className="text-[14px] font-bold text-[#0a1b44] underline underline-offset-4 transition-colors hover:text-indigo-600">
              Refresh Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent, compact = false }: { label: string; value: string; accent: string; compact?: boolean }) {
  return (
    <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</h3>
      <span className={`${compact ? "text-3xl" : "text-4xl"} font-black leading-none ${accent}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminRequest["status"] }) {
  const config = {
    pending: { icon: Clock3, className: "bg-orange-50 text-orange-600 border-orange-100", label: "Pending" },
    approved: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600 border-emerald-100", label: "Approved" },
    rejected: { icon: XCircle, className: "bg-red-50 text-red-600 border-red-100", label: "Rejected" },
  }[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ageLabel(timestamp: number) {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m`;
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
