'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Newspaper, Heart, MessageCircle, Repeat2, Loader2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getPosts, ApiError, type ApiPost } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

function formatRelative(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins}د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs}س`;
    const days = Math.floor(hrs / 24);
    return `منذ ${days} يوم`;
  } catch { return ''; }
}

export default function CompanyNewsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const data = await getPosts(20, 0);
        setPosts(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 401) {
          clearToken();
          router.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-black text-[17px]">الأخبار والتحديثات</h1>
          <p className="text-white/40 text-xs">آخر منشورات الشركة</p>
        </div>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center">
              <Newspaper size={28} className="text-danger" />
            </div>
            <p className="text-white/70 text-base font-bold mb-2">لا يوجد منشورات</p>
            <p className="text-white/40 text-sm">أحدث التحديثات بتظهر هنا</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <article
                key={p.id}
                className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden hover:bg-white/[0.04] transition-colors"
              >
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    {p.author_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.author_avatar}
                        alt={p.author_name ?? ''}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-logo flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">
                          {(p.author_name || p.author_username || 'U').slice(0, 1)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-[13px] truncate">
                        {p.author_name || p.author_username}
                      </div>
                      <div className="text-white/40 text-[10px]">
                        {formatRelative(p.created_at)}
                      </div>
                    </div>
                  </div>
                  {p.content && (
                    <p className="text-white/90 text-[13px] leading-relaxed line-clamp-3 mb-3">
                      {p.content}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-white/50 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Heart size={12} />
                      {p.likes_count ?? 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={12} />
                      {p.comments_count ?? 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Repeat2 size={12} />
                      {p.reposts_count ?? 0}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
