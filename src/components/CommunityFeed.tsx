"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Send, Image as ImageIcon, MoreHorizontal, Plus, TrendingUp, Sparkles, X, Paperclip, Download, Lock, Unlock, Clock, FileText, XCircle, Trash2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { formatMembershipTitle } from "@/lib/companyTypes";
import PostEngagement from "@/components/community/PostEngagement";

interface Attachment {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  accessType: string;
  requestStatus: string | null;
}

interface Post {
  id: number;
  content: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
  author: {
    id: number;
    name: string;
    roles: string[];
    avatarUrl: string | null;
    professionalTitle?: string | null;
    companyMembership?: { id: number; role: string; title: string | null; status: string } | null;
  };
  company: { id: number; name: string; stage: string; status: string; sector: string | null; cohort: string | null; logoUrl: string | null; } | null;
  attachments: Attachment[];
}

interface StoryGroup {
  author: { id: number; name: string; avatarUrl: string | null; };
  stories: { id: number; content: string; createdAt: string; expiresAt: string; }[];
}

interface CommentData {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; roles: string[]; };
}

const InlineImage = ({ attachmentId, token }: { attachmentId: number, token: string }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`http://localhost:8000/api/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.ok ? res.blob() : null)
    .then(blob => {
      if (blob) setSrc(URL.createObjectURL(blob));
    })
    .catch(console.error);
  }, [attachmentId, token]);

  if (!src) return <div className="w-full h-48 bg-gray-100 animate-pulse rounded-xl my-2"></div>;
  return <img src={src} alt="Attached image" className="w-full max-h-[400px] object-contain bg-gray-50 rounded-xl my-2 border border-gray-100" />;
};

const ACTIVE_FOUNDERS = [
  { name: "David K.", detail: "Fintech • Cohort 8", img: "https://i.pravatar.cc/150?img=33" },
  { name: "Elena M.", detail: "SaaS • Cohort 12", img: "https://i.pravatar.cc/150?img=23" },
  { name: "Alex J.", detail: "AI • Cohort 15", img: "https://i.pravatar.cc/150?img=8" },
];

export default function CommunityFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const { user } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [viewingStory, setViewingStory] = useState<StoryGroup | null>(null);
  const [viewingStoryIdx, setViewingStoryIdx] = useState(0);
  const [expandedComments, setExpandedComments] = useState<number | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState("");
  const [uploadFiles, setUploadFiles] = useState<{file: File; accessType: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  const [now] = useState(() => Date.now());
  const getProfileLink = (id: number) => {
    if (user?.id === id) return isAdmin ? "/admin/settings" : "/settings";
    return isAdmin ? `/admin/profile/${id}` : `/profile/${id}`;
  };

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/api/posts", { headers });
      if (res.ok) setPosts(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [headers]);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/api/stories", { headers });
      if (res.ok) setStoryGroups(await res.json());
    } catch (e) { console.error(e); }
  }, [headers]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchPosts(); void fetchStories(); }, [fetchPosts, fetchStories]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/api/posts", {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, companyId: user?.primaryCompany?.id })
      });
      if (res.ok) {
        const p = await res.json();
        console.log('Post created with ID:', p.id, 'Files to upload:', uploadFiles.length);
        // Upload files if any
        for (const uf of uploadFiles) {
          const formData = new FormData();
          formData.append('file', uf.file);
          formData.append('accessType', uf.accessType);
          console.log('Uploading file:', uf.file.name, 'accessType:', uf.accessType);
          const uploadRes = await fetch(`http://localhost:8000/api/posts/${p.id}/attachments`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
          });
          
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            alert(`Failed to upload ${uf.file.name}: ${errData.message || uploadRes.statusText}`);
          }
        }
        setUploadFiles([]);
        setContent("");
        setShowComposer(false);
        fetchPosts();
      } else {
        alert('Failed to create post. Please try again.');
      }
    } catch (e) { 
      console.error('Post submit error:', e); 
      alert('A network error occurred. Please try again.');
    }
    finally { setIsSubmitting(false); }
  };

  const deletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== postId));
      } else {
        alert('Failed to delete post.');
      }
    } catch (e) {
      console.error(e);
      alert('A network error occurred while trying to delete the post.');
    }
  };

  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyText.trim()) return;
    try {
      const res = await fetch("http://localhost:8000/api/stories", { method: 'POST', headers, body: JSON.stringify({ content: storyText }) });
      if (res.ok) { setStoryText(""); setShowStoryModal(false); fetchStories(); }
    } catch (e) { console.error(e); }
  };

  const deleteStory = async (storyId: number) => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setViewingStory(null);
        fetchStories();
      } else {
        alert('Failed to delete story.');
      }
    } catch (e) {
      console.error(e);
      alert('A network error occurred while trying to delete the story.');
    }
  };

  const toggleLike = async (postId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/posts/${postId}/like`, { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(p => p.id === postId ? { ...p, likeCount: data.likeCount, userLiked: data.liked } : p));
      }
    } catch (e) { console.error(e); }
  };

  const toggleComments = async (postId: number) => {
    if (expandedComments === postId) { setExpandedComments(null); return; }
    setExpandedComments(postId);
    try {
      const res = await fetch(`http://localhost:8000/api/posts/${postId}/comments`, { headers });
      if (res.ok) setComments(await res.json());
    } catch (e) { console.error(e); }
  };

  const submitComment = async (postId: number) => {
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/api/posts/${postId}/comments`, { method: 'POST', headers, body: JSON.stringify({ content: commentText }) });
      if (res.ok) {
        const c = await res.json();
        setComments([...comments, c]);
        setCommentText("");
        setPosts(posts.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
      }
    } catch (e) { console.error(e); }
  };

  const getFallbackRoleName = (roles: string[]) => {
    if (roles.includes("ROLE_ADMIN")) return "Program Director";
    return "Founder";
  };

  const getPostAuthorTitle = (post: Post) => {
    if (post.author.companyMembership) {
      return formatMembershipTitle(post.author.companyMembership.role, post.author.companyMembership.title);
    }

    return post.author.professionalTitle || getFallbackRoleName(post.author.roles);
  };

  const getTimeAgo = (d: string) => {
    const ms = now - new Date(d).getTime();
    if (ms < 60000) return "Just now";
    if (ms < 3600000) return `${Math.floor(ms/60000)}m ago`;
    if (ms < 86400000) return `${Math.floor(ms/3600000)}h ago`;
    return `${Math.floor(ms/86400000)}d ago`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const requestAccess = async (attachmentId: number) => {
    try {
      await fetch(`http://localhost:8000/api/attachments/${attachmentId}/request`, { method: 'POST', headers });
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  const downloadFile = async (attachmentId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/attachments/${attachmentId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        a.click();
        URL.revokeObjectURL(url);
      } else { alert('Download failed or access denied.'); }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-[680px] mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">Community Feed</h1>
              <p className="text-[14px] text-gray-500 mt-1">Connect, collaborate, and grow with the Catalyst community.</p>
            </div>
            <button onClick={() => setShowComposer(!showComposer)} className="bg-[#0a1b44] text-white px-5 py-3 rounded-full text-[13px] font-bold hover:bg-[#11265c] transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20 flex-shrink-0">
              <Plus size={16} /> New Venture Post
            </button>
          </div>

          {/* Stories Row */}
          <div className="hide-scrollbar flex items-center gap-5 mb-8 overflow-x-auto pb-2">
            <div onClick={() => setShowStoryModal(true)} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 group-hover:border-[#0a1b44] flex items-center justify-center text-gray-400 group-hover:text-[#0a1b44] transition-colors bg-gray-50">
                <Plus size={20} />
              </div>
              <span className="text-[11px] font-bold text-gray-600">Your Story</span>
            </div>
            {storyGroups.map((sg) => (
              <div key={sg.author.id} onClick={() => { setViewingStory(sg); setViewingStoryIdx(0); }} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
                <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-br from-[#0a1b44] to-indigo-500">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(sg.author.name)}&background=random`} alt={sg.author.name} className="w-full h-full rounded-full object-cover border-2 border-white" />
                </div>
                <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 truncate max-w-[64px] text-center">{sg.author.name.split(' ')[0]}</span>
              </div>
            ))}
          </div>

          {/* Composer */}
          {showComposer && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <form onSubmit={handlePostSubmit}>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share an update with the community..." className="w-full bg-[#f8f9fc] border border-gray-100 rounded-xl p-4 text-[14px] text-gray-800 focus:ring-2 focus:ring-[#0a1b44] outline-none min-h-[120px] resize-none" autoFocus />
                {user?.primaryCompany && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-[11px] font-bold">
                    Posting as {user.primaryCompany.name}
                  </div>
                )}
                
                {/* File Upload Area */}
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
                  if (e.target.files) {
                    const newFiles = [];
                    for (const f of Array.from(e.target.files)) {
                      if (f.size > 2 * 1024 * 1024) {
                        alert(`File ${f.name} is too large. Maximum size is 2MB.`);
                      } else {
                        newFiles.push({ file: f, accessType: 'public' });
                      }
                    }
                    setUploadFiles([...uploadFiles, ...newFiles]);
                  }
                }} />
                
                <input type="file" accept="image/*" id="imageInput" className="hidden" multiple onChange={(e) => {
                  if (e.target.files) {
                    const newFiles = [];
                    for (const f of Array.from(e.target.files)) {
                      if (f.size > 2 * 1024 * 1024) {
                        alert(`Image ${f.name} is too large. Maximum size is 2MB.`);
                      } else {
                        newFiles.push({ file: f, accessType: 'public' });
                      }
                    }
                    setUploadFiles([...uploadFiles, ...newFiles]);
                  }
                }} />
                
                {uploadFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadFiles.map((uf, i) => {
                      const isImage = uf.file.type.startsWith('image/');
                      return (
                        <div key={i} className="flex items-center gap-3 bg-[#f8f9fc] rounded-xl p-3 border border-gray-100">
                          {isImage ? <ImageIcon size={18} className="text-purple-500 flex-shrink-0" /> : <FileText size={18} className="text-indigo-500 flex-shrink-0" />}
                          <span className="text-[13px] font-medium text-gray-700 flex-1 truncate">{uf.file.name}</span>
                          <button type="button" onClick={() => {
                            const updated = [...uploadFiles];
                            updated[i] = { ...updated[i], accessType: uf.accessType === 'public' ? 'private' : 'public' };
                            setUploadFiles(updated);
                          }} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold ${uf.accessType === 'public' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {uf.accessType === 'public' ? <><Unlock size={12} /> Public</> : <><Lock size={12} /> Private</>}
                          </button>
                          <button type="button" onClick={() => setUploadFiles(uploadFiles.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><XCircle size={16} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 gap-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => document.getElementById('imageInput')?.click()} className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200">
                      <ImageIcon size={16} className="text-purple-500" /> Image
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200">
                      <Paperclip size={16} /> Attach File
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setShowComposer(false); setUploadFiles([]); }} className="px-5 py-2.5 text-[13px] font-bold text-gray-600 hover:bg-gray-50 rounded-xl">Cancel</button>
                    <button type="submit" disabled={isSubmitting || (!content.trim() && uploadFiles.length === 0)} className="bg-[#0a1b44] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#11265c] flex items-center gap-2 shadow-md disabled:opacity-50">
                      {isSubmitting ? 'Publishing...' : 'Publish'} <Send size={16} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Posts */}
          <div className="space-y-6">
            {isLoading ? <div className="text-center py-10 text-gray-400">Loading feed...</div>
            : posts.length === 0 ? <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed"><p className="font-bold">No posts yet. Be the first!</p></div>
            : posts.map((post) => {
              const lines = post.content.split('\n');
              const firstLine = lines[0];
              const rest = lines.slice(1).join('\n').trim();
              const isTitle = firstLine.length < 120 && firstLine.length > 10;

              return (
                <article key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 pt-6 pb-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={post.author.avatarUrl ? `http://localhost:8000${post.author.avatarUrl}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name)}&background=random`} 
                          alt="" 
                          className="w-11 h-11 rounded-full border-2 border-gray-100 object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                          onClick={() => router.push(getProfileLink(post.author.id))}
                        />
                        <div>
                          <h3 
                            className="text-[14px] font-bold text-gray-900 cursor-pointer hover:text-[#0a1b44] hover:underline"
                            onClick={() => router.push(getProfileLink(post.author.id))}
                          >
                            {post.author.name}
                          </h3>
                          <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">{getPostAuthorTitle(post)} • {getTimeAgo(post.createdAt)}</p>
                          {post.company && (
                            <Link href={`/companies/${post.company.id}`} className="inline-flex mt-1 text-[11px] font-bold text-blue-700 hover:underline">
                              {post.company.name}
                            </Link>
                          )}
                        </div>
                      </div>
                      {post.author.id === user?.id && (
                        <div className="relative">
                          <button onClick={() => setActiveDropdownId(activeDropdownId === post.id ? null : post.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                          {activeDropdownId === post.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveDropdownId(null)}></div>
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                                <button onClick={() => { setActiveDropdownId(null); deletePost(post.id); }} className="w-full text-left px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <Trash2 size={14} /> Delete Post
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {isTitle ? (
                      <>
                        <h2 className="text-[18px] font-bold text-gray-900 leading-snug mb-3">{firstLine}</h2>
                        {rest && <p className="text-[14px] text-gray-600 leading-relaxed mb-2">{rest.length > 200 ? rest.slice(0, 200) + '...' : rest}</p>}
                      </>
                    ) : (
                      <p className="text-[14px] text-gray-600 leading-relaxed mb-2 whitespace-pre-wrap">{post.content.length > 280 ? post.content.slice(0, 280) + '...' : post.content}</p>
                    )}
                  </div>

                  {/* Attachments */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="px-6 pb-3 space-y-2">
                      {post.attachments.map(att => {
                        const isOwner = post.author.id === user?.id;
                        const isImage = att.mimeType?.startsWith('image/');
                        const hasAccess = att.accessType === 'public' || isOwner || att.requestStatus === 'approved';

                        if (isImage && hasAccess) {
                          return (
                            <div key={att.id} className="relative group">
                              <InlineImage attachmentId={att.id} token={token || ''} />
                              <button onClick={() => downloadFile(att.id)} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                <Download size={16} />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={att.id} className="bg-[#f8f9fc] rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isImage ? 'bg-purple-50 text-purple-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-gray-900 truncate">{att.fileName}</p>
                                <p className="text-[11px] text-gray-400">{formatFileSize(att.fileSize)} • {att.accessType === 'public' ? '🔓 Public' : '🔒 Private'}</p>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-3">
                              {att.accessType === 'public' || isOwner ? (
                                <button onClick={() => downloadFile(att.id)} className="flex items-center gap-1.5 text-[11px] font-bold text-[#0a1b44] bg-white px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                                  <Download size={14} /> Download
                                </button>
                              ) : att.requestStatus === 'approved' ? (
                                <button onClick={() => downloadFile(att.id)} className="flex items-center gap-1.5 text-[11px] font-bold text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                                  <Download size={14} /> Download
                                </button>
                              ) : att.requestStatus === 'pending' ? (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                                  <Clock size={14} /> Pending
                                </span>
                              ) : att.requestStatus === 'rejected' ? (
                                <span className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">Denied</span>
                              ) : (
                                <button onClick={() => requestAccess(att.id)} className="flex items-center gap-1.5 text-[11px] font-bold text-[#0a1b44] bg-white px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                                  <Lock size={14} /> Request Access
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <PostEngagement
                    postId={post.id}
                    commentCount={post.commentCount}
                    likeCount={post.likeCount}
                    userLiked={post.userLiked}
                    expanded={expandedComments === post.id}
                    comments={comments}
                    commentText={commentText}
                    onToggleComments={toggleComments}
                    onToggleLike={toggleLike}
                    onCommentTextChange={setCommentText}
                    onSubmitComment={submitComment}
                    onAuthorClick={(authorId) => router.push(getProfileLink(authorId))}
                    getTimeAgo={getTimeAgo}
                  />
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hide-scrollbar min-h-0 w-[300px] bg-white border-l border-gray-100 p-6 hidden lg:flex flex-col gap-6 overflow-y-auto flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-5">Incubator Pulse</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] text-gray-500">Weekly Posts</p><p className="text-[28px] font-black text-gray-900 leading-none mt-1">{posts.length > 0 ? posts.length : 0}</p></div>
              <svg viewBox="0 0 64 32" className="w-16 h-10"><polyline fill="none" stroke="#0a1b44" strokeWidth="2" strokeLinecap="round" points="0,28 8,22 16,24 24,16 32,18 40,10 48,12 56,6 64,8" /></svg>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-[11px] text-gray-500">Active Now</p><p className="text-[28px] font-black text-gray-900 leading-none mt-1">54</p></div>
              <svg viewBox="0 0 64 32" className="w-16 h-10"><polyline fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" points="0,20 10,16 20,22 30,14 40,18 50,8 64,12" /></svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Active Founders</h3>
          <div className="space-y-4">{ACTIVE_FOUNDERS.map(f => (
            <div key={f.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3"><img src={f.img} alt="" className="w-9 h-9 rounded-full border border-gray-100" /><div><p className="text-[13px] font-bold text-gray-900">{f.name}</p><p className="text-[11px] text-gray-400">{f.detail}</p></div></div>
              <button className="text-[11px] font-bold text-[#0a1b44] hover:underline">Message</button>
            </div>
          ))}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Trending Now</h3><TrendingUp size={14} className="text-gray-400" /></div>
          <div className="space-y-3">
            <div><p className="text-[11px] text-gray-500">Fundraising • 1.2k posts</p><p className="text-[13px] font-bold text-gray-900">#SeriesARound</p></div>
            <div><p className="text-[11px] text-gray-500">Strategy • 842 posts</p><p className="text-[13px] font-bold text-gray-900">#ProductMarketFit</p></div>
            <div><p className="text-[11px] text-gray-500">Hiring • 650 posts</p><p className="text-[13px] font-bold text-gray-900">#TalentWar</p></div>
          </div>
        </div>
        <div className="bg-[#0a1b44] rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30"></div>
          <div className="relative z-10"><Sparkles size={20} className="text-blue-300 mb-4" /><h4 className="text-[16px] font-bold mb-2">Founder&apos;s Toolkit</h4><p className="text-[12px] text-blue-200 mb-5 leading-relaxed">Get access to exclusive legal templates and VC pitch structures.</p><button className="bg-white text-[#0a1b44] px-5 py-2.5 rounded-xl text-[12px] font-bold hover:bg-gray-50">Explore Library</button></div>
        </div>
      </div>

      {/* Add Story Modal */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-[#0a1b44]/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-[440px] rounded-[24px] shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-[18px] font-bold text-gray-900">Add Your Story</h2>
              <button onClick={() => setShowStoryModal(false)} className="text-gray-400 hover:text-gray-900"><X size={20} /></button>
            </div>
            <form onSubmit={handleStorySubmit} className="p-6">
              <p className="text-[12px] text-gray-500 mb-3">Your story will be visible for 24 hours.</p>
              <textarea value={storyText} onChange={(e) => setStoryText(e.target.value)} placeholder="What's on your mind right now?" className="w-full bg-[#f8f9fc] border border-gray-200 rounded-xl p-4 text-[14px] text-gray-800 focus:ring-2 focus:ring-[#0a1b44] outline-none min-h-[120px] resize-none" autoFocus />
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowStoryModal(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-[14px] font-bold hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={!storyText.trim()} className="flex-1 px-4 py-3 bg-[#0a1b44] text-white rounded-xl text-[14px] font-bold hover:bg-[#11265c] shadow-md disabled:opacity-50">Share Story</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Story Modal */}
      {viewingStory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setViewingStory(null)}>
          <div className="bg-gradient-to-b from-[#0a1b44] to-[#040b1e] w-[400px] min-h-[500px] rounded-[24px] p-8 text-white relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewingStory(null)} className="absolute top-4 right-4 text-white/60 hover:text-white"><X size={24} /></button>
            <div className="flex items-center gap-3 mb-2 pr-6 border-transparent">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(viewingStory.author.name)}&background=random`} alt="" className="w-10 h-10 rounded-full border-2 border-white/30" />
              <div className="flex-1 text-left"><p className="font-bold text-[14px]">{viewingStory.author.name}</p><p className="text-[11px] text-blue-300">{getTimeAgo(viewingStory.stories[viewingStoryIdx].createdAt)}</p></div>
              {(user?.id === viewingStory.author.id || isAdmin) && (
                <button onClick={() => deleteStory(viewingStory.stories[viewingStoryIdx].id)} className="text-red-400 hover:text-red-300 bg-red-400/10 p-2 rounded-full mt-1 ml-auto">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {/* Progress bars */}
            <div className="flex gap-1 mb-8">{viewingStory.stories.map((_, i) => (<div key={i} className={`flex-1 h-1 rounded-full ${i <= viewingStoryIdx ? 'bg-white' : 'bg-white/20'}`} />))}</div>
            <div className="flex-1 flex items-center justify-center py-12">
              <p className="text-[18px] leading-relaxed text-center font-medium">{viewingStory.stories[viewingStoryIdx].content}</p>
            </div>
            {viewingStory.stories.length > 1 && (
              <div className="flex justify-between mt-8">
                <button onClick={() => setViewingStoryIdx(Math.max(0, viewingStoryIdx - 1))} disabled={viewingStoryIdx === 0} className="text-white/60 hover:text-white text-[13px] font-bold disabled:opacity-30">← Previous</button>
                <button onClick={() => { if (viewingStoryIdx < viewingStory.stories.length - 1) setViewingStoryIdx(viewingStoryIdx + 1); else setViewingStory(null); }} className="text-white/60 hover:text-white text-[13px] font-bold">
                  {viewingStoryIdx < viewingStory.stories.length - 1 ? 'Next →' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
