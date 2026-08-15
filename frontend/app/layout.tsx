import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://netraai-i1pl.onrender.com'),
  title: 'NETRA — मायातीतं सत्यस्य चक्षुः (The Architecture of Truth) | Multi-Modal Forensic AI',
  description: 'मायातीतं सत्यस्य चक्षुः — Real-Time Multi-Modal AI Forensic Engine Defending India\'s Digital Media Integrity',
  openGraph: {
    title: 'NETRA — मायातीतं सत्यस्य चक्षुः (The Architecture of Truth) | Multi-Modal Forensic AI',
    description: 'मायातीतं सत्यस्य चक्षुः — Real-Time Multi-Modal AI Forensic Engine Defending India\'s Digital Media Integrity',
    url: 'https://netraai-i1pl.onrender.com',
    siteName: 'NETRA Forensic AI',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/og-image.png?v=7',
        width: 1200,
        height: 630,
        alt: 'NETRA — Architecture of Truth',
      },
      {
        url: '/og-icon.png?v=7',
        width: 512,
        height: 512,
        alt: 'NETRA Truth Mark Emblem',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NETRA — मायातीतं सत्यस्य चक्षुः (The Architecture of Truth)',
    description: 'मायातीतं सत्यस्य चक्षुः — Real-Time Multi-Modal AI Forensic Engine Defending India\'s Digital Media Integrity',
    images: ['/og-image.png?v=7'],
  },
  icons: {
    icon: [
      { url: '/netra_favicon.svg?v=7', type: 'image/svg+xml' },
      { url: '/favicon.svg?v=7', type: 'image/svg+xml' },
      { url: '/icon.png?v=7', type: 'image/png', sizes: '256x256' },
      { url: '/favicon.ico?v=7', sizes: 'any' },
    ],
    shortcut: '/netra_favicon.svg?v=7',
    apple: '/apple-touch-icon.png?v=7',
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
        <meta property="og:title" content="NETRA — मायातीतं सत्यस्य चक्षुः (The Architecture of Truth) | Multi-Modal Forensic AI" />
        <meta property="og:description" content="मायातीतं सत्यस्य चक्षुः — Real-Time Multi-Modal AI Forensic Engine Defending India's Digital Media Integrity" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://netraai-i1pl.onrender.com" />
        <meta property="og:image" content="https://netraai-i1pl.onrender.com/og-image.png?v=7" />
        <meta property="og:image:secure_url" content="https://netraai-i1pl.onrender.com/og-image.png?v=7" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="NETRA — Architecture of Truth" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NETRA — मायातीतं सत्यस्य चक्षुः (The Architecture of Truth)" />
        <meta name="twitter:description" content="मायातीतं सत्यस्य चक्षुः — Real-Time Multi-Modal AI Forensic Engine Defending India's Digital Media Integrity" />
        <meta name="twitter:image" content="https://netraai-i1pl.onrender.com/og-image.png?v=7" />
        <link rel="image_src" href="https://netraai-i1pl.onrender.com/og-icon.png?v=7" />
        <link rel="icon" type="image/svg+xml" href="/netra_favicon.svg?v=7" />
        <link rel="icon" type="image/png" sizes="256x256" href="/icon.png?v=7" />
        <link rel="icon" sizes="any" href="/favicon.ico?v=7" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=7" />
      </head>
      <body suppressHydrationWarning className="bg-[var(--page)] text-[var(--ink)] font-sans antialiased min-h-screen flex flex-col selection:bg-accent-tint selection:text-accent-ink">
        {children}
      </body>
    </html>
  )
}

