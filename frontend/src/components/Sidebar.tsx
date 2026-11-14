"use client";

import { useUser } from "@/contexts/UserContext";
import {
  CommunityIcon,
  MessageIcon,
  RequestsIcon,
  SettingsIcon,
  SupportIcon,
} from "@/components/Icons";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { name: "Community", href: "/posts", icon: CommunityIcon },
  { name: "Company", href: "/company", icon: Building2 },
  { name: "Requests", href: "/requests", icon: RequestsIcon },
  { name: "Messages", href: "/messages", icon: MessageIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="w-[260px] h-screen bg-[#f8f9fc] flex flex-col border-r border-gray-100 flex-shrink-0 z-20">
      <div className="p-8 pt-10">
        <h1 className="text-xl font-black text-[#0a1b44] tracking-tight">The Incubator</h1>
        <p className="text-[11px] font-bold tracking-widest text-gray-400 mt-1 uppercase">Series A Track</p>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? "bg-white text-[#0a1b44] font-bold shadow-sm" 
                  : "text-gray-500 hover:text-[#0a1b44] hover:bg-white/50 font-medium"
              }`}
            >
              <Icon size={18} className={isActive ? "text-[#4f46e5]" : "text-gray-400"} />
              <span className="text-[14px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 flex flex-col gap-2">

        
        <Link href="#" className="flex items-center gap-3 px-4 py-2.5 text-gray-500 hover:text-[#0a1b44] font-medium transition-colors">
          <SettingsIcon size={18} className="text-gray-400" />
          <span className="text-[14px]">Settings</span>
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-2.5 text-gray-500 hover:text-[#0a1b44] font-medium transition-colors mb-2">
          <SupportIcon size={18} className="text-gray-400" />
          <span className="text-[14px]">Support</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl font-medium transition-colors mb-4"
        >
          <LogOut size={18} className="text-red-400" />
          <span className="text-[14px]">Log Out</span>
        </button>
        
          <Link href="/settings" className="flex items-center gap-3 px-2 mt-2 hover:bg-gray-100 p-2 rounded-xl transition-colors">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shadow-sm flex-shrink-0">
             <img 
               src={user?.avatarUrl ? `http://localhost:8000${user.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=e2e8f0&color=0a1b44`} 
               alt={user?.name || "User"} 
               className="w-full h-full object-cover" 
             />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[13px] font-bold text-[#0a1b44] truncate">{user?.name || "Loading..."}</span>
            <span className="text-[11px] font-medium text-gray-500 truncate">{user?.email || "..."}</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
