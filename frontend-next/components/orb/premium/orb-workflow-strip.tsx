'use client'

import { cn } from '@/components/orb/premium/orb-premium-theme'

export const ORB_RECORDING_WORKFLOW_STEPS = ['Capture', 'Review', 'Draft', 'Approve'] as const

export type OrbRecordingWorkflowStep = (typeof ORB_RECORDING_WORKFLOW_STEPS)[number]

function stepIndex(step: OrbRecordingWorkflowStep): number {
  return ORB_RECORDING_WORKFLOW_STEPS.indexOf(step)
}

/** Compact workflow strip for Dictate and ORB Write — Choose → Capture → Review → Draft → Approve. */
export function OrbWorkflowStrip({
  activeStep,
  className
}: {
  activeStep: OrbRecordingWorkflowStep
  className?: string
}) {
  const activeIdx = stepIndex(activeStep)

  return (
    <nav
      className={cn(
        'orb-workflow-strip flex flex-wrap items-center gap-1 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/50 px-2 py-1.5',
        className
      )}
      aria-label="Recording workflow"
      data-orb-workflow-strip
      data-orb-workflow-active={activeStep}
    >
      {ORB_RECORDING_WORKFLOW_STEPS.map((step, index) => {
        const isActive = index === activeIdx
        const isComplete = index < activeIdx
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
              data-orb-workflow-step-active={isActive ? 'true' : undefined}
            >
              {step}
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
}): OrbRecordingWorkflowStep {
  if (opts.hasDraft) return 'Approve'
  if (opts.hasAnalysis) return 'Draft'
  if (opts.hasTranscript) return 'Review'
  return 'Capture'
}
