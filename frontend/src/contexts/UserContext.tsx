"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthorizedRedirectPath } from "@/lib/authRoutes";
import { UserCompanyMembership } from "@/lib/companyTypes";

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  avatarUrl?: string;
  bio?: string;
  professionalTitle?: string | null;
  companies?: UserCompanyMembership[];
  primaryCompany?: UserCompanyMembership | null;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("http://localhost:8000/api/user/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }

        const data = await res.json();
        setUser(data);
      } catch (error) {
        console.error(error);
        localStorage.removeItem("token");
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (isLoading || !user) return;

    const redirectPath = getAuthorizedRedirectPath(pathname, user.roles);
    if (redirectPath) {
      router.replace(redirectPath);
    }
  }, [isLoading, pathname, router, user]);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.replace("/login");
  };

  const updateProfile = async (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const redirectPath = user ? getAuthorizedRedirectPath(pathname, user.roles) : null;

  if (isLoading || redirectPath) {
    return (
      <div className="min-h-screen w-full bg-white" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <UserContext.Provider value={{ user, isLoading, logout, setUser, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
