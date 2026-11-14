"use client";

import { useUser } from "@/contexts/UserContext";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Bell } from "lucide-react";

export function Topbar() {
  const pathname = usePathname();
  const { user } = useUser();
  
  // Format breadcrumb based on path
  let title = "Dashboard";
  if (pathname === "/posts") title = "Community";
  if (pathname === "/company" || pathname.startsWith("/companies/")) title = "Company";
  if (pathname === "/requests") title = "Requests";
  if (pathname === "/messages") title = "Messages";

  return (
    <header className="h-[90px] w-full flex items-center justify-between px-10 bg-[#f8f9fc]">
      <div className="flex items-center text-[13px]">
        <span className="text-[#8e9bba] font-medium">Venture OS / </span>
        <span className="text-[#0a1b44] font-bold ml-1">{title}</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-[280px] pl-10 pr-4 py-2 bg-[#e9ecf3] border-none rounded-lg focus:ring-2 focus:ring-[#0a1b44] outline-none text-[13px] font-medium text-gray-800 placeholder-gray-500"
            placeholder="Search the incubator..."
          />
        </div>
        
        <button className="text-gray-500 hover:text-[#0a1b44] transition-colors relative">
          <Bell size={20} />
          <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
        </button>
        
        <Link href="/settings" className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[#0a1b44] transition-all">
          <img 
            src={user?.avatarUrl ? `http://localhost:8000${user.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=e2e8f0&color=0a1b44`} 
            alt={user?.name || "User"} 
            className="w-full h-full object-cover" 
          />
        </Link>
      </div>
    </header>
  );
}
