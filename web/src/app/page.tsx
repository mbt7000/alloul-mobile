import AppShell from '@/components/AppShell';
import StoriesBar from '@/components/StoriesBar';
import FeedPost from '@/components/FeedPost';
import { Sparkles } from 'lucide-react';

const FEED_TABS = ['لك', 'متابَعون', 'الترند'];

const DEMO_POSTS = [
  {
    author: 'ALLOUL&Q',
    handle: 'alloul_q',
    verified: true,
    time: '٢د',
    content: 'أطلقنا اليوم خطط اشتراك جديدة 🚀\n\n· Starter ($24/شهر)\n· Pro ($59/شهر)\n· Pro Plus ($289/شهر)\n\n14 يوم تجربة مجانية — بدون بطاقة ائتمان.',
    stats: { likes: 1247, comments: 84, reposts: 156, views: 24800 },
    avatarColor: '#2E8BFF',
  },
  {
    author: 'Alloul AI',
    handle: 'alloul_ai',
    verified: true,
    time: '١٥د',
    content: 'ميزة جديدة: الآن تقدر تكتب مهام وتسليمات بلغة طبيعية، والـ AI ينظمها لك تلقائياً ويحفظها في مساحة العمل.',
    stats: { likes: 892, comments: 42, reposts: 98, views: 15200 },
    avatarColor: '#14E0A4',
  },
  {
    author: 'Alloul News',
    handle: 'alloul_news',
    verified: true,
    time: '٣٠د',
    content: '🔴 مباشر الآن: قمة الذكاء الاصطناعي في الرياض — تغطية حصرية من فريقنا.',
    stats: { likes: 543, comments: 28, reposts: 72, views: 9800 },
    avatarColor: '#FF4757',
  },
  {
    author: 'محمد التركي',
    handle: 'm_alturki',
    time: '١س',
    content: 'ثاني يوم في ALLOUL&Q وحرفياً غيّر طريقة فريقي في إدارة المشاريع 👏\n\nالـ Kanban + AI Assistant + Daily.co كلها في منصة واحدة.',
    stats: { likes: 234, comments: 18, reposts: 32 },
    avatarColor: '#00D4FF',
    initial: 'م',
  },
  {
    author: 'سارة الدوسري',
    handle: 's_aldosary',
    time: '٢س',
    content: 'التصميم العربي في ALLOUL&Q أنظف ما شفته في أي SaaS محلي. الخط + الـ RTL + الألوان = 10/10 ✨',
    stats: { likes: 187, comments: 12, reposts: 24 },
    avatarColor: '#8B5CF6',
    initial: 'س',
  },
  {
    author: 'فيصل البدر',
    handle: 'f_albader',
    time: '٣س',
    content: 'ملاحظة للفرق اللي تبي تجرّب ALLOUL&Q: جرّب ميزة التسليم (Handover) — غيّرت طريقة استلام المهام بين الشفتات بالكامل.',
    stats: { likes: 156, comments: 9, reposts: 18 },
    avatarColor: '#F59E0B',
    initial: 'ف',
  },
];

export default function HomePage() {
  return (
    <AppShell>
      {/* Sticky tab header (X/Twitter style) */}
      <header className="sticky top-0 md:top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-white font-black text-xl">الرئيسية</h1>
          <button className="p-2 rounded-full hover:bg-white/5">
            <Sparkles size={18} className="text-accent" />
          </button>
        </div>
        <div className="flex border-t border-white/5">
          {FEED_TABS.map((tab, i) => (
            <button
              key={tab}
              className={`flex-1 py-3 px-4 text-[15px] font-bold relative ${
                i === 0 ? 'text-white' : 'text-white/50 hover:bg-white/[0.03]'
              } transition-colors`}
            >
              {tab}
              {i === 0 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      <StoriesBar />

      {/* Compose box */}
      <div className="px-4 py-3 border-b border-primary/10">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-logo flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">أنا</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="ما الذي يحدث؟"
              className="w-full bg-transparent text-xl text-white placeholder:text-white/40 focus:outline-none py-2"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-accent">
                <button className="p-2 rounded-full hover:bg-accent/10">🖼</button>
                <button className="p-2 rounded-full hover:bg-accent/10">✨</button>
                <button className="p-2 rounded-full hover:bg-accent/10">📍</button>
              </div>
              <button className="bg-gradient-primary text-white text-sm font-bold px-5 py-1.5 rounded-full shadow-glow-primary hover:shadow-glow-accent transition-all">
                نشر
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="pb-24 md:pb-10">
        {DEMO_POSTS.map((p, i) => (
          <FeedPost key={i} {...p} />
        ))}
      </div>
    </AppShell>
  );
}
