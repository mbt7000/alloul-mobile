'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Loader2, Plus, DollarSign } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getDeals, ApiError, type Deal } from '@/lib/api-client';
import { isAuthenticated } from '@/lib/auth';

const STAGES = [
  { key: 'lead',          label: 'مبدئي',       color: '#8B5CF6' },
  { key: 'qualified',     label: 'مؤهَّل',       color: '#00D4FF' },
  { key: 'proposal',      label: 'عرض سعر',     color: '#2E8BFF' },
  { key: 'negotiation',   label: 'تفاوض',       color: '#FFB24D' },
  { key: 'won',           label: 'ناجحة',       color: '#14E0A4' },
  { key: 'lost',          label: 'خسرت',        color: '#FF4757' },
];

export default function CrmPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    (async () => {
      try {
        const data = await getDeals();
        setDeals(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const { pipeline, wonTotal, activeCount } = useMemo(() => {
    const active = deals.filter((d) => !['won', 'lost'].includes(d.stage));
    return {
      pipeline: active.reduce((s, d) => s + (d.value || 0), 0),
      wonTotal: deals.filter((d) => d.stage === 'won').reduce((s, d) => s + (d.value || 0), 0),
      activeCount: active.length,
    };
  }, [deals]);

  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const d of deals) (map[d.stage] ??= []).push(d);
    return map;
  }, [deals]);

  return (
    <AppShell>
      <header className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">CRM · الصفقات</h1>
        <button className="glass-subtle glass-hover gap-1 text-primary-500 border-primary-500/30">
          <Plus size={14} /> <span>جديدة</span>
        </button>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10 max-w-5xl mx-auto">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass glass-ring-primary p-4">
            <p className="text-xs text-white/60">خط الأنابيب</p>
            <p className="text-xl font-black text-primary-500 mt-1">
              {pipeline.toLocaleString('en')} <span className="text-xs">$</span>
            </p>
          </div>
          <div className="glass glass-ring-secondary p-4">
            <p className="text-xs text-white/60">الصفقات الناجحة</p>
            <p className="text-xl font-black text-secondary-500 mt-1">
              {wonTotal.toLocaleString('en')} <span className="text-xs">$</span>
            </p>
          </div>
          <div className="glass glass-ring-accent p-4">
            <p className="text-xs text-white/60">نشطة</p>
            <p className="text-xl font-black text-accent-500 mt-1">{activeCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary-500 animate-spin" />
          </div>
        ) : deals.length === 0 ? (
          <div className="glass p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center">
              <TrendingUp size={28} className="text-primary-500" />
            </div>
            <p className="text-white/70 font-bold mb-2">لا يوجد صفقات بعد</p>
            <p className="text-white/40 text-sm">ابدأ بإضافة أول صفقة لفريقك</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAGES.map((s) => (
              <div key={s.key} className="glass p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold" style={{ color: s.color }}>{s.label}</p>
                  <span className="text-[10px] text-white/40">{byStage[s.key]?.length ?? 0}</span>
                </div>
                <div className="space-y-2">
                  {(byStage[s.key] ?? []).slice(0, 8).map((d) => (
                    <div key={d.id} className="bg-white/[0.04] border border-white/10 rounded-xl p-2">
                      <p className="text-xs font-semibold truncate">{d.company}</p>
                      <p className="text-[11px] text-white/60 flex items-center gap-1 mt-1">
                        <DollarSign size={10} />
                        {(d.value || 0).toLocaleString('en')}
                        {d.probability != null && <span className="text-white/40">· {d.probability}%</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
