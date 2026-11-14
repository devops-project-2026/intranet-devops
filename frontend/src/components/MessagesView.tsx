"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCheck, Download, FileText, Image as ImageIcon, Mail, MessageSquare, Paperclip, Plus, Search, Send, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface Contact {
  id: number;
  name: string;
  email: string;
  roles: string[];
  avatarUrl: string | null;
  status: string | null;
}

interface Attachment {
  id: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  };
  attachments: Attachment[];
}

const API_BASE = "http://localhost:8000";

export function MessagesView() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const getProfileLink = (id: number) => {
    if (user?.id === id) return isAdmin ? "/admin/settings" : "/settings";
    return isAdmin ? `/admin/profile/${id}` : `/profile/${id}`;
  };

  const filteredContacts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return contacts;

    return contacts.filter((contact) =>
      [contact.name, contact.email, getRoleLabel(contact.roles)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [contacts, searchTerm]);

  const sharedAttachments = useMemo(
    () => messages.flatMap((message) => message.attachments ?? []),
    [messages],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/messages/contacts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: Contact[] = await res.json();
          setContacts(data);
          setSelectedContact((current) => current ?? data[0] ?? null);
        }
      } catch (error) {
        console.error("Failed to fetch contacts", error);
      }
    };

    if (token) void fetchContacts();
  }, [token]);

  useEffect(() => {
    if (!selectedContact || !token) return;

    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/messages/${selectedContact.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          setMessages(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    };

    void fetchMessages();
    const interval = window.setInterval(fetchMessages, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [selectedContact, token]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setSelectedFiles((current) => [...current, ...Array.from(files)]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && selectedFiles.length === 0) || !selectedContact || !user || !token) return;

    setIsSending(true);
    const contentToSend = inputText.trim();
    const filesToSend = selectedFiles;
    setInputText("");
    setSelectedFiles([]);
    setSendError("");

    try {
      const hasFiles = filesToSend.length > 0;
      const body = hasFiles ? new FormData() : JSON.stringify({ content: contentToSend });
      const headers: HeadersInit = hasFiles
        ? { Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

      if (body instanceof FormData) {
        body.append("content", contentToSend);
        filesToSend.forEach((file) => body.append("files[]", file));
      }

      const res = await fetch(`${API_BASE}/api/messages/${selectedContact.id}`, {
        method: "POST",
        headers,
        body,
      });

      if (res.ok) {
        const sentMessage: Message = await res.json();
        setMessages((prev) => [...prev.filter((message) => message.id !== sentMessage.id), sentMessage]);
      } else {
        const data = await res.json().catch(() => ({}));
        const message = data.message || `Failed to send message (${res.status})`;
        setInputText(contentToSend);
        setSelectedFiles(filesToSend);
        setSendError(message);
        console.warn("Message send failed", { status: res.status, message });
      }
    } catch (error) {
      setInputText(contentToSend);
      setSelectedFiles(filesToSend);
      setSendError("Could not reach the message server.");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/messages/attachments/${attachment.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#f8f9fc]">
      <div className="w-[320px] bg-[#f8f9fc] border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[22px] font-bold text-gray-900">Messages</h2>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#e9ecf3] border-none rounded-xl focus:ring-2 focus:ring-[#0a1b44] outline-none text-[13px] font-medium text-gray-800 placeholder-gray-500"
              placeholder="Search contacts..."
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          {filteredContacts.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-gray-400">No contacts found.</div>
          ) : filteredContacts.map((contact) => (
            <button
              type="button"
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${selectedContact?.id === contact.id ? "bg-white shadow-sm border border-gray-100" : "hover:bg-white/50"}`}
            >
              <Avatar user={contact} size="md" active={selectedContact?.id === contact.id} />
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] font-bold text-gray-900 truncate">{contact.name}</h4>
                <p className="text-[12px] text-gray-500 truncate">{getRoleLabel(contact.roles)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedContact ? (
          <>
            <div className="h-[90px] border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
              <div className="flex items-center gap-4">
                <button type="button" className="relative" onClick={() => router.push(getProfileLink(selectedContact.id))}>
                  <Avatar user={selectedContact} size="md" active />
                </button>
                <div>
                  <h2
                    className="text-[16px] font-bold text-gray-900 cursor-pointer hover:text-[#0a1b44] hover:underline"
                    onClick={() => router.push(getProfileLink(selectedContact.id))}
                  >
                    {selectedContact.name}
                  </h2>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedContact.status === "Inactive" ? "bg-gray-400" : "bg-green-500"}`} />
                    {selectedContact.status === "Inactive" ? "Offline" : "Online"} - {getRoleLabel(selectedContact.roles)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-20">
                  <p>No messages yet. Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = msg.sender.id === user?.id;
                  const prev = messages[index - 1];
                  const showDateHeader = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();

                  return (
                    <div key={msg.id}>
                      {showDateHeader && (
                        <div className="text-center my-6">
                          <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                            {new Date(msg.createdAt).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                          </span>
                        </div>
                      )}

                      <div className={`flex gap-4 ${isMe ? "justify-end" : "max-w-[80%]"}`}>
                        {!isMe && (
                          <button type="button" className="mt-auto mb-6" onClick={() => router.push(getProfileLink(msg.sender.id))}>
                            <Avatar user={msg.sender} size="sm" />
                          </button>
                        )}
                        <div className={`${isMe ? "max-w-[70%]" : ""}`}>
                          <div className={`p-4 text-[14px] leading-relaxed mb-1 shadow-sm space-y-3 ${
                            isMe
                              ? "bg-[#0a1b44] text-white rounded-2xl rounded-br-none shadow-blue-900/10"
                              : "bg-[#f1f3f6] text-gray-800 rounded-2xl rounded-bl-none border border-gray-100"
                          }`}>
                            {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                            {msg.attachments?.map((attachment) => (
                              <MessageAttachmentView
                                key={attachment.id}
                                attachment={attachment}
                                token={token}
                                isMe={isMe}
                                onDownload={() => downloadAttachment(attachment)}
                              />
                            ))}
                          </div>
                          <div className={`flex items-center gap-1.5 ${isMe ? "justify-end mr-1" : "ml-1"}`}>
                            <span className="text-[10px] font-medium text-gray-400">
                              {isMe ? "You" : msg.sender.name} - {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isMe && <CheckCheck size={14} className="text-blue-500" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-100 flex-shrink-0 bg-white">
              {sendError && (
                <div className="mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-[12px] font-bold text-red-700">
                  {sendError}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 bg-[#f4f6fa] border border-gray-200 rounded-xl px-3 py-2 max-w-[260px]">
                      {file.type.startsWith("image/") ? <ImageIcon size={16} className="text-blue-600 flex-shrink-0" /> : <FileText size={16} className="text-gray-500 flex-shrink-0" />}
                      <span className="text-[12px] font-bold text-gray-700 truncate">{file.name}</span>
                      <button type="button" onClick={() => removeSelectedFile(index)} className="text-gray-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-[#f4f6fa] rounded-full p-2 pl-4 flex items-center border border-gray-200">
                <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => addFiles(e.target.files)} />
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" multiple onChange={(e) => addFiles(e.target.files)} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-[#0a1b44] rounded-full hover:bg-white transition-colors">
                  <Plus size={20} />
                </button>
                <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-500 hover:text-[#0a1b44] rounded-full hover:bg-white transition-colors mr-2">
                  <ImageIcon size={20} />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Type a message to ${selectedContact.name}...`}
                  className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-gray-800 placeholder-gray-400 px-2"
                />

                <button
                  type="submit"
                  disabled={isSending || (!inputText.trim() && selectedFiles.length === 0)}
                  className="w-10 h-10 bg-[#0a1b44] text-white rounded-full flex items-center justify-center ml-2 hover:bg-[#11265c] transition-colors shadow-md disabled:opacity-50"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
            <MessageSquare size={48} className="opacity-20" />
            <p>Select a contact to start messaging</p>
          </div>
        )}
      </div>

      {selectedContact && (
        <div className="w-[300px] bg-[#f8f9fc] border-l border-gray-100 overflow-y-auto flex-shrink-0 hidden lg:block">
          <div className="p-8 flex flex-col items-center border-b border-gray-100">
            <button type="button" onClick={() => router.push(getProfileLink(selectedContact.id))}>
              <Avatar user={selectedContact} size="lg" active />
            </button>
            <h2 className="text-[18px] font-bold text-gray-900 mt-4 mb-1">{selectedContact.name}</h2>
            <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4 text-center">{getRoleLabel(selectedContact.roles)}</p>
            <span className={`${selectedContact.status === "Inactive" ? "bg-gray-200 text-gray-700" : "bg-green-100 text-green-700"} text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5`}>
              <div className={`w-1.5 h-1.5 rounded-full ${selectedContact.status === "Inactive" ? "bg-gray-500" : "bg-green-500"}`} />
              {selectedContact.status === "Inactive" ? "Offline" : "Available"}
            </span>
          </div>

          <div className="p-6">
            <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Contact Information</h3>
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400" />
                <span className="text-[13px] font-medium text-gray-700 truncate">{selectedContact.email}</span>
              </div>
            </div>

            <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">Shared Files</h3>
            <div className="space-y-2 mb-8">
              {sharedAttachments.length ? sharedAttachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => downloadAttachment(attachment)}
                  className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 text-left hover:border-gray-200"
                >
                  <Paperclip size={15} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-gray-800 truncate">{attachment.fileName}</p>
                    <p className="text-[11px] text-gray-400">{formatFileSize(attachment.fileSize)}</p>
                  </div>
                </button>
              )) : (
                <div className="text-center text-gray-400 py-4 border border-dashed border-gray-200 rounded-xl bg-white">
                  <p className="text-[12px]">No files shared yet.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push(getProfileLink(selectedContact.id))}
              className="w-full bg-white text-gray-700 font-bold text-[13px] py-3 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
            >
              View Full Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({
  user,
  size,
  active = false,
}: {
  user: { name: string; avatarUrl?: string | null; status?: string | null };
  size: "sm" | "md" | "lg";
  active?: boolean;
}) {
  const sizeClass = size === "lg" ? "w-24 h-24 border-4 shadow-md" : size === "md" ? "w-12 h-12 border" : "w-8 h-8 border";
  const src = getAvatarSrc(user);

  return (
    <div className="relative">
      <img src={src} alt={user.name} className={`${sizeClass} rounded-full object-cover border-white bg-white`} />
      {size !== "sm" && (
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${active ? "border-white" : "border-[#f8f9fc]"} ${user.status === "Inactive" ? "bg-gray-400" : "bg-green-500"}`} />
      )}
    </div>
  );
}

function MessageAttachmentView({
  attachment,
  token,
  isMe,
  onDownload,
}: {
  attachment: Attachment;
  token: string | null;
  isMe: boolean;
  onDownload: () => void;
}) {
  const isImage = attachment.mimeType?.startsWith("image/");

  if (isImage) {
    return <MessageImage attachment={attachment} token={token} onDownload={onDownload} />;
  }

  return (
    <button
      type="button"
      onClick={onDownload}
      className={`w-full min-w-[220px] flex items-center gap-3 rounded-xl p-3 text-left ${isMe ? "bg-white/10 hover:bg-white/15" : "bg-white hover:bg-gray-50 border border-gray-100"}`}
    >
      <FileText size={18} className={isMe ? "text-blue-100" : "text-gray-500"} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold truncate">{attachment.fileName}</p>
        <p className={`text-[11px] ${isMe ? "text-blue-100" : "text-gray-400"}`}>{formatFileSize(attachment.fileSize)}</p>
      </div>
      <Download size={15} className={isMe ? "text-blue-100" : "text-gray-500"} />
    </button>
  );
}

function MessageImage({ attachment, token, onDownload }: { attachment: Attachment; token: string | null; onDownload: () => void }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let objectUrl: string | null = null;
    let isMounted = true;

    fetch(`${API_BASE}/api/messages/attachments/${attachment.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || !isMounted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, token]);

  if (!src) {
    return <div className="h-40 w-64 rounded-xl bg-black/10 animate-pulse" />;
  }

  return (
    <div className="relative group">
      <img src={src} alt={attachment.fileName} className="max-h-[320px] max-w-full rounded-xl object-contain bg-black/5" />
      <button
        type="button"
        onClick={onDownload}
        className="absolute top-2 right-2 rounded-lg bg-black/50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Download size={15} />
      </button>
    </div>
  );
}

function getAvatarSrc(user: { name: string; avatarUrl?: string | null }) {
  if (user.avatarUrl) {
    return user.avatarUrl.startsWith("http") ? user.avatarUrl : `${API_BASE}${user.avatarUrl}`;
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
}

function getRoleLabel(roles: string[]) {
  if (roles.includes("ROLE_ADMIN")) return "Catalyst Admin";
  return "Founder";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
