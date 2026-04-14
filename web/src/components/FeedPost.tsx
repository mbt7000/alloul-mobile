'use client';

import { Heart, MessageCircle, Repeat2, Bookmark, Share, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

interface Props {
  author: string;
  handle: string;
  verified?: boolean;
  time: string;
  content: string;
  imageUrl?: string;
  stats: { likes: number; comments: number; reposts: number; views?: number };
  avatarColor?: string;
  initial?: string;
}

export default function FeedPost({
  author, handle, verified, time, content, imageUrl, stats, avatarColor = '#2E8BFF', initial,
}: Props) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <article className="px-4 py-3 border-b border-primary/10 hover:bg-white/[0.015] transition-colors cursor-pointer">
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}
        >
          <span className="text-white font-bold text-sm">{initial ?? author.slice(0, 1)}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-white font-bold text-[15px] hover:underline">{author}</span>
            {verified && (
              <svg className="w-[18px] h-[18px] text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.866.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.356-.643.378-.022.003-.045.003-.067.003-.236 0-.463-.093-.63-.26l-2.503-2.5c-.347-.347-.347-.91 0-1.26.348-.345.91-.345 1.26 0l1.744 1.74 3.697-5.546c.272-.41.824-.52 1.233-.246.41.273.519.826.246 1.234z"/>
              </svg>
            )}
            <span className="text-white/40 text-sm">@{handle}</span>
            <span className="text-white/40 text-sm">·</span>
            <span className="text-white/40 text-sm hover:underline">{time}</span>
            <button className="mr-auto p-1 rounded-full text-white/50 hover:bg-primary/10 hover:text-primary">
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* Body */}
          <p className="text-white text-[15px] leading-[1.4] whitespace-pre-wrap">{content}</p>

          {imageUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-white/5 aspect-video bg-white/5" />
          )}

          {/* Actions */}
          <div className="flex items-center justify-between max-w-md mt-3 -mr-2">
            <button className="flex items-center gap-1 p-2 rounded-full text-white/50 hover:text-accent hover:bg-accent/10 transition-colors group">
              <MessageCircle size={18} strokeWidth={2} />
              <span className="text-xs">{stats.comments}</span>
            </button>
            <button className="flex items-center gap-1 p-2 rounded-full text-white/50 hover:text-secondary hover:bg-secondary/10 transition-colors group">
              <Repeat2 size={18} strokeWidth={2} />
              <span className="text-xs">{stats.reposts}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
              className={`flex items-center gap-1 p-2 rounded-full transition-colors group ${
                liked ? 'text-danger' : 'text-white/50 hover:text-danger hover:bg-danger/10'
              }`}
            >
              <Heart size={18} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-xs">{stats.likes + (liked ? 1 : 0)}</span>
            </button>
            {stats.views !== undefined && (
              <button className="flex items-center gap-1 p-2 rounded-full text-white/50 hover:text-primary hover:bg-primary/10 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M7 12l4-4 4 4 6-6" />
                </svg>
                <span className="text-xs">{stats.views}</span>
              </button>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setBookmarked(!bookmarked); }}
                className={`p-2 rounded-full transition-colors ${
                  bookmarked ? 'text-primary' : 'text-white/50 hover:text-primary hover:bg-primary/10'
                }`}
              >
                <Bookmark size={18} strokeWidth={2} fill={bookmarked ? 'currentColor' : 'none'} />
              </button>
              <button className="p-2 rounded-full text-white/50 hover:text-primary hover:bg-primary/10 transition-colors">
                <Share size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
