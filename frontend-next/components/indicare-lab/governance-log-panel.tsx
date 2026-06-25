'use client'

import { Gavel, Link2 } from 'lucide-react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { RiskBadge } from '@/components/indicare-lab/lab-shared'
import { formatLabDate } from '@/lib/indicare-lab/build-brief'
import {
  EVIDENCE_LINK_TYPE_LABELS,
  FOUNDER_ACTION_TYPE_LABELS,
  type FounderActionLog
} from '@/lib/indicare-lab/governance/types'

type GovernanceLogPanelProps = {
  actions: FounderActionLog[]
}

export function GovernanceLogPanel({ actions }: GovernanceLogPanelProps) {
  return (
    <LabSectionCard
      id="governance-log"
      eyebrow="Phase 7"
      title="Governance log"
      description="Founder actions and governance decisions with evidence links. Internal founder governance only — not expert validation or compliance guarantees."
      action={
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <Gavel className="h-3.5 w-3.5" aria-hidden />
          {actions.length} action{actions.length === 1 ? '' : 's'} logged
        </div>
      }
    >
      {actions.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500"
          data-testid="governance-log-empty"
        >
          No founder governance actions logged yet. Approve, reject, dismiss or create build briefs to
          build the governance record.
        </div>
      ) : (
        <div className="space-y-4" data-testid="governance-log-list">
          {actions.map((action) => (
            <article
              key={action.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              data-testid={`governance-action-${action.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-200">
                      {FOUNDER_ACTION_TYPE_LABELS[action.actionType]}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {action.status}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-white">
                    {action.targetType} · {action.targetId}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{formatLabDate(action.createdAt)}</p>
                </div>
                <RiskBadge level={action.riskLevel} />
              </div>

              {action.reason || action.reasonNote ? (
                <p className="mt-3 text-sm text-slate-300">
                  {action.reasonNote ?? action.reason}
                </p>
              ) : null}

              {action.evidenceLinks.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    <Link2 className="h-3 w-3" aria-hidden />
                    Evidence
                  </span>
                  {action.evidenceLinks.map((link) => (
                    <span
                      key={`${link.type}-${link.id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-400"
                    >
                      {EVIDENCE_LINK_TYPE_LABELS[link.type]}
                      {link.label ? `: ${link.label}` : `: ${link.id}`}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </LabSectionCard>
  )
}
