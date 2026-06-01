import './globals.css'
import './interaction-guard.css'
import './indicare-os-live.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NavigationRescue } from '@/components/indicare/navigation/navigation-rescue'
import { OsAppProviders } from '@/components/indicare/scope/os-app-providers'
import { OrbAccessibilityHydrator } from '@/components/orb-accessibility/orb-accessibility-hydrator'
import { AuthProvider } from '@/contexts/auth-context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

export const metadata: Metadata = {
  title: {
    default: 'ORB Residential',
    template: '%s · ORB Residential'
  },
  description:
    'The professional AI copilot for children\'s homes, powered by IndiCare Intelligence.',
  manifest: '/manifest.json',
  applicationName: 'ORB Residential',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ORB Residential'
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#05070d' }
  ],
  icons: {
    icon: [{ url: '/icons/orb-icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/orb-icon-192.png', sizes: '192x192', type: 'image/png' }]
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#05070d'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className={`${inter.className} ${inter.variable} antialiased`}>
        <OrbAccessibilityHydrator />
        <NavigationRescue />
        <AuthProvider>
          <OsAppProviders>{children}</OsAppProviders>
        </AuthProvider>
      </body>
    </html>
  )
}
