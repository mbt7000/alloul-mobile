'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home, Search, Bell, MessageSquare, Bookmark, User, Briefcase,
  Sparkles, MoreHorizontal, Plus, Menu, X,
} from 'lucide-react';

// ALLOUL&Q web shell — mirrors the mobile app's navigation
// Left sidebar (desktop) → mobile bottom nav equivalent
// Main column → app content (feed, profile, workspace, etc.)
// Right rail (desktop) → suggestions / trends

const NAV_ITEMS = [
  { href: '/',              icon: Home,          label: 'الرئيسية' },
  { href: '/explore',       icon: Search,        label: 'استكشاف' },
  { href: '/notifications', icon: Bell,          label: 'الإشعارات' },
  { href: '/messages',      icon: MessageSquare, label: 'الرسائل' },
  { href: '/bookmarks',     icon: Bookmark,      label: 'المحفوظات' },
  { href: '/workspace',     icon: Briefcase,     label: 'عالم الأعمال' },
  { href: '/profile',       icon: User,          label: 'الملف الشخصي' },
];

function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-2xl bg-gradient-logo flex items-center justify-center shadow-glow-primary flex-shrink-0"
    >
      <span className="text-white font-black text-sm leading-none tracking-tight">
        A<span className="text-secondary-200">Q</span>
      </span>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark-bg-900 text-white relative">
      {/* Background glow orbs */}
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[140px]" />

      {/* ─── Desktop layout: 3 columns ────────────────────────────────── */}
      <div className="max-w-[1300px] mx-auto flex">
        {/* LEFT SIDEBAR (desktop) */}
        <aside className="hidden md:flex flex-col w-[88px] lg:w-[275px] min-h-screen sticky top-0 px-3 py-4 border-l border-primary/10">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 px-3 py-3 mb-2 hover:bg-white/5 rounded-2xl transition-colors">
            <LogoMark size={40} />
            <div className="hidden lg:flex flex-col">
              <span className="text-white font-black text-base leading-none">
                ALLOUL<span className="text-secondary">&Q</span>
              </span>
              <span className="text-white/40 text-[9px] mt-1">منصة الأعمال الذكية</span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-1 mt-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3 rounded-full transition-colors ${
                    active
                      ? 'bg-primary/15 text-white border border-primary/40'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  <span className={`hidden lg:block text-[15px] ${active ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Post CTA */}
          <Link
            href="/compose"
            className="mt-4 w-full bg-gradient-primary text-white font-bold text-sm py-3 px-5 rounded-full shadow-glow-primary hover:shadow-glow-accent transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span className="hidden lg:inline">نشر منشور</span>
          </Link>

          {/* User card */}
          <div className="mt-4 flex items-center gap-3 px-3 py-3 rounded-full hover:bg-white/5 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gradient-logo flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">أنا</span>
            </div>
            <div className="hidden lg:flex flex-col flex-1 min-w-0">
              <span className="text-white text-sm font-bold truncate">ضيف</span>
              <span className="text-white/40 text-xs truncate">@guest</span>
            </div>
            <MoreHorizontal size={18} className="hidden lg:block text-white/60 flex-shrink-0" />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 border-l border-primary/10 min-h-screen max-w-[600px]">
          {children}
        </main>

        {/* RIGHT RAIL (desktop lg+) */}
        <aside className="hidden lg:block w-[340px] min-h-screen sticky top-0 px-6 py-4">
          {/* Search */}
          <div className="sticky top-0 bg-dark-bg-900/85 backdrop-blur-xl pt-2 pb-3 -mt-2">
            <div className="relative">
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="ابحث في ALLOUL&Q"
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 pr-11 pl-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
              />
            </div>
          </div>

          {/* Trending */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl mt-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <h2 className="text-white font-black text-lg">ما يحدث الآن</h2>
            </div>
            {[
              { tag: '#ALLOUL_Q', count: '12.4K' },
              { tag: '#الذكاء_الاصطناعي', count: '8.2K' },
              { tag: '#شركات', count: '5.1K' },
              { tag: '#إدارة_المهام', count: '3.8K' },
            ].map((t) => (
              <div key={t.tag} className="px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
                <div className="text-white/50 text-[11px] mb-0.5">يتصدّر في الأعمال</div>
                <div className="text-white font-bold text-sm">{t.tag}</div>
                <div className="text-white/40 text-[11px] mt-0.5">{t.count} منشور</div>
              </div>
            ))}
            <div className="px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
              <span className="text-accent text-sm">عرض المزيد</span>
            </div>
          </div>

          {/* Who to follow */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl mt-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <h2 className="text-white font-black text-lg">من تتابع</h2>
            </div>
            {[
              { name: 'ALLOUL&Q', handle: '@alloul_q', bio: 'منصة الأعمال الذكية' },
              { name: 'Alloul AI', handle: '@alloul_ai', bio: 'المساعد الذكي' },
              { name: 'Alloul News', handle: '@alloul_news', bio: 'آخر التحديثات' },
            ].map((u) => (
              <div key={u.handle} className="px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03] transition-colors">
                <div className="w-11 h-11 rounded-full bg-gradient-logo flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{u.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-white font-bold text-sm truncate">{u.name}</span>
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.866.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.356-.643.378-.022.003-.045.003-.067.003-.236 0-.463-.093-.63-.26l-2.503-2.5c-.347-.347-.347-.91 0-1.26.348-.345.91-.345 1.26 0l1.744 1.74 3.697-5.546c.272-.41.824-.52 1.233-.246.41.273.519.826.246 1.234z"/>
                    </svg>
                  </div>
                  <div className="text-white/40 text-xs truncate">{u.handle}</div>
                </div>
                <button className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-white/90 transition-colors flex-shrink-0">
                  متابعة
                </button>
              </div>
            ))}
          </div>

          {/* Footer mini */}
          <div className="mt-4 px-4 text-[11px] text-white/40 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/pricing" className="hover:text-white/70">الأسعار</Link>
            <Link href="/about" className="hover:text-white/70">عن</Link>
            <a href="#" className="hover:text-white/70">الخصوصية</a>
            <a href="#" className="hover:text-white/70">الشروط</a>
            <span>© 2026 Alloul Digital</span>
          </div>
        </aside>
      </div>

      {/* ─── MOBILE BOTTOM NAV ─────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-dark-bg-900/95 backdrop-blur-xl border-t border-primary/10">
        <div className="flex items-center justify-around h-14 px-2">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  active ? 'text-primary' : 'text-white/60'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile header (top) */}
      <header className="md:hidden sticky top-0 z-30 bg-dark-bg-900/90 backdrop-blur-xl border-b border-primary/10 px-4 h-14 flex items-center justify-between">
        <button onClick={() => setMobileNavOpen(true)} className="p-2 -ml-2">
          <Menu size={22} />
        </button>
        <LogoMark size={32} />
        <Link href="/notifications" className="p-2 -mr-2 relative">
          <Bell size={22} />
        </Link>
      </header>

      {/* Mobile side drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <div
            className="absolute top-0 right-0 bottom-0 w-72 bg-dark-bg-900 border-l border-primary/10 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <LogoMark />
              <button onClick={() => setMobileNavOpen(false)} className="p-2">
                <X size={22} />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
                      active ? 'bg-primary/15 text-white' : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={20} />
                    <span className={active ? 'font-bold' : ''}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <Link
              href="/pricing"
              onClick={() => setMobileNavOpen(false)}
              className="mt-6 block text-center bg-gradient-primary text-white font-bold text-sm py-3 rounded-full shadow-glow-primary"
            >
              الترقية
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
