import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AppShell } from '@/components/indicare/app-shell'
import { OrbAccessibilityHydrator } from '@/components/orb-accessibility/orb-accessibility-hydrator'
import { AuthProvider } from '@/contexts/auth-context'
import { ActiveChildProvider } from '@/lib/context/active-child-context'
import { OperationalContextProvider } from '@/lib/operational/operational-context'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'IndiCare OS',
  description: 'Children\'s home operational workspace'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className={`${inter.variable} font-sans antialiased`}>
        <OrbAccessibilityHydrator />
        <AuthProvider>
          <ActiveChildProvider>
            <OperationalContextProvider>
              <AppShell>{children}</AppShell>
            </OperationalContextProvider>
          </ActiveChildProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
