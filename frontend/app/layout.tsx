import './globals.css'
import type { Metadata } from 'next'
import { Lexend, JetBrains_Mono } from 'next/font/google'

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
  weight: ['300', '400', '500', '600', '700', '800'],
  preload: false,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
})

export const metadata: Metadata = {
  title: 'NETRA — Eyes That See Through | Multi-Modal Forensic AI',
  description: 'Next-Generation Multi-Modal AI Forensic Engine for Deepfake & Voice Clone Detection',
  icons: {
    icon: [
      { url: '/netra_favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/netra_favicon.svg',
    apple: '/netra_favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${lexend.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/netra_favicon.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/netra_favicon.svg" />
      </head>
      <body className="font-sans bg-[#08080a] text-neutral-100 antialiased min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  )
}
