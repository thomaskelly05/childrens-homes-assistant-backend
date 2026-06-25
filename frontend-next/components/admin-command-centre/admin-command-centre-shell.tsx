'use client'

import Link from 'next/link'
import { Lock, ShieldCheck, Terminal } from 'lucide-react'
import type { ReactNode } from 'react'

import { AdminDevelopmentBanner } from '@/components/admin-command-centre/admin-development-banner'
import { ADMIN_DATA_MODE_LABELS } from '@/lib/admin-command-centre/admin-data-mode'
import { getAdminDataMode } from '@/lib/admin-command-centre/admin-data-mode'
import type { AdminSectionId } from '@/lib/admin-command-centre/types'

const NAV_SECTIONS: { id: AdminSectionId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'providers', label: 'Providers' },
  { id: 'homes', label: 'Homes' },
  { id: 'live-usage', label: 'Live Usage' },
  { id: 'safety-flags', label: 'Safety Flags' },
  { id: 'abuse-bots', label: 'Abuse & Bots' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'offboarding', label: 'Offboarding' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'support', label: 'Support' },
  { id: 'audit-log', label: 'Audit Log' },
  { id: 'settings', label: 'Settings' }
]

export function AdminCommandCentreShell({
  children,
  activeSection = 'overview',
  onSectionChange
}: {
  children: ReactNode
  activeSection?: AdminSectionId
  onSectionChange: (section: AdminSectionId) => void
}) {
  const dataMode = getAdminDataMode()

  return (
    <div className="founder-dashboard min-h-screen" data-testid="admin-command-centre-shell">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-20 h-64 w-64 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-orange-600/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-rose-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <header className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10">
                  <Terminal className="h-6 w-6 text-amber-300" aria-hidden />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/80">
                    ORB Residential · Operational
                  </p>
                  <h1 className="text-3xl font-black tracking-[-0.05em] text-white md:text-4xl">
                    Admin Command Centre
                  </h1>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                Operational control of ORB Residential — users, providers, homes, usage metadata, access,
                onboarding, safety signals, support actions and audit logs. Separate from IndiCare Lab
                intelligence governance.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Admin only
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Data mode: {ADMIN_DATA_MODE_LABELS[dataMode]}
              </span>
              <div className="flex flex-wrap justify-end gap-3 text-xs font-semibold">
                <Link href="/founder" className="text-amber-300/80 transition hover:text-amber-200">
                  ← Intelligence Command Centre
                </Link>
                <Link href="/indicare-lab" className="text-slate-500 transition hover:text-slate-300">
                  IndiCare Lab
                </Link>
                <Link href="/orb" className="text-slate-500 transition hover:text-slate-300">
                  ORB Residential
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-slate-300">Safety note:</span> Operational admin console
                — not a care record viewer. No care record content is displayed here.
              </p>
            </div>
          </div>

          {dataMode === 'development' || dataMode === 'mixed' ? <AdminDevelopmentBanner /> : null}

          <nav
            className="flex flex-wrap gap-2"
            aria-label="Admin Command Centre sections"
            data-testid="admin-section-nav"
          >
            {NAV_SECTIONS.map((section) => {
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  data-testid={`admin-nav-${section.id}`}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    active
                      ? 'border-amber-400/40 bg-amber-500/15 text-amber-100'
                      : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {section.label}
                </button>
              )
            })}
          </nav>
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}
