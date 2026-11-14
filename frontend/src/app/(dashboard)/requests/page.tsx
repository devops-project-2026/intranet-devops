"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Clock, XCircle, Check, Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface DownloadRequest {
  id: number;
  status: string;
  createdAt: string;
  requester?: { id: number; name: string };
  author?: { id: number; name: string };
  attachment: { id: number; fileName: string };
}

export default function RequestsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [requests, setRequests] = useState<DownloadRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const getProfileLink = (id?: number) => (user?.id === id ? "/settings" : `/profile/${id}`);

  useEffect(() => {
    let isMounted = true;

    const fetchRequests = async (showSpinner = false) => {
      if (showSpinner) setIsLoading(true);

      try {
        const token = localStorage.getItem("token");
        const endpoint = activeTab === 'received'
          ? "http://localhost:8000/api/my-download-requests"
          : "http://localhost:8000/api/sent-download-requests";

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (res.ok && isMounted) setRequests(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void fetchRequests(true);
    }, 0);
    const interval = window.setInterval(() => {
      void fetchRequests();
    }, 5000);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      window.clearInterval(interval);
    };
  }, [activeTab]);

  const updateRequestStatus = async (id: number, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const res = await fetch(`http://localhost:8000/api/download-requests/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
      }
    } catch (e) { console.error(e); }
    finally { setProcessingId(null); }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="p-10 max-w-[1000px] mx-auto h-full overflow-y-auto">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div className="max-w-2xl">
          <div className="text-[10px] font-bold tracking-widest text-[#0a1b44] uppercase mb-4">
            Access Management
          </div>
          <h1 className="text-[36px] font-bold text-gray-900 leading-tight mb-4 tracking-tight">
            Manage File Access<br />Requests.
          </h1>
          <p className="text-[15px] text-gray-500 leading-relaxed">
            Review requests from community members, and track the status of files you&apos;ve requested access to.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
            {activeTab === 'received' ? 'Pending Action' : 'Awaiting Approval'}
          </h3>
          <div className="flex items-center justify-between mt-4">
            <span className="text-5xl font-black text-[#0a1b44]">{pendingCount}</span>
            {pendingCount > 0 && activeTab === 'received' && <div className="bg-orange-50 text-orange-600 text-[11px] font-bold px-2 py-1 rounded-md">Needs Action</div>}
          </div>
        </div>

        <div className="bg-[#0a1b44] p-8 rounded-2xl shadow-lg shadow-blue-900/10 flex flex-col justify-between text-white">
          <h3 className="text-[11px] font-bold tracking-widest text-blue-200 uppercase">Total Approved</h3>
          <div className="flex items-center justify-between mt-4">
            <span className="text-5xl font-black text-white">{approvedCount}</span>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-blue-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <h3 className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-4 relative z-10">Security Note</h3>
          <h4 className="text-[18px] font-bold text-gray-900 mb-2 relative z-10">Private by Default</h4>
          <p className="text-[12px] text-gray-500 relative z-10">
            Files uploaded as private require explicit approval before anyone can download them.
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-12">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 className="text-[16px] font-bold text-gray-900">Recent File Requests</h3>
          <div className="flex bg-gray-50 rounded-lg p-1">
            <button 
              onClick={() => { setRequests([]); setActiveTab('received'); }}
              className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-colors ${activeTab === 'received' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Received Requests
            </button>
            <button 
              onClick={() => { setRequests([]); setActiveTab('sent'); }}
              className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-colors ${activeTab === 'sent' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Sent Requests
            </button>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Requested File</th>
              <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                {activeTab === 'received' ? 'Requester' : 'File Owner'}
              </th>
              <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Date</th>
              <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" /> Loading requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-medium">No file access requests found.</td></tr>
            ) : (
              requests.map((req: DownloadRequest) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[14px] font-bold text-gray-900 truncate max-w-[200px]" title={req.attachment?.fileName}>{req.attachment?.fileName}</h4>
                      <p className="text-[12px] text-gray-500">Private File</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(activeTab === 'received' ? (req.requester?.name || 'Unknown') : (req.author?.name || 'Unknown'))}&background=random`} 
                          alt="" 
                          className="w-6 h-6 rounded-full cursor-pointer hover:opacity-80 transition-opacity" 
                          onClick={() => router.push(getProfileLink(activeTab === 'received' ? req.requester?.id : req.author?.id))}
                        />
                        <span 
                          className="text-[13px] font-bold text-gray-900 cursor-pointer hover:text-[#0a1b44] hover:underline"
                          onClick={() => router.push(getProfileLink(activeTab === 'received' ? req.requester?.id : req.author?.id))}
                        >
                        {activeTab === 'received' ? (req.requester?.name || 'Unknown') : (req.author?.name || 'Unknown')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[13px] text-gray-600 font-medium">{formatDate(req.createdAt)}</td>
                  <td className="px-6 py-5">
                    {req.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <Clock size={10} /> Pending
                      </span>
                    )}
                    {req.status === 'approved' && (
                      <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <Check size={10} /> Approved
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <XCircle size={10} /> Rejected
                      </span>
                    )}
                  </td>
                  {activeTab === 'received' ? (
                    <td className="px-6 py-5 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            disabled={processingId === req.id}
                            onClick={() => updateRequestStatus(req.id, 'approved')} 
                            className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-green-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button 
                            disabled={processingId === req.id}
                            onClick={() => updateRequestStatus(req.id, 'rejected')} 
                            className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <XCircle size={14} /> Deny
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] font-medium text-gray-400">Resolved</span>
                      )}
                    </td>
                  ) : (
                    <td className="px-6 py-5 text-right">
                      {req.status === 'approved' ? (
                        <button 
                          onClick={async () => {
                            const dlRes = await fetch(`http://localhost:8000/api/attachments/${req.attachment.id}/download`, { headers: { Authorization: `Bearer ${token}` } });
                            if (dlRes.ok) {
                              const blob = await dlRes.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = req.attachment.fileName;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            }
                          }}
                          className="bg-[#0a1b44] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-[#11265c] transition-colors flex items-center justify-end gap-1 ml-auto"
                        >
                          Download
                        </button>
                      ) : (
                        <span className="text-[12px] font-medium text-gray-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
