import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NETRA - Deepfake & Scam Detector',
  description: 'Multi-Modal Deepfake Detection and Scam Analysis Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <nav className="spacex-border-bottom sticky top-0 z-50 px-6 py-5 mb-8 flex justify-between items-center bg-black bg-opacity-90">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-[0.2em] text-white">NETRA</span>
            </div>
            <div className="flex gap-8 text-sm font-bold tracking-widest uppercase">
              <a href="/" className="hover:text-gray-400 transition-colors">Analyzer</a>
              <a href="/scam" className="hover:text-gray-400 transition-colors">Scam Detector</a>
              <a href="/trends" className="hover:text-gray-400 transition-colors">Trends</a>
              <a href="/reported" className="hover:text-gray-400 transition-colors">Reported</a>
            </div>
          </nav>
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
