'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Calendar, Video, Loader2, Clock, ExternalLink } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { getMeetings, getCompanyDailyJoinUrl, ApiError, type Meeting } from '@/lib/api-client';
import { isAuthenticated, clearToken } from '@/lib/auth';

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  scheduled:   { label: 'مجدول',  bg: '#2E8BFF22', color: '#2E8BFF' },
  in_progress: { label: 'جارٍ',    bg: '#F59E0B22', color: '#F59E0B' },
  done:        { label: 'منتهي',  bg: '#14E0A422', color: '#14E0A4' },
  cancelled:   { label: 'ملغى',   bg: '#EF444422', color: '#EF4444' },
};

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const data = await getMeetings();
        setMeetings(Array.isArray(data) ? data : []);
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

  const handleJoinDaily = async () => {
    setJoining(true);
    try {
      const res = await getCompanyDailyJoinUrl();
      window.open(res.join_url, '_blank');
    } catch (e: any) {
      alert(e?.message || 'تعذّر فتح Daily — تأكد من اشتراك الشركة');
    } finally {
      setJoining(false);
    }
  };

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">الاجتماعات</h1>
      </header>

      <div className="px-4 py-5 pb-24 md:pb-10 space-y-5">
        {/* Daily room card */}
        <button
          onClick={handleJoinDaily}
          disabled={joining}
          className="w-full p-4 rounded-2xl border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-4 disabled:opacity-60"
        >
          <div className="w-[52px] h-[52px] rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
            {joining ? (
              <Loader2 size={22} className="text-primary animate-spin" />
            ) : (
              <Video size={22} className="text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-base">غرفة الشركة المباشرة</span>
              <div className="flex items-center gap-1 bg-danger/20 px-1.5 py-0.5 rounded">
                <div className="w-1 h-1 rounded-full bg-danger" />
                <span className="text-danger text-[9px] font-black">LIVE</span>
              </div>
            </div>
            <p className="text-white/50 text-xs mt-1">
              {joining ? 'جارٍ فتح Daily.co...' : 'انضم للاجتماع المباشر فوراً'}
            </p>
          </div>
          <div className="px-4 py-2 rounded-full bg-primary text-white text-xs font-black flex-shrink-0">
            انضم
          </div>
        </button>

        {/* Meetings list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-base">الاجتماعات المجدولة</h3>
            <span className="text-white/40 text-xs">{meetings.length} اجتماع</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="text-primary animate-spin" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
              <Calendar size={36} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/60 text-sm font-bold">لا توجد اجتماعات</p>
              <p className="text-white/40 text-xs mt-1">اجتماعاتك المجدولة بتظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((m) => {
                const style = STATUS_STYLE[m.status] ?? STATUS_STYLE.scheduled;
                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4 flex items-center gap-4"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border"
                      style={{ background: style.bg, borderColor: `${style.color}44` }}
                    >
                      <Calendar size={18} style={{ color: style.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-sm truncate mb-1">{m.title}</div>
                      <div className="flex items-center gap-3 text-white/40 text-[11px]">
                        {m.meeting_date && (
                          <div className="flex items-center gap-1">
                            <Calendar size={10} />
                            {m.meeting_date}
                          </div>
                        )}
                        {m.meeting_time && (
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            {m.meeting_time.slice(0, 5)}
                          </div>
                        )}
                        {m.duration_minutes && <span>{m.duration_minutes}د</span>}
                      </div>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full text-[11px] font-bold flex-shrink-0"
                      style={{ background: style.bg, color: style.color }}
                    >
                      {style.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
