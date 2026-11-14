"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Briefcase, Mail } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { formatMembershipTitle, UserCompanyMembership } from "@/lib/companyTypes";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  bio: string | null;
  professionalTitle: string | null;
  avatarUrl: string | null;
  roles?: string[];
  companies?: UserCompanyMembership[];
  primaryCompany?: UserCompanyMembership | null;
}

export function ProfileView() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const { user } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:8000/api/profile/${id}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (user?.id === data.id) {
            router.replace(isAdmin ? "/admin/settings" : "/settings");
            return;
          }
          setProfile(data);
        } else {
          console.error("Failed to load profile");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, router, user?.id, isAdmin]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">User not found</p>
        <button onClick={() => router.back()} className="text-[#0a1b44] hover:underline flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go back
        </button>
      </div>
    );
  }

  const primaryCompany = profile.primaryCompany ?? profile.companies?.[0] ?? null;
  const displayTitle = primaryCompany
    ? formatMembershipTitle(primaryCompany.role, primaryCompany.title)
    : profile.professionalTitle;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
          <button 
            onClick={() => router.back()} 
            className="flex items-center text-sm font-medium text-gray-500 hover:text-[#0a1b44] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="h-32 sm:h-48 bg-gradient-to-r from-[#0a1b44] to-[#1a3673]"></div>
            
            <div className="px-6 pb-8 relative">
              <div className="flex justify-between items-end -mt-16 sm:-mt-24 mb-4">
                <div className="relative">
                  <img
                    src={profile.avatarUrl ? `http://localhost:8000${profile.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=e2e8f0&color=0a1b44&size=200`}
                    alt={profile.name}
                    className="w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 border-white shadow-md object-cover bg-white"
                  />
                </div>
                
                <button
                  onClick={() => router.push(isAdmin ? '/admin/messages' : '/messages')}
                  className="px-4 py-2 bg-[#0a1b44] text-white rounded-lg hover:bg-blue-900 transition-colors shadow-sm ml-4 mb-2 lg:mb-4 whitespace-nowrap hidden sm:block"
                >
                  Send Message
                </button>
              </div>
              
              <div className="sm:hidden mb-6">
                  <button
                    onClick={() => router.push(isAdmin ? '/admin/messages' : '/messages')}
                    className="w-full px-4 py-2 bg-[#0a1b44] text-white rounded-lg hover:bg-blue-900 transition-colors shadow-sm"
                  >
                    Send Message
                  </button>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{profile.name}</h1>
                {displayTitle && (
                  <div className="flex items-center text-gray-600 mt-2">
                    <Briefcase className="w-4 h-4 mr-2" />
                    <span>{displayTitle}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600 mt-2">
                  <Mail className="w-4 h-4 mr-2" />
                  <a href={`mailto:${profile.email}`} className="hover:underline">{profile.email}</a>
                </div>
              </div>

              {profile.bio && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}