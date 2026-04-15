'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, type LucideIcon } from 'lucide-react';
import AppShell from './AppShell';

type Props = {
  title: string;
  icon: LucideIcon;
  color: string;
  tagline: string;
  features: string[];
};

/**
 * Shared "feature coming soon" page used for workspace features that don't yet
 * have a backend. Renders the glass design system so the page still feels
 * like a first-class part of the app — not an empty stub.
 */
export default function WorkspaceComingSoon({ title, icon: Icon, color, tagline, features }: Props) {
  return (
    <AppShell>
      <header className="glass-chrome sticky top-0 z-20 px-4 py-3 flex items-center gap-4">
        <Link href="/workspace" className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowRight size={18} />
        </Link>
        <h1 className="text-white font-black text-[17px] flex-1">{title}</h1>
      </header>

      <div className="px-4 py-10 pb-24 md:pb-16 max-w-3xl mx-auto">
        <div className="glass-strong p-8 text-center" style={{ boxShadow: `0 0 0 1px ${color}40 inset, 0 0 60px ${color}20` }}>
          <div
            className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center animate-pulse-glow"
            style={{ background: `${color}22`, border: `1px solid ${color}55` }}
          >
            <Icon size={36} style={{ color }} />
          </div>

          <h2 className="text-2xl font-black mb-2">{title}</h2>
          <p className="text-white/60 mb-8">{tagline}</p>

          <div className="glass-subtle gap-2 mx-auto mb-8 border-accent-500/40 text-accent-500">
            <Sparkles size={14} />
            <span>قريباً جداً</span>
          </div>

          <div className="text-right space-y-3">
            <p className="text-sm font-bold text-white/80 mb-3">المميزات المتوقعة:</p>
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 glass p-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: `${color}22`, color }}
                >
                  {i + 1}
                </div>
                <p className="text-sm text-white/80">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
