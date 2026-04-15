'use client';

/**
 * ALLOUL&Q — Cinematic Landing
 * ----------------------------
 * Premium, immersive, scroll-driven landing inspired by the craft of
 * high-end studio sites (Lusion, Active Theory). Not a copy — the
 * language is adapted to our story: "الذكاء الذي يدير شركتك".
 *
 * Sections:
 *   1. Hero — full-viewport, logo + massive display type + CTA
 *   2. Manifesto — long scroll-pinned statement
 *   3. Capabilities — 6 tiles with scroll reveal + gradient rings
 *   4. AI showcase — product story with chat mock + feature list
 *   5. Marquee — infinite horizontal strip of service keywords
 *   6. CTA — final "start free" block
 */

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Sparkles, CheckSquare, Video, Users, TrendingUp,
  Briefcase, Zap, ArrowUpRight, Play,
} from 'lucide-react';
import CinematicCursor from './CinematicCursor';

// ═══ Content ══════════════════════════════════════════════════════════════

const CAPABILITIES = [
  { icon: Sparkles,      title: 'مساعد AI ذكي',   desc: 'تلخيص، تحليل، واقتراحات من Claude 4.5.',                color: '#00D4FF' },
  { icon: CheckSquare,   title: 'مهام ومشاريع',    desc: 'Kanban، قوائم، تقويم — كل شيء مترابط.',               color: '#2E8BFF' },
  { icon: TrendingUp,    title: 'CRM وصفقات',      desc: 'خط أنابيب مرئي، توقعات، وتحليل للفرص.',               color: '#FFB24D' },
  { icon: Video,         title: 'اجتماعات مدمجة',   desc: 'غرفة مكالمات Daily.co لكل شركة — بدون إعداد.',         color: '#14E0A4' },
  { icon: Users,         title: 'فريق بلا حدود',    desc: 'أدوار، صلاحيات، هيكل تنظيمي، وحضور لحظي.',            color: '#8B5CF6' },
  { icon: Briefcase,     title: 'تسليمات ذكية',    desc: 'AI يلخّص للمستلم: أولويات، مخاطر، ابدأ-اليوم-بـ.',      color: '#FF4757' },
];

const MARQUEE_WORDS = [
  'AI', 'مهام', 'اجتماعات', 'CRM', 'تسليمات', 'تقارير', 'مكالمات',
  'قنوات', 'وثائق', 'توظيف', 'قاعدة معرفة', 'تحليلات',
];

// ═══ Component ════════════════════════════════════════════════════════════

export default function LandingIntro() {
  return (
    <main className="relative min-h-screen bg-dark-bg-900 text-white overflow-x-hidden">
      <CinematicCursor />

      {/* Top nav — minimal */}
      <header className="fixed top-0 inset-x-0 z-50 px-6 lg:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 group-hover:border-accent-500/60 transition-colors">
            <Image src="/icon.png" alt="ALLOUL&Q" width={36} height={36} />
          </div>
          <span className="font-black text-base tracking-tight">
            ALLOUL<span className="text-accent-500">&Q</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <a href="#capabilities" className="hover:text-white transition-colors">الإمكانيات</a>
          <a href="#ai" className="hover:text-white transition-colors">الذكاء الاصطناعي</a>
          <a href="#manifesto" className="hover:text-white transition-colors">الفكرة</a>
          <Link href="/pricing" className="hover:text-white transition-colors">الأسعار</Link>
        </nav>

        <Link
          href="/login"
          className="glass-subtle glass-hover px-5 py-2 border-white/20 text-sm font-bold"
        >
          دخول / تسجيل
        </Link>
      </header>

      <Hero />
      <Manifesto />
      <Capabilities />
      <AIShowcase />
      <Marquee />
      <FinalCTA />

      <footer className="relative px-6 lg:px-10 py-12 border-t border-white/5 text-center text-white/40 text-xs">
        © 2026 ALLOUL&Q · صُنع بعناية · مشروع تطبيق وويب
      </footer>
    </main>
  );
}

