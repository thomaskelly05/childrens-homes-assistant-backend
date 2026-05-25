'use client'

import Link from 'next/link'

import { staffProfileOrbHref, type StaffProfileOsDashboard } from '@/lib/os-api/staff-profile-os'

const QUICK_LABELS: Record<string, string> = {
  actions: 'Actions',
  training: 'Training',
  supervision: 'Supervision',
  probation: 'Probation',
  handover: 'Handover',
  wellbeing: 'Wellbeing/support',
  workforce_journey: 'Workforce journey'
}

export function StaffProfileOsQuickCards({ dashboard }: { dashboard: StaffProfileOsDashboard }) {
  const routes = dashboard.routes
  const cards = [
    { key: 'actions', href: routes.actions, count: dashboard.action_count },
    { key: 'training', href: routes.training_matrix, count: dashboard.training_due_count },
    { key: 'supervision', href: routes.supervision, count: dashboard.supervision_due_count },
    { key: 'probation', href: routes.probation, count: dashboard.probation_review_count },
    { key: 'handover', href: routes.handover, count: dashboard.handover_items_count },
    { key: 'wellbeing', href: routes.wellbeing, count: dashboard.wellbeing_flags_count },
    { key: 'workforce_journey', href: routes.chronology || routes.workforce_journey, count: null }
  ]

  return (
    <section data-testid="staff-profile-os-quick-cards" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          data-testid={`staff-profile-os-quick-${card.key}`}
          className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 transition hover:border-blue-200 hover:bg-blue-50/50"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
            {QUICK_LABELS[card.key] || card.key}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {card.count !== null && card.count !== undefined ? card.count : '—'}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Safe summary counts</p>
        </Link>
      ))}
    </section>
  )
}

export function StaffProfileOsSccifLink({ staffId }: { staffId: string }) {
  return (
    <Link
      href={`/intelligence/sccif?staff_id=${encodeURIComponent(staffId)}`}
      data-testid="staff-profile-sccif-alignment-link"
      className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
    >
      Leadership / workforce evidence (SCCIF)
    </Link>
  )
}

export function StaffProfileOsOrbLinks({
  prompts
}: {
  prompts: StaffProfileOsDashboard['orb_prompts']
}) {
  return (
    <div data-testid="staff-profile-os-orb-links" className="flex flex-wrap gap-2">
      {prompts.slice(0, 4).map((prompt) => (
        <Link
          key={prompt.label}
          href={staffProfileOrbHref(prompt.mode, prompt.query)}
          data-testid="staff-profile-os-ask-orb"
          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
        >
          Ask OS ORB: {prompt.label}
        </Link>
      ))}
    </div>
  )
}
