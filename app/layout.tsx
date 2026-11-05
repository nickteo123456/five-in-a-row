import type React from 'react'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Providers } from '@/components/providers'
import { ServiceWorker } from '@/components/service-worker'
import { Toaster } from 'sonner'
import { Suspense } from 'react'
import './globals.css'

const description =
  'An educational Five-in-a-Row game: answer a Python question correctly to place your piece.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: { default: 'Connect Five: Python Edition', template: '%s | Connect Five' },
  description,
  applicationName: 'Connect Five',
  openGraph: {
    title: 'Connect Five: Python Edition',
    description,
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: 'Connect Five', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#04131a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Suspense fallback={null}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            forcedTheme="dark"
            disableTransitionOnChange
          >
            <Providers>{children}</Providers>
          </ThemeProvider>
        </Suspense>
        <Toaster position="bottom-center" richColors visibleToasts={2} duration={3000} />
        <ServiceWorker />
        <Analytics />
      </body>
    </html>
  )
}