// ═══ 1. Hero ═════════════════════════════════════════════════════════════

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-10">
      {/* Ambient orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full bg-primary-500/25 blur-[160px] animate-float-orb" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-accent-500/15 blur-[180px] animate-float-orb" />
        <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full bg-secondary-500/10 blur-[140px]" />
      </div>

      <motion.div style={{ y, opacity, scale }} className="relative text-center max-w-5xl mx-auto">
        {/* Logo as cinematic centerpiece */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative w-40 h-40 md:w-52 md:h-52 mx-auto mb-10"
        >
          {/* Outer halo — spinning conic gradient */}
          <div
            className="absolute -inset-2 rounded-full animate-ai-orb-spin opacity-70 blur-[3px]"
            style={{
              background:
                'conic-gradient(from 180deg at 50% 50%, #2E8BFF, #00D4FF, #14E0A4, #2E8BFF)',
            }}
          />
          {/* Pulsing glow */}
          <div className="absolute inset-0 rounded-full animate-pulse-glow bg-primary-500/30 blur-2xl" />
          {/* Logo core */}
          <div className="absolute inset-[4px] rounded-full bg-dark-bg-900 overflow-hidden border border-white/15">
            <Image
              src="/icon.png"
              alt="ALLOUL&Q"
              width={200}
              height={200}
              className="w-full h-full object-cover"
              priority
            />
          </div>
        </motion.div>

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="inline-flex items-center gap-2 glass-subtle border-accent-500/40 text-accent-500 mb-6"
        >
          <Sparkles size={12} />
          <span>منصة الأعمال الذكية · مدعومة بـ Claude 4.5</span>
        </motion.div>

        {/* Headline — massive display */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-black leading-[0.95] tracking-tight text-[clamp(3rem,9vw,8rem)] mb-6"
        >
          الذكاء الذي
          <br />
          <span className="bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 bg-clip-text text-transparent">
            يدير شركتك
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10"
        >
          مهام، مشاريع، اجتماعات، CRM، ومساعد ذكي — كلها في مساحة عمل واحدة، بتصميم يواكب ٢٠٢٦.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/login"
            data-cursor="grow"
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold text-base shadow-glow-primary hover:shadow-glow-accent transition-all hover:scale-[1.03]"
          >
            <span>ابدأ التجربة المجانية</span>
            <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>

          <Link
            href="#ai"
            data-cursor="grow"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full glass glass-hover font-bold text-base"
          >
            <Play size={16} className="text-accent-500" />
            <span>شاهد كيف يعمل</span>
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 text-white/40 text-xs flex flex-col items-center gap-2"
        >
          <span>اسحب للأسفل</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ═══ 2. Manifesto (scroll-pinned statement) ═══════════════════════════════

function Manifesto() {
  const words = 'نحن نبني مساحة عمل لا تشبه غيرها — ذكية، جميلة، وتعرف شركتك'.split(' ');

  return (
    <section
      id="manifesto"
      className="relative py-40 px-6 lg:px-10 max-w-6xl mx-auto"
    >
      <div className="flex items-baseline gap-4 mb-10">
        <span className="text-accent-500 text-sm font-mono">01 —</span>
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white/50">الفكرة</h2>
      </div>

      <h3 className="font-black text-[clamp(2rem,5.5vw,5rem)] leading-[1.1]">
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0.15, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            className="inline-block mr-3"
          >
            {word}
          </motion.span>
        ))}
      </h3>
    </section>
  );
}

// ═══ 3. Capabilities grid ════════════════════════════════════════════════

