"use client";

import { useState, useEffect, useMemo } from "react";
import { UserPlus, Search, ChevronDown, Zap, TrendingUp, Trash2, X } from "lucide-react";

interface User {
  id: number;
  email: string;
  name: string;
  roles: string[];
  status: string;
  lastLoginAt: string | null;
  avatarUrl: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ROLE_ENTERPRISE'
  });

  const fetchUsers = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchUsers(), 0);
    const intervalId = window.setInterval(() => void fetchUsers(true), 10000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/admin/users", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', email: '', password: '', role: 'ROLE_USER' });
        fetchUsers(true);
      } else {
        alert("Failed to create user. Email might already exist.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'Inactive' : 'active';
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Helper to format role pill
  const getRoleBadge = (roles: string[]) => {
    if (roles.includes("ROLE_ADMIN")) {
      return <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Admin</span>;
    }
    if (roles.includes("ROLE_ENTERPRISE")) {
      return <span className="bg-indigo-50 text-indigo-600 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Enterprise</span>;
    }
    return <span className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">User</span>;
  };

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery = !term || [u.name, u.email].some((value) => value.toLowerCase().includes(term));
      const matchesRole = roleFilter === "all" || u.roles.includes(roleFilter);
      const normalizedStatus = u.status || "Active";
      const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const activeEntrepreneurs = users.filter(u => u.roles.includes('ROLE_ENTERPRISE') && (u.status || 'Active') === 'Active').length;
  const activeUsers = users.filter(u => (u.status || 'Active') === 'Active').length;
  const inactiveUsers = users.filter(u => u.status === 'Inactive').length;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
      <div className="mx-auto max-w-[1200px]">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8 lg:mb-10">
        <div className="min-w-0">
          <h1 className="text-[32px] font-bold text-[#0a1b44] leading-tight mb-2 tracking-tight">
            User Management
          </h1>
          <p className="text-[15px] text-gray-600">
            Oversee your {users.length} registered founders and administrators.
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            {isRefreshing ? "Refreshing..." : lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Live data"}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-[#0a1b44] text-white px-6 py-3 rounded-xl text-[14px] font-bold hover:bg-[#11265c] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 sm:w-auto"
        >
          <UserPlus size={18} />
          Add New User
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-10">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[11px] font-bold tracking-widest text-gray-800 uppercase">Total Users</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-[#0a1b44]">{users.length}</span>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-md">{activeUsers} active</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[11px] font-bold tracking-widest text-gray-800 uppercase">Founders</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-[#0a1b44]">{activeEntrepreneurs}</span>
            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-md">Active</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[11px] font-bold tracking-widest text-gray-800 uppercase">Inactive</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black text-[#0a1b44]">{inactiveUsers}</span>
            <TrendingUp size={24} className="text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Toolbar & Table */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-white lg:flex-row lg:items-center lg:gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#f8f9fc] border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[13px] font-medium text-gray-800 placeholder-gray-500"
              placeholder="Search by name or email..."
            />
          </div>
          <label className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full appearance-none px-5 py-3 pr-10 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors bg-white outline-none lg:w-auto"
            >
              <option value="all">Role: All</option>
              <option value="ROLE_ENTERPRISE">Founders</option>
              <option value="ROLE_ADMIN">Admins</option>
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </label>
          <label className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none px-5 py-3 pr-10 border border-gray-200 rounded-xl text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors bg-white outline-none lg:w-auto"
            >
              <option value="all">Status: All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </label>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-bold tracking-widest text-gray-400 uppercase">User</th>
                <th className="px-6 py-5 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Role</th>
                <th className="px-6 py-5 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Last Login</th>
                <th className="px-6 py-5 text-[10px] font-bold tracking-widest text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500">No users match this view.</td>
                </tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${u.status === 'Inactive' ? 'bg-gray-50/30' : ''}`}>
                  <td className="px-6 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full border border-gray-200 overflow-hidden bg-gray-100 ${u.status === 'Inactive' ? 'opacity-70' : ''}`}>
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} alt={u.name} className={`w-full h-full object-cover ${u.status === 'Inactive' ? 'grayscale' : ''}`} />
                    </div>
                    <div>
                      <h4 className={`text-[14px] font-bold ${u.status === 'Inactive' ? 'text-gray-600' : 'text-gray-900'}`}>{u.name}</h4>
                      <p className={`text-[12px] ${u.status === 'Inactive' ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(u.roles)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.status === 'active' || u.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                      <span className={`text-[13px] font-bold ${u.status === 'active' || u.status === 'Active' ? 'text-emerald-600' : 'text-gray-500'}`}>{u.status || 'Active'}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${u.status === 'Inactive' ? 'opacity-70' : ''}`}>
                    <p className="text-[13px] text-gray-700 font-medium">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.status === 'Inactive' ? (
                        <button onClick={() => toggleStatus(u.id, u.status)} className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-colors">
                          <Zap size={14} fill="currentColor" /> Reactivate
                        </button>
                      ) : (
                        <button onClick={() => toggleStatus(u.id, u.status)} className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-orange-100 transition-colors">
                          Deactivate
                        </button>
                      )}
                      <button onClick={() => deleteUser(u.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-5 border-t border-gray-100 flex justify-between items-center bg-white">
          <span className="text-[12px] text-gray-500 font-medium">Showing <span className="font-bold text-gray-900">{filteredUsers.length}</span> of {users.length} users</span>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0a1b44]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-[500px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[24px] shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-[18px] font-bold text-gray-900">Add New User</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[14px] font-medium text-gray-800"
                    placeholder="E.g. Sarah Bennett"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">Email Address</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[14px] font-medium text-gray-800"
                    placeholder="sarah@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">Password (optional)</label>
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[14px] font-medium text-gray-800"
                    placeholder="Leave empty to send invite"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f8f9fc] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[14px] font-medium text-gray-800 appearance-none"
                  >
                    <option value="ROLE_USER">User</option>
                    <option value="ROLE_ADMIN">Administrator</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-[14px] font-bold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button disabled={isSubmitting} type="submit" className="flex-1 px-4 py-3 bg-[#0a1b44] text-white rounded-xl text-[14px] font-bold hover:bg-[#11265c] transition-colors shadow-md shadow-blue-900/10 disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
