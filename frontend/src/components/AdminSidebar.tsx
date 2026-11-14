"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building2,
  LayoutDashboard, 
  MessageSquare, 
  Users,
  LogOut,
  Rocket,
  X
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { MessageIcon, RequestsIcon, SettingsIcon } from "@/components/Icons";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Companies", href: "/admin/companies", icon: Building2 },
  { name: "Posts", href: "/admin/posts", icon: MessageSquare },
  { name: "Requests", href: "/admin/requests", icon: RequestsIcon },
  { name: "Messages", href: "/admin/messages", icon: MessageIcon },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Settings", href: "/admin/settings", icon: SettingsIcon },
];

export function AdminSidebar({
  isOpen = false,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { logout } = useUser();

  return (
    <>
      <button
        type="button"
        aria-label="Close admin navigation"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-[#0a1b44]/35 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-[280px] flex-col border-r border-gray-200 bg-[#f8f9fc] transition-transform duration-200 lg:static lg:z-20 lg:h-screen lg:w-[260px] lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 pt-7 lg:p-8 lg:pt-10">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0a1b44] text-white shadow-md shadow-blue-900/20">
          <Rocket size={20} className="-rotate-12" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-black text-[#0a1b44] tracking-tight uppercase leading-none">The Catalyst</h1>
          <p className="text-[10px] font-bold tracking-widest text-gray-400 mt-1 uppercase">Business Incubator</p>
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-[#0a1b44] lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 relative transition-all group ${
                isActive 
                  ? "text-[#0a1b44] font-bold" 
                  : "text-gray-500 hover:text-[#0a1b44] font-medium"
              }`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0a1b44] rounded-r-md"></div>
              )}
              <Icon size={18} className={isActive ? "text-[#0a1b44]" : "text-gray-400 group-hover:text-gray-600"} />
              <span className="text-[14px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 flex flex-col gap-4">
        <button 
          onClick={() => {
            onClose?.();
            logout();
          }}
          className="flex items-center gap-3 px-4 py-2 text-gray-500 hover:text-red-600 font-medium transition-colors"
        >
          <LogOut size={18} />
          <span className="text-[14px]">Logout</span>
        </button>
      </div>
      </aside>
    </>
  );
}
