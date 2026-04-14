import type { Metadata } from 'next'
import { Inter, Tajawal } from 'next/font/google'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ALLOUL&Q — منصة الأعمال الذكية',
  description: 'مساحة عمل ذكية للفرق الحديثة — مهام، مشاريع، اجتماعات، AI، كل شيء في مكان واحد.',
  keywords: ['ALLOUL', 'Q', 'workspace', 'tasks', 'projects', 'AI', 'منصة', 'أعمال', 'SaaS'],
  authors: [{ name: 'ALLOUL&Q' }],
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: 'https://alloul.app',
    title: 'ALLOUL&Q — منصة الأعمال الذكية',
    description: 'مساحة عمل ذكية للفرق الحديثة',
    siteName: 'ALLOUL&Q',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050810',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${tajawal.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0F172A" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-dark-bg-900 text-white antialiased font-arabic">
        <div className="flex min-h-screen flex-col relative overflow-x-hidden">
          {/* Global brand glow orbs (fixed behind everything) */}
          <div className="pointer-events-none fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[140px]" />
          {children}
        </div>
      </body>
    </html>
  )
}
