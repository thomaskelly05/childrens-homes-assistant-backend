'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const NAV = [
  { href: '/orb-residential', label: 'Home' },
  { href: '/orb-residential/ask', label: 'Ask ORB' },
  { href: '/orb-residential/shift-builder', label: 'Shift Builder' },
  { href: '/orb-residential/outputs', label: 'Outputs' },
]

export function OrbResidentialShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#111827]">
      <header className="border-b border-[#E5E7EB] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">ORB Residential</p>
            <p className="text-sm text-[#374151]">Powered by IndiCare Intelligence</p>
          </div>
          <p className="text-xs text-[#6B7280]">£9.99/month</p>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                  active ? 'bg-[#111827] text-white' : 'text-[#4B5563] hover:bg-[#E5E7EB]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
