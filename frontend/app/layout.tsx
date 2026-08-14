import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NETRA — Beyond Illusion. The Architecture of Truth | Multi-Modal Forensic AI',
  description: 'Beyond Illusion. The Architecture of Truth — Real-Time Multi-Modal AI Forensic Engine Defending India\'s Digital Media Integrity',
  icons: {
    icon: [
      { url: '/netra_favicon.svg?v=4', type: 'image/svg+xml' },
      { url: '/favicon.svg?v=4', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=4', sizes: 'any' },
    ],
    shortcut: '/netra_favicon.svg?v=4',
    apple: '/apple-touch-icon.png?v=4',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark font-sans" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/netra_favicon.svg?v=4" />
        <link rel="icon" sizes="any" href="/favicon.ico?v=4" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" />
      </head>
      <body suppressHydrationWarning className="bg-[var(--page)] text-[var(--ink)] font-sans antialiased min-h-screen flex flex-col selection:bg-accent-tint selection:text-accent-ink">
        {children}
      </body>
    </html>
  )
}

