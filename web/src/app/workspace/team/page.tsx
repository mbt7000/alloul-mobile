'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2, Users } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getCompanyMembers, ApiError, type CompanyMember } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

const ROLE_META: Record<string, { label: string; color: string; order: number }> = {
  owner:    { label: 'المالك',    color: '#F59E0B', order: 0 },
  admin:    { label: 'المشرفون',  color: '#EF4444', order: 1 },
  manager:  { label: 'المدراء',   color: '#8B5CF6', order: 2 },
  employee: { label: 'الموظفون',  color: '#2E8BFF', order: 3 },
  member:   { label: 'الأعضاء',   color: '#6B7280', order: 4 },
};

export default function TeamHierarchyPage() {
  const router = useRouter();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const data = await getCompanyMembers();
        if (mounted) setMembers(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 401) {
          clearToken();
          router.replace('/login');
          return;
        }
        if (mounted) setError(e?.message || 'فشل تحميل الفريق');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  // Group by role
  const byRole: Record<string, CompanyMember[]> = {};
  members.forEach((m) => {
    const r = m.role ?? 'member';
    if (!byRole[r]) byRole[r] = [];
    byRole[r].push(m);
  });
  const orderedRoles = Object.keys(byRole).sort(
    (a, b) => (ROLE_META[a]?.order ?? 99) - (ROLE_META[b]?.order ?? 99),
  );

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-black text-[17px]">الفريق</h1>
          <p className="text-white/40 text-xs">
            {members.length} عضو · {orderedRoles.length} مستوى
          </p>
        </div>
      </header>

      <div className="px-5 py-5 pb-24 md:pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-white/60 text-sm">{error}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Users size={28} className="text-white/30" />
            </div>
            <p className="text-white/60 text-sm">لا يوجد أعضاء</p>
          </div>
        ) : (
          orderedRoles.map((role) => {
            const meta = ROLE_META[role] ?? { label: role, color: '#6B7280', order: 99 };
            const group = byRole[role];
            return (
              <div key={role} className="mb-7">
                {/* Role header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-1 h-5 rounded-sm" style={{ background: meta.color }} />
                  <span className="text-white font-bold text-sm" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <div
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: `${meta.color}22` }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: meta.color }}>
                      {group.length}
                    </span>
                  </div>
                </div>

                {/* Members with connector line */}
                <div className="relative pr-4">
                  <div
                    className="absolute top-0 right-[22px] bottom-0 w-[2px]"
                    style={{ background: `${meta.color}33` }}
                  />
                  {group.map((m, idx) => {
                    const initials = (m.user_name || 'U').slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 mb-2.5"
                        style={{ marginBottom: idx < group.length - 1 ? 10 : 0 }}
                      >
                        {/* Card */}
                        <div className="flex-1 flex items-center gap-3 bg-white/[0.02] rounded-2xl border border-white/5 px-3.5 py-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${meta.color}22` }}
                          >
                            <span
                              className="font-black text-sm"
                              style={{ color: meta.color }}
                            >
                              {initials}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-bold text-[13px] truncate">
                              {m.user_name || 'مستخدم'}
                            </div>
                            {m.job_title && (
                              <div className="text-white/50 text-[11px] truncate">
                                {m.job_title}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Connector dot */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-dark-bg-900"
                          style={{ background: meta.color }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
