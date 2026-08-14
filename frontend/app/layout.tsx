import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NETRA — मायातीतं सत्यस्य चक्षुः (The Architecture of Truth) | Multi-Modal Forensic AI',
  description: 'मायातीतं सत्यस्य चक्षुः — Real-Time Multi-Modal AI Forensic Engine Defending India\'s Digital Media Integrity',
  icons: {
    icon: [
      { url: '/netra_favicon.svg?v=5', type: 'image/svg+xml' },
      { url: '/favicon.svg?v=5', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=5', sizes: 'any' },
    ],
    shortcut: '/netra_favicon.svg?v=5',
    apple: '/apple-touch-icon.png?v=5',
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
        <link rel="icon" type="image/svg+xml" href="/netra_favicon.svg?v=5" />
        <link rel="icon" sizes="any" href="/favicon.ico?v=5" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=5" />
      </head>
      <body suppressHydrationWarning className="bg-[var(--page)] text-[var(--ink)] font-sans antialiased min-h-screen flex flex-col selection:bg-accent-tint selection:text-accent-ink">
        {children}
      </body>
    </html>
  )
}

