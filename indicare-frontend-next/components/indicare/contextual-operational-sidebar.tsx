import Link from 'next/link'
import { Activity, FileText, GitBranch, ShieldAlert, Sparkles } from 'lucide-react'

import { entityLinkSummary, getEntityActions, parseEntityFromPath } from '@/lib/navigation/entity-resolver'

const fallbackActions = [
  { label: 'Linked chronology', href: '/chronology', icon: GitBranch },
  { label: 'Evidence register', href: '/evidence', icon: FileText },
  { label: 'Open actions', href: '/actions', icon: Activity },
  { label: 'Safeguarding priorities', href: '/safeguarding', icon: ShieldAlert }
]

export function ContextualOperationalSidebar({
  pathname,
  activeChildId,
  activeChildName
}: {
  pathname: string
  activeChildId?: string
  activeChildName?: string
}) {
  const entity = parseEntityFromPath(pathname)
  const summary = entity ? entityLinkSummary(entity) : undefined
  const actions = entity ? getEntityActions(entity).slice(0, 6) : []
  const scopedFallbackActions = activeChildId
    ? [
        { label: `${activeChildName || 'Child'} chronology`, href: `/young-people/${encodeURIComponent(activeChildId)}/chronology`, icon: GitBranch },
        { label: 'Child reports', href: `/young-people/${encodeURIComponent(activeChildId)}/journey?focus=reports`, icon: FileText },
        { label: 'Child actions', href: `/young-people/${encodeURIComponent(activeChildId)}/journey?focus=actions`, icon: Activity },
        { label: 'Safeguarding chronology', href: `/young-people/${encodeURIComponent(activeChildId)}/chronology?filter=safeguarding`, icon: ShieldAlert }
      ]
    : fallbackActions

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-600" aria-hidden />
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Contextual operations</p>
      </div>
      <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">
        {summary ? summary.title : 'Workspace links'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {summary ? 'This page branches to the linked chronology, evidence, actions, review state and lifecycle.' : 'Use these operational rails to move from this page into active workflows.'}
      </p>
      <div className="mt-4 grid gap-2">
        {actions.length ? (
          actions.map((action) => (
            <Link key={`${action.id}-${action.route}`} href={action.route} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
              {action.label}
            </Link>
          ))
        ) : (
          scopedFallbackActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                <Icon className="h-4 w-4" aria-hidden />
                {action.label}
              </Link>
            )
          })
        )}
      </div>
      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
        {activeChildName ? `Assistant prompts are locked to ${activeChildName}'s visible route, records and operational links.` : 'Assistant prompts stay unavailable for child records until a child is selected.'}
      </div>
    </section>
  )
}
