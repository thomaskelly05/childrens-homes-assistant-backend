'use client'

import Link from 'next/link'
import { Lock, Orbit, Shield } from 'lucide-react'
import type { ReactNode } from 'react'

import { DevelopmentModeBanner } from '@/components/indicare-lab/development-mode-banner'
import { LAB_DATA_MODE_LABELS } from '@/lib/indicare-lab/lab-data-mode'
import type { LabDataMode } from '@/lib/indicare-lab/lab-data-mode'
import type { LabSectionId } from '@/lib/indicare-lab/types'

const NAV_SECTIONS: { id: LabSectionId; label: string; hash: string }[] = [
  { id: 'overview', label: 'Overview', hash: '#overview' },
  { id: 'brain', label: 'Brain gaps', hash: '#brain-gaps' },
  { id: 'knowledge', label: 'Knowledge', hash: '#knowledge-gaps' },
  { id: 'ui-ux', label: 'UI / UX', hash: '#ui-ux-gaps' },
  { id: 'technology', label: 'Technology', hash: '#technology-watch' },
  { id: 'review-board', label: 'Review board', hash: '#review-board' },
  { id: 'shadow-review', label: 'Shadow review', hash: '#shadow-review' },
  { id: 'review-events', label: 'Review events', hash: '#review-events' },
  { id: 'real-suggestions', label: 'Real suggestions', hash: '#real-suggestions' },
  { id: 'evidence-of-improvement', label: 'Evidence log', hash: '#evidence-of-improvement' },
  { id: 'pattern-intelligence', label: 'Patterns', hash: '#pattern-intelligence' },
  { id: 'evaluation-benchmarks', label: 'Benchmarks', hash: '#evaluation-benchmarks' },
  { id: 'review-test', label: 'Review test', hash: '#review-test' },
  { id: 'experiments', label: 'Experiments', hash: '#experiments' },
  { id: 'approvals', label: 'Approvals', hash: '#approvals' },
  { id: 'roadmap', label: 'Roadmap', hash: '#roadmap' },
  { id: 'build-briefs', label: 'Build briefs', hash: '#build-briefs' }
]

export function IndiCareLabShell({
  children,
  activeSection = 'overview',
  dataMode,
  investorSafeView = false,
  onInvestorSafeViewChange
}: {
  children: ReactNode
  activeSection?: LabSectionId
  dataMode?: LabDataMode
  investorSafeView?: boolean
  onInvestorSafeViewChange?: (enabled: boolean) => void
}) {
  return (
    <div className="founder-dashboard min-h-screen" data-testid="indicare-lab-shell">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <header className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10">
                  <Orbit className="h-6 w-6 text-cyan-300" aria-hidden />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">
                    ORB Residential · Founder only
                  </p>
                  <h1 className="text-3xl font-black tracking-[-0.05em] text-white md:text-4xl">IndiCare Lab</h1>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                Intelligence and improvement console for ORB Residential. Evidence-based suggestions from shadow
                review, patterns, and synthetic benchmarks. Supports founder decisions — does not guarantee
                compliance or deploy high-risk changes silently.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Founder access only
              </span>
              {dataMode ? (
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Data mode: {LAB_DATA_MODE_LABELS[dataMode]}
                </span>
              ) : null}
              <Link
                href="/founder"
                className="text-xs font-semibold text-cyan-300/80 transition hover:text-cyan-200"
              >
                ← Command Centre
              </Link>
            </div>
          </div>

          <DevelopmentModeBanner />

          {onInvestorSafeViewChange ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onInvestorSafeViewChange(!investorSafeView)}
                data-testid="investor-safe-toggle"
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                  investorSafeView
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="h-4 w-4" aria-hidden />
                Investor-safe view {investorSafeView ? 'on' : 'off'}
              </button>
              {investorSafeView ? (
                <p className="text-xs text-slate-500">
                  Demo data hidden · Synthetic benchmarks labelled · Real shadow review only · No misleading
                  claims
                </p>
              ) : null}
            </div>
          ) : null}

          <nav
            aria-label="IndiCare Lab sections"
            className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]"
          >
            {NAV_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={section.hash}
                className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  activeSection === section.id
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {section.label}
              </a>
            ))}
          </nav>
        </header>

        <main className="space-y-8">{children}</main>

        <footer className="border-t border-white/5 pt-6 text-center text-xs text-slate-600">
          IndiCare Lab · Internal evaluation only · Synthetic review perspectives are AI-modelled, not human
          experts · No compliance guarantee
        </footer>
      </div>
    </div>
  )
}
