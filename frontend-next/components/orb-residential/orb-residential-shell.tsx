'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const NAV = [
  { href: '/orb', label: 'Chat' },
  { href: '/orb/shift-builder', label: 'Shift Builder' },
  { href: '/orb/outputs', label: 'Saved' },
  { href: '/orb/projects', label: 'Projects' },
]

export function OrbResidentialShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#EEF2FF_0,#F8FAFC_34%,#F3F4F6_100%)] text-[#111827]">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/orb" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#111827] to-[#4338CA] text-lg text-white shadow-lg shadow-indigo-200">
              ✦
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-[#111827]">ORB Residential</p>
              <p className="truncate text-xs text-[#6B7280]">Powered by IndiCare Intelligence</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-[#E5E7EB] bg-white/80 p-1 shadow-sm md:flex">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href !== '/orb' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition ${
                    active ? 'bg-[#111827] text-white shadow-sm' : 'text-[#4B5563] hover:bg-[#F3F4F6]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/orb/access"
              className="hidden rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#4B5563] shadow-sm hover:bg-[#F9FAFB] sm:inline-flex"
            >
              £9.99/month
            </Link>
            <Link
              href="/orb/onboarding"
              className="rounded-full bg-[#111827] px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-300 hover:bg-[#1F2937]"
            >
              Personalise
            </Link>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/orb' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                  active ? 'bg-[#111827] text-white' : 'bg-white/70 text-[#4B5563]'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-7">{children}</main>
    </div>
  )
}
