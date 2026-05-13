import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AppShell } from '@/components/indicare/app-shell'

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
