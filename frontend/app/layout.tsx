import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NETRA — Eyes That See Through | Multi-Modal Forensic AI',
  description: 'Next-Generation Multi-Modal AI Forensic Engine for Deepfake & Cyber Threat Intelligence',
  icons: {
    icon: [
      { url: '/netra_favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/netra_favicon.svg',
    apple: '/apple-touch-icon.png',
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
        <link rel="icon" type="image/svg+xml" href="/netra_favicon.svg" />
        <link rel="icon" sizes="any" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body suppressHydrationWarning className="bg-[var(--page)] text-[var(--ink)] font-sans antialiased min-h-screen flex flex-col selection:bg-accent-tint selection:text-accent-ink">
        {children}
      </body>
    </html>
  )
}

