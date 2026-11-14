"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { Camera, User, ToggleRight, Rocket, Loader2, MessageSquare, Heart, Trash2 } from "lucide-react";
import { getCompanyProfessionalTitle } from "@/lib/companyTypes";
import Link from "next/link";

interface MyPost {
  id: number;
  content: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

export default function SettingsPage() {
  const { user, updateProfile } = useUser();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [professionalTitle, setProfessionalTitle] = useState(user?.professionalTitle || "");
  
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const timeoutId = window.setTimeout(async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:8000/api/posts/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok && isMounted) {
          setMyPosts(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsLoadingPosts(false);
      }
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const deletePost = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:8000/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMyPosts((posts) => posts.filter(p => p.id !== postId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  const companyProfessionalTitle = getCompanyProfessionalTitle(user.primaryCompany);
  const displayedProfessionalTitle = companyProfessionalTitle || professionalTitle || "Member";

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:8000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          bio,
          ...(user.primaryCompany ? {} : { professionalTitle }),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        updateProfile(data);
        alert("Profile updated successfully!");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("http://localhost:8000/api/profile/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        updateProfile({ avatarUrl: data.avatarUrl });
      }
    } catch (error) {
      console.error(error);
      alert("Failed to upload avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-10 py-10 bg-[#f8f9fc] h-full">
      <div className="max-w-[1000px] mx-auto">
        
        {/* Header & Tabs */}
        <div className="mb-10">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-[36px] font-bold text-gray-900 leading-tight tracking-tight">
                Profile & Settings
              </h1>
              <p className="text-[15px] text-gray-500 mt-2 max-w-2xl">
                Manage your identity and see your community activity.
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setName(user.name); setBio(user.bio || ""); setProfessionalTitle(user.professionalTitle || ""); }} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full text-[14px] font-bold hover:bg-gray-50 transition-colors shadow-sm">
                Discard Changes
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-8 py-2.5 bg-[#0a1b44] text-white rounded-full text-[14px] font-bold hover:bg-[#11265c] transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Save Profile
              </button>
            </div>
          </div>

          <div className="flex gap-8 border-b border-gray-200">
            <button className="pb-4 text-[14px] font-bold text-[#0a1b44] border-b-2 border-[#0a1b44]">Profile</button>
            <button className="pb-4 text-[14px] font-bold text-gray-500 hover:text-gray-900 transition-colors">Security</button>
            <button className="pb-4 text-[14px] font-bold text-gray-500 hover:text-gray-900 transition-colors">Notifications</button>
            <button className="pb-4 text-[14px] font-bold text-gray-500 hover:text-gray-900 transition-colors">Account Activity</button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex gap-8">
          
          {/* Left Column (Forms & Posts) */}
          <div className="flex-1 space-y-8">
            
            {/* Public Profile Form */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <User size={20} />
                </div>
                <h2 className="text-[18px] font-bold text-gray-900">Personal Information</h2>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#e9ecf3] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[14px] font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">Professional Title</label>
                  <input 
                    type="text" 
                    value={companyProfessionalTitle || professionalTitle} 
                    onChange={(e) => setProfessionalTitle(e.target.value)}
                    disabled={Boolean(companyProfessionalTitle)}
                    placeholder="e.g. Founder at GreenTrust"
                    className="w-full px-4 py-3 bg-[#e9ecf3] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[14px] font-medium text-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mb-6">
                  <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue={user.email} 
                    disabled
                    className="w-full px-4 py-3 bg-[#e9ecf3]/60 border-none rounded-xl outline-none text-[14px] font-medium text-gray-500 cursor-not-allowed"
                  />
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-widest text-gray-800 uppercase mb-2">Professional Bio</label>
                <textarea 
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your venture and background..."
                  className="w-full px-4 py-4 bg-[#e9ecf3] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[14px] font-medium text-gray-800 resize-none leading-relaxed"
                ></textarea>
              </div>
            </div>

            {/* My Posts Section */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <MessageSquare size={20} />
                </div>
                <h2 className="text-[18px] font-bold text-gray-900">My Community Posts</h2>
              </div>

              <div className="space-y-4">
                {isLoadingPosts ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  </div>
                ) : myPosts.length === 0 ? (
                  <p className="text-center py-10 text-gray-500 text-[14px]">You haven&apos;t posted anything yet.</p>
                ) : (
                  myPosts.map((post) => (
                    <div key={post.id} className="p-4 bg-[#f8f9fc] rounded-2xl border border-gray-100 flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[14px] text-gray-800 mb-2 line-clamp-2 leading-relaxed">{post.content}</p>
                        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5"><Heart size={12} /> {post.likeCount}</span>
                          <span className="flex items-center gap-1.5"><MessageSquare size={12} /> {post.commentCount}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deletePost(post.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Widgets) */}
          <div className="w-[340px] space-y-8 flex-shrink-0">
            
            {/* Profile Picture Card */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full border-[8px] border-[#f8f9fc] overflow-hidden bg-gray-200">
                  <img 
                    src={user.avatarUrl ? `http://localhost:8000${user.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e2e8f0&color=0a1b44&size=200`} 
                    alt={user.name} 
                    className="w-full h-full object-cover" 
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={24} className="text-white animate-spin" />
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarChange}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 w-9 h-9 bg-[#0a1b44] text-white rounded-full flex items-center justify-center border-4 border-white shadow-md hover:bg-[#11265c] transition-colors"
                >
                  <Camera size={16} />
                </button>
              </div>
              <h3 className="text-[18px] font-bold text-gray-900 mb-1">{user.name}</h3>
              <p className="text-[13px] text-gray-500 mb-6 font-medium">{displayedProfessionalTitle}</p>
              <p className="text-[11px] text-gray-400 leading-relaxed px-4">
                JPG or PNG. Max size 5MB. Square images work best.
              </p>
            </div>

            {/* Notification & Security Hub */}
            <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
              <h3 className="text-[16px] font-bold text-gray-900 mb-6">Security & Preferences</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[13px] font-bold text-gray-900">Two-Factor Auth</h4>
                    <p className="text-[11px] text-gray-500">{twoFactorEnabled ? "Currently enabled" : "Disabled"}</p>
                  </div>
                  <button onClick={() => setTwoFactorEnabled(!twoFactorEnabled)} className="text-[#0a1b44]">
                    <ToggleRight size={32} className={twoFactorEnabled ? "text-[#0a1b44]" : "text-gray-300"} />
                  </button>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <h4 className="text-[13px] font-bold text-gray-900 mb-3">Password Management</h4>
                  <p className="text-[11px] text-gray-500 mb-4">
                    Send a code to your email to safely reset your password.
                  </p>
                  <Link 
                    href="/forgot-password?from=profile" 
                    className="flex justify-center w-full px-4 py-2.5 bg-[#f1f3f6] text-[#0a1b44] rounded-xl text-[13px] font-bold hover:bg-gray-200 transition-colors"
                  >
                    Reset Password
                  </Link>
                </div>
              </div>
            </div>

            {/* Status Widget */}
            <div className="bg-[#0a1b44] rounded-[24px] p-8 text-white relative overflow-hidden shadow-lg shadow-blue-900/10">
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <Rocket size={24} className="text-blue-300" />
                <h3 className="text-[16px] font-bold text-white">Founder Hub</h3>
              </div>
              <p className="text-[13px] text-blue-200 leading-relaxed relative z-10">
                Level: <span className="font-bold text-white">Seed Cohort</span>. You are making great progress!
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
