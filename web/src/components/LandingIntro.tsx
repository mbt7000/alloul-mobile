'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  Sparkles, CheckSquare, Video, Users, Briefcase, MessageSquare,
  TrendingUp, Shield, Zap, Globe, ArrowLeft, Play,
} from 'lucide-react';

// First-visit marketing intro — only shown on web (not mobile app).
// After user signs in or clicks CTA, they go to /login.

const FEATURES = [
  {
    icon: CheckSquare,
    title: 'مهام ومشاريع',
    desc: 'نظّم عملك بلوحات Kanban وقوائم وتقويم — كل شي في مكان واحد',
    color: '#2E8BFF',
  },
  {
    icon: Video,
    title: 'اجتماعات فيديو',
    desc: 'غرفة Daily.co مدمجة لكل شركة — بدون رسوم إضافية',
    color: '#14E0A4',
  },
  {
    icon: Sparkles,
    title: 'ذكاء اصطناعي',
    desc: 'AI Assistant يحلل المهام، يلخص التقارير، ويقترح الحلول',
    color: '#00D4FF',
  },
  {
    icon: Users,
    title: 'إدارة الفريق',
    desc: 'شجرة هيكل تنظيمي، أدوار وصلاحيات، حضور لحظي',
    color: '#8B5CF6',
  },
  {
    icon: TrendingUp,
    title: 'CRM ومبيعات',
    desc: 'تتبع الصفقات، خط الأنابيب، والعملاء الجدد',
    color: '#F59E0B',
  },
  {
    icon: MessageSquare,
    title: 'تواصل موحّد',
    desc: 'دردشة، قنوات، ورسائل مباشرة — كل المحادثات في منصة',
    color: '#EC4899',
  },
  {
    icon: Briefcase,
    title: 'تسليم واستلام',
    desc: 'سجلات تسليم بين الموظفين مع تحليل AI للمخاطر',
    color: '#FF4757',
  },
  {
    icon: Shield,
    title: 'أمان المؤسسات',
    desc: '2FA، Audit Logs، SSO، وحماية بيانات متقدمة',
    color: '#10B981',
  },
  {
    icon: Globe,
    title: 'متعدد اللغات',
    desc: 'عربي، إنجليزي، فرنسي، إسباني، هندي — RTL كامل',
    color: '#3B82F6',
  },
];

const STEPS = [
  { n: 1, title: 'أنشئ حسابك', desc: 'بإيميلك أو Google أو Apple أو GitHub — خلال 30 ثانية' },
  { n: 2, title: 'أنشئ أو انضم لشركة', desc: 'ابدأ فريقك وادعُ الموظفين بـ I-Code أو رابط دعوة' },
  { n: 3, title: 'استخدم المنصة', desc: 'مهام، اجتماعات، AI — ابدأ عملك فوراً بلا إعدادات معقّدة' },
];

