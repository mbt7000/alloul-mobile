import Link from 'next/link';
import {
  Sparkles, CheckCircle2, Users, MessageSquare, Calendar, Briefcase,
  TrendingUp, Shield, Zap, Globe, ArrowLeft, Star,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative pt-16 pb-24 md:pt-28 md:pb-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* Glow behind hero */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/20 via-transparent to-transparent blur-[100px] pointer-events-none -z-10" />

            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-8">
                <Sparkles size={14} className="text-accent" />
                <span className="text-accent text-xs font-bold">منصة الأعمال الذكية الأولى في المنطقة</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
                مساحة عمل <span className="bg-gradient-logo bg-clip-text text-transparent">موحّدة</span>
                <br />
                لفرقك الذكية
              </h1>

              <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
                مهام، مشاريع، اجتماعات، AI Assistant، CRM، ومكالمات فيديو — كل شيء في منصة واحدة.
                ابدأ مجاناً لمدة <span className="text-accent font-bold">14 يوم</span>.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link
                  href="/start-trial"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-primary text-white text-sm font-bold shadow-glow-primary hover:shadow-glow-accent transition-all flex items-center justify-center gap-2 group"
                >
                  <span>ابدأ تجربتك المجانية</span>
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-all"
                >
                  عرض الأسعار
                </Link>
              </div>

              {/* Trust */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-white/40 text-xs">
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-secondary" /> بدون بطاقة ائتمان</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-secondary" /> 14 يوم مجاناً</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-secondary" /> إلغاء في أي وقت</div>
              </div>
            </div>

            {/* Hero visual — mock app screen */}
            <div className="mt-20 relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-logo opacity-30 blur-3xl -z-10" />
              <div className="rounded-3xl border border-primary/20 bg-dark-bg-800/80 backdrop-blur-2xl p-4 md:p-8 shadow-glow-primary">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: Briefcase, label: 'المشاريع', value: '124', sub: 'نشطة' },
                    { icon: Users, label: 'الفريق', value: '32', sub: 'متصل' },
                    { icon: TrendingUp, label: 'الإيرادات', value: '$48K', sub: 'هذا الشهر' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-2xl bg-dark-bg-700/60 border border-white/5 p-5">
                      <s.icon size={20} className="text-accent mb-3" />
                      <div className="text-3xl font-black text-white">{s.value}</div>
                      <div className="text-xs text-white/40 mt-1">{s.label} · {s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-block px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30 mb-4">
                <span className="text-secondary text-xs font-bold">كل ما تحتاجه</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                منصة واحدة. <span className="bg-gradient-logo bg-clip-text text-transparent">قدرات لا محدودة.</span>
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto">
                من إدارة المهام إلى AI Assistant — كل أدوات العمل الحديثة في تطبيق واحد.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Briefcase, title: 'المهام والمشاريع', desc: 'Kanban، قوائم، Gantt، تقارير تفصيلية' },
                { icon: MessageSquare, title: 'دردشة وتعاون', desc: 'قنوات، رسائل مباشرة، mentions' },
                { icon: Calendar, title: 'اجتماعات Daily.co', desc: 'فيديو، شاشة، تسجيل، بلا حدود' },
                { icon: Sparkles, title: 'AI Assistant', desc: 'Ollama + Claude — تحليل، اقتراحات، تلخيص' },
                { icon: Users, title: 'إدارة الفريق', desc: 'أدوار، صلاحيات، شجرة هيكل تنظيمي' },
                { icon: TrendingUp, title: 'CRM + Deals', desc: 'خط أنابيب المبيعات، تتبع العملاء' },
                { icon: Shield, title: 'أمان المؤسسات', desc: '2FA، Audit Logs، SSO (Business)' },
                { icon: Zap, title: 'تكاملات', desc: 'Stripe، Daily، SendGrid، Webhooks' },
                { icon: Globe, title: 'متعدد اللغات', desc: 'عربي، إنجليزي، فرنسي، إسباني، هندي' },
              ].map((f, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 p-6 transition-all backdrop-blur-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-logo flex items-center justify-center mb-4 group-hover:shadow-glow-primary transition-shadow">
                    <f.icon size={20} className="text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ STATS ═══════════════ */}
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 backdrop-blur-xl p-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { value: '32+', label: 'موظف في أكبر خطة' },
                  { value: '14', label: 'يوم تجربة مجانية' },
                  { value: '5', label: 'لغات مدعومة' },
                  { value: '24/7', label: 'دعم مخصص (Pro Plus)' },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-4xl md:text-5xl font-black bg-gradient-logo bg-clip-text text-transparent mb-2">
                      {s.value}
                    </div>
                    <div className="text-white/50 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ CTA ═══════════════ */}
        <section className="py-24 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative rounded-3xl overflow-hidden border border-primary/30 p-12 md:p-16 bg-gradient-to-br from-dark-bg-800 to-dark-bg-700">
              <div className="absolute inset-0 bg-gradient-logo opacity-5" />
              <div className="relative">
                <Star size={32} className="text-accent mx-auto mb-6" />
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                  جاهز تبدأ؟
                </h2>
                <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
                  انضم لمئات الفرق اللي غيّرت طريقة عملها مع ALLOUL&Q.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/start-trial"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-primary text-white text-sm font-bold shadow-glow-primary hover:shadow-glow-accent transition-all"
                  >
                    ابدأ تجربتك المجانية
                  </Link>
                  <Link
                    href="/pricing"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/20 text-white text-sm font-bold hover:bg-white/5 transition-all"
                  >
                    عرض الأسعار
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
