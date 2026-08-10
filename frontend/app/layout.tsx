import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Activity, ShieldAlert, Cpu, BarChart3, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'NETRA - Deepfake & Scam Detector',
  description: 'Premium AI-Powered Security Infrastructure',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col selection:bg-white/10">
        
        {/* Vercel-style Top Navigation */}
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex h-14 items-center px-4 md:px-6 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center transition-transform group-active:scale-95">
                  <ShieldCheck className="w-5 h-5 text-background" />
                </div>
                <span className="font-semibold tracking-tight text-lg">NETRA</span>
              </Link>
              
              <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                <Link href="/" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Analyzer
                </Link>
                <Link href="/trends" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Telemetry
                </Link>
                <Link href="/scam" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Scam Intel
                </Link>
                <Link href="/developers" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Developers
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="btn-secondary px-3 py-1.5 text-xs">Documentation</button>
              <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-semibold">
                S
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 relative">
          {/* Subtle background glow effect (Linear style) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-white/[0.02] rounded-full blur-3xl pointer-events-none -z-10"></div>
          {children}
        </main>
      </body>
    </html>
  )
}
