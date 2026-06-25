'use client'

import { Check, Circle } from 'lucide-react'

import { DEMO_ONBOARDING } from '@/lib/admin-command-centre/demo-data'
import type { OnboardingChecklistItemId } from '@/lib/admin-command-centre/types'

import { AdminSectionCard } from './admin-section-card'

const CHECKLIST_LABELS: Record<OnboardingChecklistItemId, string> = {
  'provider-created': 'Provider created',
  'home-created': 'Home created',
  'manager-invited': 'Manager invited',
  'staff-invited': 'Staff invited',
  'roles-assigned': 'Roles assigned',
  'safeguarding-accepted': 'Safeguarding disclaimer accepted',
  'first-orb-use': 'First ORB use',
  'first-test-record': 'First test record',
  'training-completed': 'Training completed',
  'ready-for-pilot': 'Ready for pilot/live'
}

export function OnboardingPanel() {
  return (
    <AdminSectionCard
      eyebrow="Onboarding"
      title="Provider & home onboarding"
      description="Checklist progress for new providers and homes entering the platform."
    >
      <div className="space-y-6">
        {DEMO_ONBOARDING.map((workflow) => (
          <div
            key={workflow.id}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            data-testid={`onboarding-${workflow.id}`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-white">{workflow.provider}</p>
                <p className="text-sm text-slate-400">{workflow.home}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-amber-200">{workflow.overallProgress}%</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Complete</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(CHECKLIST_LABELS) as OnboardingChecklistItemId[]).map((itemId) => {
                const done = workflow.checklist[itemId]
                return (
                  <div
                    key={itemId}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      done
                        ? 'border-emerald-400/20 bg-emerald-500/5 text-emerald-200'
                        : 'border-white/5 bg-white/[0.01] text-slate-500'
                    }`}
                  >
                    {done ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
                    )}
                    {CHECKLIST_LABELS[itemId]}
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
