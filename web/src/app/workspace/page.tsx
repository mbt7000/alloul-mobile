import AppShell from '@/components/AppShell';
import Link from 'next/link';
import {
  Briefcase, CheckSquare, Calendar, Users, Folder, BookOpen,
  TrendingUp, Video, MessageSquare, Sparkles, ArrowLeft, BarChart3,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { icon: Sparkles,   label: 'المساعد',   color: '#8B5CF6' },
  { icon: Video,      label: 'اجتماع',    color: '#14E0A4' },
  { icon: CheckSquare,label: 'مهمة',      color: '#2E8BFF' },
  { icon: MessageSquare, label: 'دردشة',  color: '#00D4FF' },
  { icon: TrendingUp, label: 'صفقات',    color: '#FF4757' },
  { icon: Briefcase,  label: 'تسليم',    color: '#FFB24D' },
];

const SERVICES = [
  { icon: Users,      label: 'الفريق',     sub: 'الموظفون والأدوار',  color: '#8B5CF6' },
  { icon: Folder,     label: 'المشاريع',   sub: 'كل المشاريع',        color: '#00D4FF' },
  { icon: CheckSquare,label: 'المهام',     sub: 'قائمة كاملة',        color: '#2E8BFF' },
  { icon: Calendar,   label: 'الاجتماعات', sub: 'الجدولة والفريق',    color: '#14E0A4' },
  { icon: BookOpen,   label: 'المعرفة',    sub: 'الملفات والوثائق',   color: '#FFB24D' },
  { icon: BarChart3,  label: 'التقارير',   sub: 'الأداء والتحليل',    color: '#FF4757' },
];

const STATS = [
  { label: 'الفريق',       value: '32', icon: Users,       color: '#00D4FF' },
  { label: 'مهام معلقة',  value: '18',  icon: CheckSquare, color: '#2E8BFF' },
  { label: 'تسليمات',     value: '7',   icon: Briefcase,   color: '#FFB24D' },
];

export default function WorkspacePage() {
  return (
    <AppShell>
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-white font-black text-xl">عالم الأعمال</h1>
        <Link href="/pricing" className="text-accent text-xs font-bold hover:text-accent-400">
          ترقية
        </Link>
      </header>

      <div className="px-4 py-5 space-y-6 pb-24 md:pb-10">
        {/* Greeting */}
        <div>
          <p className="text-white/50 text-xs">مرحباً،</p>
          <h2 className="text-white font-black text-2xl mt-1">ضيف 👋</h2>
          <p className="text-white/40 text-xs mt-1">Alloul Digital Workspace</p>
        </div>

        {/* Daily room card */}
        <button className="w-full p-4 rounded-2xl border border-primary/40 bg-primary/5 flex items-center gap-4 hover:bg-primary/10 transition-colors">
          <div className="w-13 h-13 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52 }}>
            <Video size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-base">غرفة الشركة المباشرة</span>
              <div className="flex items-center gap-1 bg-danger/20 px-1.5 py-0.5 rounded">
                <div className="w-1 h-1 rounded-full bg-danger" />
                <span className="text-danger text-[9px] font-black">LIVE</span>
              </div>
            </div>
            <p className="text-white/50 text-xs mt-1">انضم للاجتماع المباشر فوراً</p>
          </div>
          <div className="px-4 py-2 rounded-full bg-primary text-white text-xs font-black flex-shrink-0">انضم</div>
        </button>

        {/* Quick actions row */}
        <div>
          <div className="flex gap-4 overflow-x-auto scrollbar-none">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.label} className="flex flex-col items-center gap-2 flex-shrink-0 w-[72px]">
                <div
                  className="w-[58px] h-[58px] rounded-2xl flex items-center justify-center border"
                  style={{ background: `${a.color}20`, borderColor: `${a.color}44` }}
                >
                  <a.icon size={22} style={{ color: a.color }} />
                </div>
                <span className="text-white text-[11px] font-bold text-center">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Services grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-base">الخدمات</h3>
            <Link href="/workspace/apps" className="text-accent text-xs font-bold">عرض الكل</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map((s) => (
              <button
                key={s.label}
                className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all text-right min-h-[118px] flex flex-col justify-between"
              >
                <div
                  className="w-[42px] h-[42px] rounded-xl flex items-center justify-center"
                  style={{ background: `${s.color}22` }}
                >
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{s.label}</div>
                  <div className="text-white/40 text-[11px] mt-0.5">{s.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div>
          <h3 className="text-white font-bold text-base mb-3">نظرة عامة</h3>
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `${s.color}22` }}
                >
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div className="text-white font-black text-2xl">{s.value}</div>
                <div className="text-white/40 text-[11px] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-base">آخر النشاط</h3>
            <button className="text-accent text-xs font-bold">عرض الكل</button>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            {[
              { title: 'تم إنشاء مشروع جديد: إطلاق Q2', time: 'منذ ٥د' },
              { title: 'سارة أكملت مهمة "تصميم واجهة الدفع"', time: 'منذ ١٥د' },
              { title: 'اجتماع الفريق الأسبوعي بدأ', time: 'منذ ٣٠د' },
              { title: 'تسليم جديد: خالد → أحمد', time: 'منذ ٥٥د' },
            ].map((a, i, arr) => (
              <div
                key={i}
                className={`flex items-center gap-3 p-4 ${
                  i < arr.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{a.title}</p>
                  <p className="text-white/40 text-[11px] mt-0.5">{a.time}</p>
                </div>
                <ArrowLeft size={14} className="text-white/40 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
