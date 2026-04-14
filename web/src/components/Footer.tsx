import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative mt-32 border-t border-primary/10 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-logo flex items-center justify-center shadow-glow-primary">
                <span className="text-white font-black text-sm">A<span className="text-secondary-200">Q</span></span>
              </div>
              <span className="text-white font-black text-lg">ALLOUL<span className="text-secondary">&Q</span></span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              منصة الأعمال الذكية — مساحة عمل موحّدة لفرقك، مشاريعك، وعملائك.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">المنتج</h4>
            <ul className="space-y-2 text-white/60 text-xs">
              <li><Link href="/pricing" className="hover:text-white transition-colors">الأسعار</Link></li>
              <li><Link href="/start-trial" className="hover:text-white transition-colors">ابدأ مجاناً</Link></li>
              <li><Link href="/enterprise" className="hover:text-white transition-colors">Enterprise</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">الشركة</h4>
            <ul className="space-y-2 text-white/60 text-xs">
              <li><Link href="/about" className="hover:text-white transition-colors">من نحن</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">تواصل</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">الخصوصية</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">الشروط</Link></li>
            </ul>
          </div>

          {/* Download */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">حمّل التطبيق</h4>
            <ul className="space-y-2 text-white/60 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">iOS — App Store</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Android — Google Play</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs">
            © 2026 Alloul Digital. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://alloul.app" className="text-white/40 hover:text-white text-xs">alloul.app</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
