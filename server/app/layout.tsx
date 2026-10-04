import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { config } from '@/lib/config'

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'light dark',
}

export const metadata: Metadata = {
  title: {
    default: config.site.name,
    template: `%s | ${config.site.name}`,
  },
  description: config.site.description,
  keywords: [
    'QuickERP', 
    'IIT Kharagpur ERP', 
    'Chrome Extension', 
    'ERP Automation', 
    'Auto Login', 
    'OTP Integration', 
    'Gmail OTP', 
    'IIT KGP', 
    'Student Portal',
    'AES Encryption',
    'Secure Login',
    'One Click Login',
    'ERP Assistant',
    'Academic Portal'
  ],
  authors: [{ name: 'QuickERP Team', url: 'https://quickerp.rknain.com' }],
  creator: 'QuickERP Team',
  publisher: 'QuickERP',
  metadataBase: new URL(config.site.url),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: config.site.url,
    title: config.site.name,
    description: config.site.description,
    siteName: 'QuickERP',
    images: [
      {
        url: '/images/extension-main.png',
        width: 1200,
        height: 630,
        alt: 'QuickERP Chrome Extension - Fast, Secure Login for IIT Kharagpur ERP',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: config.site.name,
    description: config.site.description,
    images: ['/images/extension-main.png'],
    creator: '@quickerp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  manifest: '/site.webmanifest',
}

// Global Structured Data
const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "QuickERP",
  "url": "https://quickerp.rknain.com",
  "logo": "https://quickerp.rknain.com/assets/logo-quickerp.png",
  "description": "QuickERP Chrome extension for automated IIT Kharagpur ERP login with secure credential storage and Gmail OTP integration.",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "quickerp@rknain.com",
    "contactType": "customer service"
  },
  "sameAs": [
    "https://github.com/iamrknain/quickerp"
  ]
}

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "QuickERP",
  "url": "https://quickerp.rknain.com",
  "description": "Chrome extension for automated IIT Kharagpur ERP login with secure credential storage and Gmail OTP integration.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://quickerp.rknain.com/faqs?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Global Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
          <Navbar />
          <main className="pt-[70px]">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
