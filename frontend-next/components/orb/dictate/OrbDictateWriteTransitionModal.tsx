'use client'

import { Loader2 } from 'lucide-react'

import {
  ORB_DICTATE_WRITE_TRANSITION_BODY,
  ORB_DICTATE_WRITE_TRANSITION_CONTINUE,
  ORB_DICTATE_WRITE_TRANSITION_FAILED,
  ORB_DICTATE_WRITE_TRANSITION_PREPARING,
  ORB_DICTATE_WRITE_TRANSITION_STEPS,
  ORB_DICTATE_WRITE_TRANSITION_TITLE
} from '@/lib/orb/dictate/orb-dictate-capture-copy'

export type OrbDictateWriteTransitionStepId =
  | 'template'
  | 'working_document'
  | 'source_transcript'
  | 'recording_metadata'
  | 'adult_review'

export type OrbDictateWriteTransitionModalProps = {
  open: boolean
  preparing: boolean
  failed: boolean
  completedSteps: OrbDictateWriteTransitionStepId[]
  onContinue?: () => void
  onDismiss?: () => void
}

export function OrbDictateWriteTransitionModal({
  open,
  preparing,
  failed,
  completedSteps,
  onContinue,
  onDismiss
}: OrbDictateWriteTransitionModalProps) {
  if (!open) return null

  return (
    <div
      className="orb-dictate-write-transition-modal fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      data-orb-dictate-write-transition-modal
      role="dialog"
      aria-modal="true"
      aria-labelledby="orb-dictate-write-transition-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--orb-line)]/20 bg-white p-6 shadow-2xl">
        <h2
          id="orb-dictate-write-transition-title"
          className="text-lg font-semibold text-[var(--orb-foreground)]"
          data-orb-dictate-write-transition-title
        >
          {ORB_DICTATE_WRITE_TRANSITION_TITLE}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-write-transition-body>
          {failed ? ORB_DICTATE_WRITE_TRANSITION_FAILED : ORB_DICTATE_WRITE_TRANSITION_BODY}
        </p>

        {!failed ? (
          <ul className="mt-4 space-y-2" data-orb-dictate-write-transition-steps>
            {ORB_DICTATE_WRITE_TRANSITION_STEPS.map((step) => {
              const done = completedSteps.includes(step.id)
              return (
                <li
                  key={step.id}
                  className={`flex items-center gap-2 text-sm ${done ? 'text-[var(--orb-primary)]' : 'text-[var(--orb-muted)]'}`}
                  data-orb-dictate-write-transition-step={step.id}
                  data-orb-dictate-write-transition-step-done={done ? 'true' : undefined}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      done ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-primary)]' : 'border border-[var(--orb-line)]/30'
                    }`}
                  >
                    {done ? '✓' : '·'}
                  </span>
                  {step.label}
                </li>
              )
            })}
          </ul>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {failed ? (
            <button
              type="button"
              className="rounded-xl border border-[var(--orb-line)]/30 px-4 py-2 text-sm font-medium"
              onClick={onDismiss}
              data-orb-dictate-write-transition-dismiss
            >
              Stay in Dictate
            </button>
          ) : preparing ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-sm font-semibold text-white opacity-80"
              data-orb-dictate-write-transition-preparing
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {ORB_DICTATE_WRITE_TRANSITION_PREPARING}
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-sm font-semibold text-white"
              onClick={onContinue}
              data-orb-dictate-write-transition-continue
            >
              {ORB_DICTATE_WRITE_TRANSITION_CONTINUE}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
