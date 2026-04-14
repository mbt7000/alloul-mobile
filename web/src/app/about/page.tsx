import Link from 'next/link';
import { Target, Users, Zap, Heart, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const VALUES = [
  { icon: Target, title: 'دقة وتركيز', desc: 'نبني أدوات تحل مشاكل حقيقية — بدون حشو.' },
  { icon: Users, title: 'الفريق أولاً', desc: 'كل ميزة مصممة لتسهيل التعاون بين الفرق.' },
  { icon: Zap, title: 'سرعة وأداء', desc: 'تطبيق سلس على iOS و Android، وواجهة ويب قوية.' },
  { icon: Heart, title: 'شغف حقيقي', desc: 'نبني ما نحبه — ونحب ما نبنيه.' },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <span className="text-accent text-xs font-bold">من نحن</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
              قصة <span className="bg-gradient-logo bg-clip-text text-transparent">ALLOUL&Q</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
              بدأنا ALLOUL&Q من فكرة بسيطة: الفرق الحديثة تستحق منصة واحدة نظيفة —
              بدل ما تتنقل بين 10 تطبيقات مختلفة. منصة تجمع المهام والاجتماعات و AI و CRM في مكان واحد،
              بواجهة عربية نظيفة، وأداء عالمي.
            </p>
          </div>

          {/* Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 p-8 transition-all backdrop-blur-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-logo flex items-center justify-center mb-5 shadow-glow-primary">
                  <v.icon size={20} className="text-white" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">{v.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/start-trial"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-primary text-white text-sm font-bold shadow-glow-primary hover:shadow-glow-accent transition-all"
            >
              <span>ابدأ تجربتك المجانية</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
