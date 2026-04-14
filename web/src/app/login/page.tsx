'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { login, getCurrentUser } from '@/lib/api-client';
import { setToken, setCachedUser, isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      setToken(res.access_token);
      const me = await getCurrentUser();
      setCachedUser(me);
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل الدخول');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[140px]" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-secondary/15 blur-[160px]" />

      <div className="w-full max-w-md relative">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-logo items-center justify-center shadow-glow-primary mb-4">
            <span className="text-white font-black text-xl">A<span className="text-secondary-200">Q</span></span>
          </div>
          <h1 className="text-white font-black text-3xl">ALLOUL<span className="text-secondary">&Q</span></h1>
          <p className="text-white/50 text-sm mt-2">منصة الأعمال الذكية</p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-primary/20 bg-dark-bg-800/80 backdrop-blur-xl p-8 space-y-5 shadow-glow-primary"
        >
          <h2 className="text-white font-bold text-xl mb-2">تسجيل الدخول</h2>
          <p className="text-white/50 text-sm">ادخل بحسابك من التطبيق</p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/30">
              <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
              <span className="text-danger text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="text-white/60 text-xs font-bold block mb-2">البريد الإلكتروني</label>
            <div className="relative">
              <Mail size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
              />
            </div>
          </div>

          <div>
            <label className="text-white/60 text-xs font-bold block mb-2">كلمة المرور</label>
            <div className="relative">
              <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-11 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-gradient-primary text-white font-bold py-3.5 rounded-xl shadow-glow-primary hover:shadow-glow-accent transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            <span>{loading ? 'جاري الدخول...' : 'دخول'}</span>
          </button>

          <div className="text-center text-white/40 text-xs pt-2">
            ما عندك حساب؟{' '}
            <Link href="/start-trial" className="text-accent hover:underline">
              ابدأ تجربة مجانية
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
