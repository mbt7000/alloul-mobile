'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import AppShell from './AppShell';
import { isAuthenticated } from '@/lib/auth';

interface Props {
  title: string;
  icon: React.ReactNode;
  description: string;
  accentColor?: string;
}

export default function ComingSoon({ title, icon, description, accentColor = '#2E8BFF' }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  return (
    <AppShell>
      <header className="sticky top-0 z-20 bg-dark-bg-900/85 backdrop-blur-xl border-b border-primary/10 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px]">{title}</h1>
      </header>

      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center pb-24 md:pb-10">
        <div
          className="relative w-24 h-24 rounded-3xl flex items-center justify-center mb-6 border-2"
          style={{
            background: `${accentColor}15`,
            borderColor: `${accentColor}44`,
            boxShadow: `0 0 40px ${accentColor}30`,
          }}
        >
          <div className="absolute inset-0 rounded-3xl animate-pulse" style={{ background: `${accentColor}10` }} />
          <div style={{ color: accentColor }} className="relative">
            {icon}
          </div>
        </div>
        <h2 className="text-white font-black text-2xl mb-3">{title}</h2>
        <p className="text-white/50 text-sm leading-relaxed max-w-xs mb-6">
          {description}
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
          <Sparkles size={14} className="text-accent" />
          <span className="text-accent text-xs font-bold">قريباً جداً</span>
        </div>
      </div>
    </AppShell>
  );
}
