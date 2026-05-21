import './styles.css'
import { LifeEchoNavigation } from '@/components/LifeEchoNavigation'

export const metadata = {
  title: 'LifeEcho',
  description: 'Emotional continuity and virtual memory box experience.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#050811] text-white antialiased">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(123,199,255,0.12),transparent_30%),radial-gradient(circle_at_bottom,rgba(248,215,122,0.10),transparent_30%)]" />

        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-6">
          <LifeEchoNavigation />
          {children}
        </div>
      </body>
    </html>
  )
}
