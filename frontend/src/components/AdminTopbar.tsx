"use client";

import { useUser } from "@/contexts/UserContext";
import Link from "next/link";
import { Search, Bell, Zap, Menu } from "lucide-react";

export function AdminTopbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useUser();
  
  return (
    <header className="min-h-16 w-full flex items-center gap-3 px-4 py-3 bg-[#f8f9fc] sm:px-6 lg:h-[90px] lg:px-10 lg:py-0">
      <button
        type="button"
        aria-label="Open admin navigation"
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#0a1b44] shadow-sm lg:hidden"
      >
        <Menu size={20} />
      </button>
      
      {/* Global Search */}
      <div className="relative hidden min-w-0 flex-1 max-w-2xl sm:block">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <Search size={18} />
        </div>
        <input
          type="text"
          className="w-full pl-12 pr-4 py-3 bg-[#e9ecf3] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[14px] font-medium text-gray-800 placeholder-gray-500"
          placeholder="Search ventures or founders..."
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4 lg:gap-6">
        <button className="text-gray-500 hover:text-[#0a1b44] transition-colors relative p-2 rounded-full hover:bg-gray-100">
          <Bell size={20} />
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
        </button>

        <div className="hidden h-6 w-px bg-gray-200 sm:block"></div>
        
        <button className="hidden items-center gap-2 text-[13px] font-bold text-[#0a1b44] hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors md:flex">
          <Zap size={16} className="text-blue-600" />
          Quick Actions
        </button>

        <Link href={`/admin/profile/${user?.id}`} className="flex items-center gap-3 sm:pl-2 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-[13px] font-bold text-[#0a1b44]">{user?.name || "Loading..."}</span>
            <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">Administrator</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0 shadow-sm">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=0a1b44&color=fff`} alt={user?.name || "Admin"} className="w-full h-full object-cover" />
          </div>
        </Link>
      </div>
    </header>
  );
}
