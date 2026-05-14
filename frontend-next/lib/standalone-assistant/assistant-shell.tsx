'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

import { assistantNavItems } from './config'

export function StandaloneAssistantShell({
  children,
  eyebrow = 'Standalone AI product',
  title = 'IndiCare Assistant',
  subtitle = 'General and children homes sector assistant. No live OS child, home or staff records are available here.'
}: {
  children: ReactNode
  eyebrow?: string
  title?: string
  subtitle?: string
}) {
  const pathname = usePathname()

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-slate-950 dark:bg-[#08090c] dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200/80 bg-white/90 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d0f14]/95 lg:border-b-0 lg:border-r">
          <Link href="/assistant" className="flex items-center gap-3 rounded-3xl px-3 py-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">AI</span>
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">IndiCare</span>
              <span className="block text-lg font-black tracking-[-0.04em]">Assistant</span>
            </span>
          </Link>

          <nav aria-label="Standalone assistant navigation" className="mt-3 grid gap-1">
            {assistantNavItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/assistant' && pathname?.startsWith(item.href))
              const Icon = item.icon
              return (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    active
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-5 rounded-3xl border border-cyan-200/70 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
            Standalone mode: uploads and typed content stay in assistant context. OS record retrieval is blocked.
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          <header className="border-b border-slate-200/80 bg-[#f7f7f4]/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#08090c]/90 md:px-8">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{eyebrow}</p>
                <h1 className="mt-1 text-3xl font-black tracking-[-0.06em]">{title}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
              </div>
              <Link href="/assistant/apps/voice" className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white">
                Voice mode
              </Link>
            </div>
          </header>
          <div className="min-h-0 flex-1 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        </section>
      </div>
    </main>
  )
}

export function StandaloneOrbVisual({ large = false }: { large?: boolean }) {
  return (
    <div className={`relative flex ${large ? 'h-40 w-40' : 'h-16 w-16'} items-center justify-center`}>
      <span className="absolute inset-0 rounded-full bg-cyan-300/30 blur-2xl motion-safe:animate-pulse" />
      <span className="absolute inset-4 rounded-full bg-blue-400/30 blur-xl" />
      <span className="absolute inset-0 rounded-full border border-white/60 bg-gradient-to-br from-white via-blue-100 to-cyan-400 shadow-[0_0_70px_rgba(34,211,238,0.42)] motion-safe:animate-pulse" />
      <span className="relative h-1/3 w-1/3 rounded-full bg-white/80 blur-sm" />
    </div>
  )
}
