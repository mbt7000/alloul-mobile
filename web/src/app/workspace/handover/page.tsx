'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getHandovers, ApiError, type HandoverRow } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

const RISK_STYLE: Record<string, { label: string; color: string }> = {
  low:    { label: 'منخفض', color: '#14E0A4' },
  medium: { label: 'متوسط', color: '#F59E0B' },
  high:   { label: 'عالي',  color: '#EF4444' },
  critical:{ label: 'حرج',  color: '#DC2626' },
};

export default function HandoverPage() {
  const router = useRouter();
  const [rows, setRows] = useState<HandoverRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const data = await getHandovers();
        setRows(Array.isArray(data) ? data : []);
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
        <h1 className="text-white font-black text-[17px] flex-1">التسليمات</h1>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="text-primary animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center">
              <RefreshCw size={28} className="text-warning" />
            </div>
            <p className="text-white/70 text-base font-bold mb-2">لا يوجد تسليمات</p>
            <p className="text-white/40 text-sm">التسليمات بين الموظفين بتظهر هنا</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((h) => {
              const risk = RISK_STYLE[h.risk_level ?? 'low'] ?? RISK_STYLE.low;
              return (
                <div
                  key={h.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-warning/30 transition-all p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${risk.color}22` }}
                    >
                      <RefreshCw size={18} style={{ color: risk.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-white font-bold text-sm truncate">
                          {h.handover_title}
                        </span>
                        {h.risk_level && (
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: `${risk.color}22` }}
                          >
                            <AlertTriangle size={9} style={{ color: risk.color }} />
                            <span className="text-[9px] font-bold" style={{ color: risk.color }}>
                              {risk.label}
                            </span>
                          </div>
                        )}
                      </div>
                      {h.client_name && (
                        <div className="text-white/50 text-[11px] mb-1">
                          العميل: <span className="text-white/70">{h.client_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-white/40">
                        {h.from_person && <span>من: {h.from_person}</span>}
                        {h.from_person && h.to_person && <span>←</span>}
                        {h.to_person && <span>إلى: {h.to_person}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
