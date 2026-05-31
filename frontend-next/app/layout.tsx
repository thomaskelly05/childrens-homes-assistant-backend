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
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: 'ORB Residential',
    template: '%s · ORB Residential'
  },
  description:
    'The professional AI copilot for children\'s homes, powered by IndiCare Intelligence.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className={`${inter.variable} font-sans antialiased`}>
        <OrbAccessibilityHydrator />
        <NavigationRescue />
        <AuthProvider>
          <OsAppProviders>{children}</OsAppProviders>
        </AuthProvider>
      </body>
    </html>
  )
}
