"use client";

import { Heart, MessageSquare, Send } from "lucide-react";

interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string; roles: string[] };
}

interface PostEngagementProps {
  postId: number;
  commentCount: number;
  likeCount: number;
  userLiked: boolean;
  expanded: boolean;
  comments: CommentItem[];
  commentText: string;
  onToggleComments: (postId: number) => void;
  onToggleLike: (postId: number) => void;
  onCommentTextChange: (value: string) => void;
  onSubmitComment: (postId: number) => void;
  onAuthorClick: (authorId: number) => void;
  getTimeAgo: (value: string) => string;
}

export default function PostEngagement({
  postId,
  commentCount,
  likeCount,
  userLiked,
  expanded,
  comments,
  commentText,
  onToggleComments,
  onToggleLike,
  onCommentTextChange,
  onSubmitComment,
  onAuthorClick,
  getTimeAgo,
}: PostEngagementProps) {
  return (
    <>
      <div className="px-6 pb-4 pt-3 flex items-center justify-between border-t border-gray-50 mx-6">
        <div className="flex items-center gap-5 text-[12px] font-bold">
          <button onClick={() => onToggleComments(postId)} className="flex items-center gap-1.5 text-gray-500 hover:text-[#0a1b44] transition-colors">
            <MessageSquare size={16} /> {commentCount} Comments
          </button>
          <button onClick={() => onToggleLike(postId)} className={`flex items-center gap-1.5 transition-colors ${userLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}>
            <Heart size={16} fill={userLiked ? "currentColor" : "none"} /> {likeCount} Likes
          </button>
        </div>
        <button className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-gray-500 uppercase hover:text-[#0a1b44]">
          Read Full Post
        </button>
      </div>

      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4 bg-[#fafbfd]">
          <div className="hide-scrollbar space-y-3 mb-4 max-h-[300px] overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-[13px] text-gray-400 text-center py-4">No comments yet. Be the first!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.name)}&background=random&size=32`}
                    alt=""
                    className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onAuthorClick(comment.author.id)}
                  />
                  <div className="bg-white rounded-xl rounded-tl-none p-3 border border-gray-100 flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className="text-[12px] font-bold text-gray-900 cursor-pointer hover:text-[#0a1b44] hover:underline"
                        onClick={() => onAuthorClick(comment.author.id)}
                      >
                        {comment.author.name}
                      </span>
                      <span className="text-[10px] text-gray-400">{getTimeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-gray-600">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => onCommentTextChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmitComment(postId)}
              placeholder="Write a comment..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-[#0a1b44]"
            />
            <button
              onClick={() => onSubmitComment(postId)}
              disabled={!commentText.trim()}
              className="bg-[#0a1b44] text-white px-4 py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
