'use client'

import { DEMO_OFFBOARDING } from '@/lib/admin-command-centre/demo-data'
import type { OffboardingStepId } from '@/lib/admin-command-centre/types'

import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'

const STEP_LABELS: Record<OffboardingStepId, string> = {
  'disable-access': 'Disable access',
  'revoke-sessions': 'Revoke sessions',
  'export-data': 'Export permitted data (placeholder)',
  'retention-status': 'Retention status',
  'deletion-scheduled': 'Deletion scheduled'
}

export function OffboardingPanel() {
  return (
    <AdminSectionCard
      eyebrow="Offboarding"
      title="Offboarding workflows"
      description="Access revocation, data retention and departure tracking for providers, homes and users."
    >
      <div className="space-y-6">
        {DEMO_OFFBOARDING.map((workflow) => (
          <div
            key={workflow.id}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            data-testid={`offboarding-${workflow.id}`}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">
                  {workflow.provider} · {workflow.home}
                </p>
                <p className="mt-1 text-sm text-slate-400">Reason: {workflow.leavingReason}</p>
              </div>
              <AdminStatusBadge status="in-progress">{workflow.finalStatus}</AdminStatusBadge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(STEP_LABELS) as OffboardingStepId[]).map((stepId) => {
                const status = workflow.steps[stepId]
                return (
                  <div
                    key={stepId}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.01] px-3 py-2"
                  >
                    <span className="text-sm text-slate-400">{STEP_LABELS[stepId]}</span>
                    <AdminStatusBadge status={status === 'n/a' ? 'disabled' : status}>{status}</AdminStatusBadge>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </AdminSectionCard>
  )
}
