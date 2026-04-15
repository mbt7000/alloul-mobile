'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight, BarChart3, CheckSquare, Users, Folder, TrendingUp, Calendar, Loader2,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getDashboardStats, ApiError, type DashboardStats } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const TILES = [
  { key: 'tasks_total',     icon: CheckSquare, label: 'إجمالي المهام',    color: '#2E8BFF' },
  { key: 'tasks_done',      icon: CheckSquare, label: 'مكتملة',           color: '#14E0A4' },
  { key: 'projects_active', icon: Folder,      label: 'مشاريع نشطة',      color: '#00D4FF' },
  { key: 'team_members',    icon: Users,       label: 'أعضاء الفريق',     color: '#8B5CF6' },
  { key: 'deals_active',    icon: TrendingUp,  label: 'صفقات نشطة',       color: '#FFB24D' },
  { key: 'meetings_week',   icon: Calendar,    label: 'اجتماعات الأسبوع', color: '#FF4757' },
] as const;

export default function ReportsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const s = await getDashboardStats();
        setStats(s);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <AppShell>
      <header className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">التقارير</h1>
        <BarChart3 className="w-5 h-5 text-accent-500" />
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10 max-w-5xl mx-auto">
        <div className="glass-strong p-6 mb-6 glass-ring-accent">
          <h2 className="text-lg font-bold mb-1">لوحة التقارير</h2>
          <p className="text-sm text-white/60">نظرة شاملة على أداء شركتك — محدَّثة لحظياً.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TILES.map((t) => {
              const value = (stats as unknown as Record<string, number>)?.[t.key] ?? 0;
              return (
                <div key={t.key} className="glass glass-hover p-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${t.color}22`, border: `1px solid ${t.color}55` }}
                  >
                    <t.icon size={20} style={{ color: t.color }} />
                  </div>
                  <p className="text-3xl font-black" style={{ color: t.color }}>{value}</p>
                  <p className="text-xs text-white/60 mt-1">{t.label}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="glass mt-6 p-5 border-dashed border-white/10">
          <p className="text-sm text-white/70">
            💡 <strong>قريباً:</strong> رسوم بيانية تفاعلية، مقارنات شهرية، وتصدير PDF للتقارير.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
