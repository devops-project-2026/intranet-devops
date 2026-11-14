"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminTopbar } from "@/components/AdminTopbar";
import { UserProvider } from "@/contexts/UserContext";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <UserProvider>
      <div className="flex h-dvh overflow-hidden bg-[#f8f9fc]">
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <AdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="hide-scrollbar flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  );
}
