'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

import { contextSummary } from '@/lib/assistant-core/context'
import { operationalFeatureFlags } from '@/lib/navigation/operational-navigation'
import { useOperationalContext } from '@/lib/operational/operational-context'

export function ContextualOrbPanel() {
  const {
    assistantContext,
    currentChild,
    currentWorkforceContext,
    currentGovernanceContext,
    currentChronologyContext,
    linkedActionsAndEvidence,
    operationalRole
  } = useOperationalContext()

  if (!operationalFeatureFlags.embeddedOrbPanel) return null

  const contextRows = [
    ['Role', operationalRole.toUpperCase()],
    ['Workspace', assistantContext.current_workspace_type?.replaceAll('_', ' ') || 'dashboard'],
    ['Child', currentChild?.name ? String(currentChild.name) : 'No child locked'],
    ['Staff', currentWorkforceContext?.staff_id ? String(currentWorkforceContext.staff_id) : currentWorkforceContext ? 'Workforce domain' : 'None'],
    ['Governance', currentGovernanceContext ? 'Active' : 'Not active'],
    ['Chronology', currentChronologyContext ? 'Active' : 'Not active'],
    ['Evidence/action', linkedActionsAndEvidence?.selected_record_id ? `${linkedActionsAndEvidence.selected_record_type} ${linkedActionsAndEvidence.selected_record_id}` : 'No record selected']
  ]

  return (
    <section data-testid="contextual-orb-panel" className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-950 via-slate-950 to-cyan-950 p-4 text-white shadow-[0_18px_52px_rgba(15,23,42,0.16)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          <Sparkles className="h-5 w-5 text-cyan-200" aria-hidden />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Contextual ORB</p>
          <h2 className="mt-1 text-lg font-black tracking-[-0.03em]">Embedded operational intelligence</h2>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{contextSummary(assistantContext)}</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-2">
        {contextRows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/8 px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-xs font-black capitalize text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/orb?context=${encodeURIComponent(assistantContext.current_workspace_type || 'dashboard')}`} className="mt-4 inline-flex w-full justify-center rounded-2xl bg-cyan-200 px-4 py-3 text-sm font-black text-slate-950">
        Open ORB with this context
      </Link>
    </section>
  )
}