export default function LandingIntro() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg-900 text-white relative overflow-x-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed top-[-15%] left-[-10%] w-[700px] h-[700px] rounded-full bg-primary/15 blur-[160px]" />
      <div className="pointer-events-none fixed top-[20%] right-[-15%] w-[800px] h-[800px] rounded-full bg-secondary/10 blur-[180px]" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-accent/10 blur-[140px]" />

      {/* Sticky header */}
      <header className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-glow-primary">
              <Image src="/icon.png" alt="ALLOUL&Q" width={40} height={40} />
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-black text-lg leading-none">
                ALLOUL<span className="text-secondary">&Q</span>
              </div>
              <div className="text-white/40 text-[10px] mt-0.5">منصة الأعمال الذكية</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-white/70 hover:text-white text-sm font-medium">
              تسجيل الدخول
            </Link>
            <Link
              href="/login"
              className="bg-gradient-primary text-white px-5 py-2 rounded-full text-sm font-bold shadow-glow-primary hover:shadow-glow-accent transition-all"
            >
              ابدأ مجاناً
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="pt-16 pb-20 md:pt-28 md:pb-32 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Large logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-logo rounded-3xl blur-3xl opacity-40 animate-pulse" />
                <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden shadow-glow-primary border border-primary/30">
                  <Image src="/logo.png" alt="ALLOUL&Q" width={128} height={128} priority />
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-8 backdrop-blur-sm">
              <Sparkles size={14} className="text-accent" />
              <span className="text-accent text-xs font-bold">منصة الأعمال الذكية #1 في المنطقة</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[1.05] tracking-tight">
              كل أدوات عملك
              <br />
              في <span className="bg-gradient-logo bg-clip-text text-transparent">منصة واحدة</span>
            </h1>

            <p className="text-lg md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed">
              مهام، اجتماعات، AI Assistant، CRM، ومكالمات فيديو — كل شي يحتاجه فريقك الحديث.
              <br className="hidden md:block" />
              ابدأ مجاناً لمدة <span className="text-accent font-bold">14 يوم</span>، بدون بطاقة ائتمان.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/login"
                className="group w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-primary text-white text-base font-bold shadow-glow-primary hover:shadow-glow-accent transition-all flex items-center justify-center gap-2"
              >
                <span>ابدأ تجربتك المجانية</span>
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-base font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Play size={16} />
                <span>عرض الأسعار</span>
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-white/40 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                14 يوم مجاناً
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                بدون بطاقة ائتمان
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                إلغاء في أي وقت
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                iOS + Android + Web
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section className="py-20 relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/30 mb-4">
                <span className="text-accent text-xs font-bold">كيف يعمل</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                ابدأ خلال <span className="bg-gradient-logo bg-clip-text text-transparent">3 خطوات</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Connector line (desktop) */}
              <div className="hidden md:block absolute top-[60px] right-[16%] left-[16%] h-[2px] bg-gradient-to-l from-primary/30 via-secondary/30 to-accent/30" />

              {STEPS.map((s, i) => (
                <div key={s.n} className="relative group">
                  <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 p-8 backdrop-blur-sm text-center transition-all">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-logo flex items-center justify-center shadow-glow-primary text-white font-black text-2xl group-hover:shadow-glow-accent transition-shadow">
                      {s.n}
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">{s.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ FEATURES GRID ═══════════════ */}
        <section className="py-20 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-block px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30 mb-4">
                <span className="text-secondary text-xs font-bold">الخدمات</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                كل شي تحتاجه <span className="bg-gradient-logo bg-clip-text text-transparent">لإدارة أعمالك</span>
              </h2>
              <p className="text-white/50 max-w-2xl mx-auto text-base md:text-lg">
                9 خدمات أساسية — مصممة خصيصاً للفرق العربية الحديثة
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 p-6 transition-all backdrop-blur-sm relative overflow-hidden"
                >
                  {/* Hover glow */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity"
                    style={{ background: f.color }}
                  />
                  <div
                    className="relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 border"
                    style={{
                      background: `${f.color}22`,
                      borderColor: `${f.color}44`,
                    }}
                  >
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2 relative">{f.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed relative">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ STATS BAR ═══════════════ */}
        <section className="py-20 relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 backdrop-blur-xl p-10 md:p-14 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-logo opacity-5" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
                {[
                  { value: '33', label: 'موظف في أكبر خطة' },
                  { value: '5', label: 'لغات مدعومة' },
                  { value: '14', label: 'يوم تجربة مجانية' },
                  { value: '24/7', label: 'دعم VIP' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-4xl md:text-6xl font-black bg-gradient-logo bg-clip-text text-transparent mb-2">
                      {s.value}
                    </div>
                    <div className="text-white/50 text-xs md:text-sm">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ FINAL CTA ═══════════════ */}
        <section className="py-24 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative rounded-3xl overflow-hidden border border-primary/30 p-12 md:p-16 bg-gradient-to-br from-dark-bg-800 to-dark-bg-700">
              <div className="absolute inset-0 bg-gradient-logo opacity-10" />
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-secondary/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-glow-primary">
                    <Image src="/icon.png" alt="ALLOUL&Q" width={64} height={64} />
                  </div>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                  جاهز تبدأ؟
                </h2>
                <p className="text-white/60 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                  انضم لفرق كثيرة غيّرت طريقة عملها مع ALLOUL&Q
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-primary text-white text-base font-bold shadow-glow-primary hover:shadow-glow-accent transition-all group"
                >
                  <span>ابدأ تجربتك المجانية</span>
                  <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className="py-12 border-t border-primary/10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden">
                  <Image src="/icon.png" alt="ALLOUL&Q" width={32} height={32} />
                </div>
                <span className="text-white/60 text-sm">© 2026 ALLOUL&Q · منصة الأعمال الذكية</span>
              </div>
              <div className="flex items-center gap-6 text-white/40 text-xs">
                <Link href="/pricing" className="hover:text-white">الأسعار</Link>
                <Link href="/enterprise" className="hover:text-white">Enterprise</Link>
                <a href="#" className="hover:text-white">الخصوصية</a>
                <a href="#" className="hover:text-white">الشروط</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
