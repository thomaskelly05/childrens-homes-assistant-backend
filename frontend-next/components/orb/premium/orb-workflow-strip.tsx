'use client'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export const ORB_RECORDING_WORKFLOW_STEPS = ['Capture', 'Review', 'Draft', 'Finalise'] as const

export type OrbRecordingWorkflowStep = (typeof ORB_RECORDING_WORKFLOW_STEPS)[number]

/** Therapeutic workflow labels shown in Dictate and ORB Write strips. */
export const ORB_RECORDING_WORKFLOW_STEP_LABELS: Record<OrbRecordingWorkflowStep, string> = {
  Capture: 'Capture rough notes',
  Review: 'Review with ORB',
  Draft: 'Create safer draft',
  Finalise: 'Finalise with adult approval'
}

function stepIndex(step: OrbRecordingWorkflowStep): number {
  return ORB_RECORDING_WORKFLOW_STEPS.indexOf(step)
}

/** Compact workflow strip for Dictate and ORB Write — Capture → Review → Draft → Finalise. */
export function OrbWorkflowStrip({
  activeStep,
  isApproved = false,
  className
}: {
  activeStep: OrbRecordingWorkflowStep
  /** When true, the Finalise step is shown as complete (adult has explicitly approved). */
  isApproved?: boolean
  className?: string
}) {
  const activeIdx = stepIndex(activeStep)
  const finaliseComplete = isApproved && activeStep === 'Finalise'

  return (
    <nav
      className={cn(
        'orb-workflow-strip flex flex-wrap items-center gap-1 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/50 px-2 py-1.5',
        className
      )}
      aria-label="Recording workflow"
      data-orb-workflow-strip
      data-orb-workflow-active={activeStep}
      data-orb-workflow-approved={isApproved ? 'true' : undefined}
    >
      {ORB_RECORDING_WORKFLOW_STEPS.map((step, index) => {
        const isFinalise = step === 'Finalise'
        const isActive = index === activeIdx && !(isFinalise && finaliseComplete)
        const isComplete = index < activeIdx || (isFinalise && finaliseComplete)
        return (
          <div key={step} className="flex items-center gap-1">
            {index > 0 ? (
              <span className="text-[10px] text-[var(--orb-muted)]/50" aria-hidden>
                →
              </span>
            ) : null}
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide',
                isActive
                  ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)] ring-1 ring-[var(--orb-primary)]/30'
                  : isComplete
                    ? 'text-[var(--orb-muted)]'
                    : 'text-[var(--orb-muted)]/70'
              )}
              data-orb-workflow-step={step.toLowerCase()}
              data-orb-workflow-step-label={ORB_RECORDING_WORKFLOW_STEP_LABELS[step]}
              data-orb-workflow-step-active={isActive ? 'true' : undefined}
              data-orb-workflow-step-complete={isComplete ? 'true' : undefined}
            >
              {ORB_RECORDING_WORKFLOW_STEP_LABELS[step]}
            </span>
          </div>
        )
      })}
    </nav>
  )
}

export function resolveDictateWorkflowStep(opts: {
  hasTranscript: boolean
  hasAnalysis: boolean
  hasDraft: boolean
  isApproved?: boolean
}): OrbRecordingWorkflowStep {
  if (opts.isApproved) return 'Finalise'
  if (opts.hasDraft) return 'Finalise'
  if (opts.hasAnalysis) return 'Draft'
  if (opts.hasTranscript) return 'Review'
  return 'Capture'
}
