'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/pricing', label: 'الأسعار' },
  { href: '/enterprise', label: 'Enterprise' },
  { href: '/start-trial', label: 'ابدأ مجاناً' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-dark-bg-900/70 border-b border-primary/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-logo flex items-center justify-center shadow-glow-primary group-hover:shadow-glow-secondary transition-shadow">
            <span className="text-white font-black text-sm leading-none tracking-tight">A<span className="text-secondary-200">Q</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-lg leading-none">ALLOUL<span className="text-secondary">&Q</span></span>
            <span className="text-white/40 text-[9px] font-medium leading-none mt-0.5">منصة الأعمال الذكية</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/start-trial" className="text-white/80 hover:text-white text-sm font-medium">
            تسجيل الدخول
          </Link>
          <Link
            href="/pricing"
            className="px-5 py-2 rounded-xl bg-gradient-primary text-white text-sm font-bold shadow-glow-primary hover:shadow-glow-accent transition-all"
          >
            ابدأ الآن
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setOpen(!open)}
          aria-label="menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-primary/10 bg-dark-bg-900/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block text-white/80 hover:text-white text-sm font-medium py-2"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              className="block text-center px-5 py-3 rounded-xl bg-gradient-primary text-white text-sm font-bold mt-4"
            >
              ابدأ الآن
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
