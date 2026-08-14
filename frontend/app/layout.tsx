import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NETRA — Eyes That See Through | Multi-Modal Forensic AI',
  description: 'Next-Generation Multi-Modal AI Forensic Engine for Deepfake & Cyber Threat Intelligence',
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
    <html lang="en" className="dark font-sans">
      <head>
        <link rel="icon" type="image/svg+xml" href="/netra_favicon.svg" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/netra_favicon.svg" />
      </head>
      <body className="bg-[var(--page)] text-[var(--ink)] font-sans antialiased min-h-screen flex flex-col selection:bg-accent-tint selection:text-accent-ink">
        {children}
      </body>
    </html>
  )
}