function Capabilities() {
  return (
    <section id="capabilities" className="relative py-32 px-6 lg:px-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-12">
        <span className="text-accent-500 text-sm font-mono">02 —</span>
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white/50">الإمكانيات</h2>
      </div>

      <h3 className="font-black text-[clamp(2rem,5vw,4.5rem)] leading-[1.1] max-w-3xl mb-16">
        كل ما يحتاجه فريقك في <span className="text-accent-500">مكان واحد</span>
      </h3>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CAPABILITIES.map((cap, i) => (
          <motion.div
            key={cap.title}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass glass-hover p-7 group"
            style={{ borderColor: `${cap.color}25` }}
            data-cursor="grow"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
              style={{
                background: `${cap.color}20`,
                border: `1px solid ${cap.color}50`,
                boxShadow: `0 0 30px ${cap.color}25`,
              }}
            >
              <cap.icon size={24} style={{ color: cap.color }} />
            </div>
            <h4 className="text-xl font-bold mb-2">{cap.title}</h4>
            <p className="text-sm text-white/60 leading-relaxed">{cap.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ═══ 4. AI Showcase ══════════════════════════════════════════════════════

function AIShowcase() {
  return (
    <section id="ai" className="relative py-32 px-6 lg:px-10 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-4 mb-12">
        <span className="text-accent-500 text-sm font-mono">03 —</span>
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white/50">المساعد الذكي</h2>
      </div>

      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: story */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
        >
          <h3 className="font-black text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] mb-6">
            ذكاء حقيقي،
            <br />
            <span className="bg-gradient-to-r from-accent-500 to-secondary-500 bg-clip-text text-transparent">
              ليس مجرد دردشة
            </span>
          </h3>

          <p className="text-base md:text-lg text-white/70 mb-8 leading-relaxed">
            المساعد يقرأ مهام شركتك، يحلّل التسليمات، يلخّص الاجتماعات، ويقترح خطوتك التالية — بكل ذكاء Claude 4.5.
          </p>

          <ul className="space-y-4 mb-8">
            {[
              'تلخيص Handover ذكي لمن يستلم الشغل',
              'أولويات اليوم من بين عشرات المهام',
              'تحليل الصفقات وخط الأنابيب',
              'notes اجتماعات منظمة تلقائياً',
            ].map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-accent-500/20 border border-accent-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap size={12} className="text-accent-500" />
                </div>
                <span className="text-white/80">{item}</span>
              </motion.li>
            ))}
          </ul>

          <Link
            href="/login"
            data-cursor="grow"
            className="inline-flex items-center gap-2 text-accent-500 font-bold hover:gap-3 transition-all"
          >
            <span>جرّب المساعد الآن</span>
            <ArrowUpRight size={18} />
          </Link>
        </motion.div>

        {/* Right: chat mockup */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="glass-strong p-6 glass-ring-accent space-y-4">
            {/* Fake chat messages */}
            <div className="flex justify-start">
              <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm">
                ما أولويات اليوم؟
              </div>
            </div>
            <div className="flex justify-end">
              <div className="glass rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] text-sm space-y-2">
                <p className="font-bold text-accent-500">أولوياتك اليوم:</p>
                <ul className="space-y-1 text-white/80">
                  <li>⚡ مراجعة عرض العميل (ahmed@co) — تأخر ٢ يوم</li>
                  <li>📊 اجتماع فريق التسويق الساعة ١١</li>
                  <li>✅ تسليم مشروع الـ API قبل الجمعة</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm">
                لخّص لي آخر تسليم
              </div>
            </div>
            <div className="flex justify-end">
              <div className="glass rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] text-sm">
                <span className="inline-block w-2 h-4 bg-accent-500 animate-pulse-glow" /> يفكّر...
              </div>
            </div>
          </div>

          {/* Floating AI orb badge */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-6 -left-6 w-16 h-16"
          >
            <div
              className="absolute inset-0 rounded-full animate-ai-orb-spin opacity-80"
              style={{
                background:
                  'conic-gradient(from 180deg at 50% 50%, #2E8BFF, #00D4FF, #14E0A4, #2E8BFF)',
              }}
            />
            <div className="absolute inset-[3px] rounded-full bg-dark-bg-900 overflow-hidden">
              <Image src="/icon.png" alt="AI" width={64} height={64} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══ 5. Marquee ══════════════════════════════════════════════════════════

function Marquee() {
  const words = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <section className="relative py-20 border-y border-white/5 overflow-hidden" data-cursor="grow">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            className="font-black text-[clamp(3rem,7vw,7rem)] tracking-tight text-white/5 hover:text-accent-500/80 transition-colors"
            style={{ WebkitTextStroke: '1px rgba(255,255,255,0.15)' }}
          >
            {w} ✦
          </span>
        ))}
      </motion.div>
    </section>
  );
}

// ═══ 6. Final CTA ════════════════════════════════════════════════════════

function FinalCTA() {
  return (
    <section className="relative py-40 px-6 lg:px-10 max-w-5xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-baseline gap-4 mb-8 justify-center">
          <span className="text-accent-500 text-sm font-mono">04 —</span>
          <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-white/50">ابدأ الآن</h2>
        </div>

        <h3 className="font-black text-[clamp(2.5rem,7vw,6rem)] leading-[0.95] mb-8">
          جاهز لتحويل
          <br />
          <span className="bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 bg-clip-text text-transparent">
            طريقة عملك؟
          </span>
        </h3>

        <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          ١٤ يوم تجربة مجانية · بدون بطاقة ائتمان · إلغاء في أي وقت
        </p>

        <Link
          href="/login"
          data-cursor="grow"
          className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold text-lg shadow-glow-primary hover:shadow-glow-accent transition-all hover:scale-[1.03]"
        >
          <span>ابدأ تجربتك المجانية</span>
          <ArrowUpRight size={22} />
        </Link>
      </motion.div>
    </section>
  );
}
