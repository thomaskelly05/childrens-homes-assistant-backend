'use client'

import { X } from 'lucide-react'

import { OrbRequestDemoLink } from '@/components/orb-residential/orb-request-demo-link'
import {
  ORB_GUIDED_DEMO_SAFETY_NOTE,
  ORB_GUIDED_DEMO_SCENARIO,
  ORB_GUIDED_DEMO_STEPS,
  type OrbGuidedDemoStep
} from '@/lib/orb/orb-guided-demo'

type OrbGuidedDemoPanelProps = {
  stepIndex: number
  onPrimaryAction: (step: OrbGuidedDemoStep) => void
  onAdvance: () => void
  onClose: () => void
  onExit: () => void
}

export function OrbGuidedDemoPanel({
  stepIndex,
  onPrimaryAction,
  onAdvance,
  onClose,
  onExit
}: OrbGuidedDemoPanelProps) {
  const step = ORB_GUIDED_DEMO_STEPS[stepIndex]
  const isLast = stepIndex >= ORB_GUIDED_DEMO_STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60 p-3 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-labelledby="orb-guided-demo-title"
      data-orb-guided-demo-panel
      data-orb-guided-demo-step={step.id}
      data-orb-guided-demo-step-index={stepIndex}
    >
      <div
        className="orb-guided-demo-panel__sheet max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] w-full max-w-lg overflow-y-auto rounded-3xl p-5 sm:p-6"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]"
              data-orb-guided-demo-progress
            >
              Step {step.order} of {ORB_GUIDED_DEMO_STEPS.length}
            </p>
            <div className="orb-guided-demo-panel__progress-dots" aria-hidden>
              {ORB_GUIDED_DEMO_STEPS.map((s, index) => (
                <span
                  key={s.id}
                  className={`orb-guided-demo-panel__dot ${
                    index < stepIndex
                      ? 'orb-guided-demo-panel__dot--done'
                      : index === stepIndex
                        ? 'orb-guided-demo-panel__dot--active'
                        : ''
                  }`}
                />
              ))}
            </div>
            <h2
              id="orb-guided-demo-title"
              className="orb-guided-demo-panel__title text-[var(--orb-foreground)]"
              data-orb-guided-demo-step-title
            >
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
            aria-label="Close guided demo"
            data-orb-guided-demo-close
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="orb-guided-demo-panel__safety" data-orb-guided-demo-safety-note>
          {ORB_GUIDED_DEMO_SAFETY_NOTE}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-[var(--orb-foreground)]" data-orb-guided-demo-explanation>
          {step.explanation}
        </p>

        <div className="mt-3 space-y-2.5">
          <p className="orb-guided-demo-panel__note-card text-xs leading-relaxed text-[var(--orb-muted)] md:text-sm" data-orb-guided-demo-child-note>
            <span className="font-semibold text-[var(--orb-foreground)]">Child-centred: </span>
            {step.childCentredNote}
          </p>
          <p className="orb-guided-demo-panel__note-card text-xs leading-relaxed text-[var(--orb-muted)] md:text-sm" data-orb-guided-demo-adult-review-note>
            <span className="font-semibold text-[var(--orb-foreground)]">Adult review: </span>
            {step.adultReviewNote}
          </p>
        </div>

        <div className="orb-guided-demo-panel__scenario mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--orb-muted)]">
            Anonymised scenario
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--orb-foreground)]">{ORB_GUIDED_DEMO_SCENARIO.title}</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-guided-demo-scenario-summary>
            {ORB_GUIDED_DEMO_SCENARIO.summary}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => onPrimaryAction(step)}
            className="orb-guided-demo-panel__primary inline-flex min-h-[2.85rem] flex-1 items-center justify-center rounded-full bg-[var(--orb-primary)] px-4 py-2.5 text-sm font-semibold text-white"
            data-orb-guided-demo-primary-action
          >
            {step.primaryActionLabel}
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={onAdvance}
              className="orb-guided-demo-panel__secondary inline-flex min-h-[2.85rem] items-center justify-center rounded-full border px-4 py-2.5 text-sm font-medium"
              data-orb-guided-demo-skip-step
            >
              Next step
            </button>
          ) : null}
        </div>

        {isLast ? (
          <p className="mt-3 text-center text-xs text-[var(--orb-muted)]">
            <OrbRequestDemoLink
              surface="guided_demo"
              className="font-semibold text-[var(--orb-primary)] underline-offset-2 hover:underline"
            />
          </p>
        ) : null}

        <button
          type="button"
          onClick={onExit}
          className="mt-4 w-full text-center text-xs text-[var(--orb-muted)] underline-offset-2 hover:underline"
          data-orb-guided-demo-exit
        >
          Exit guided demo
        </button>
      </div>
    </div>
  )
}
