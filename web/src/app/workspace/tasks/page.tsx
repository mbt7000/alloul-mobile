'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckSquare, Loader2, Folder } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getProjects, ApiError, type Project } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  active:     { label: 'نشط',    color: '#2E8BFF' },
  in_progress:{ label: 'جارٍ',    color: '#F59E0B' },
  done:       { label: 'منتهي',  color: '#14E0A4' },
  completed:  { label: 'مكتمل',  color: '#14E0A4' },
  cancelled:  { label: 'ملغى',   color: '#EF4444' },
};

export default function TasksPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const data = await getProjects();
        setProjects(Array.isArray(data) ? data : []);
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
        <h1 className="text-white font-black text-[17px] flex-1">المهام والمشاريع</h1>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Folder size={28} className="text-primary" />
            </div>
            <p className="text-white/70 text-base font-bold mb-2">لا يوجد مشاريع بعد</p>
            <p className="text-white/40 text-sm">أنشئ أول مشروع لفريقك من الموبايل</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => {
              const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.active;
              const progress = p.tasks_count && p.tasks_count > 0
                ? Math.round(((p.completed_count ?? 0) / p.tasks_count) * 100)
                : 0;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${style.color}22` }}
                    >
                      <CheckSquare size={18} style={{ color: style.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-sm truncate">{p.name}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                          style={{ background: `${style.color}22`, color: style.color }}
                        >
                          {style.label}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-white/50 text-[11px] line-clamp-2">{p.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {p.tasks_count ? (
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-white/50">
                          {p.completed_count ?? 0} / {p.tasks_count} مهمة
                        </span>
                        <span className="text-white/70 font-bold">{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progress}%`,
                            background: style.color,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
