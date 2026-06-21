'use client'

import { ORB_DICTATE_PROCESSING_STAGES, type OrbDictateProcessingStageId } from '@/lib/orb/dictate/orb-dictate-capture-copy'

export function OrbDictateProcessingStages({ stage }: { stage: OrbDictateProcessingStageId | null }) {
  if (!stage) return null
  const activeIndex = ORB_DICTATE_PROCESSING_STAGES.findIndex((item) => item.id === stage)

  return (
    <section
      className="orb-dictate-processing-stages rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/70 p-4"
      data-orb-dictate-processing-stages
      data-orb-dictate-processing-stage={stage}
    >
      <ol className="space-y-2">
        {ORB_DICTATE_PROCESSING_STAGES.map((item, index) => {
          const isActive = item.id === stage
          const isComplete = activeIndex > index
          return (
            <li
              key={item.id}
              className={`flex items-center gap-2 text-sm ${
                isActive
                  ? 'font-semibold text-[var(--orb-foreground)]'
                  : isComplete
                    ? 'text-[var(--orb-primary)]'
                    : 'text-[var(--orb-muted)]'
              }`}
              data-orb-dictate-processing-step={item.id}
              data-orb-dictate-processing-step-active={isActive ? 'true' : undefined}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                  isActive
                    ? 'bg-[var(--orb-primary)] text-white'
                    : isComplete
                      ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-primary)]'
                      : 'border border-[var(--orb-line)]/30 bg-white/80'
                }`}
              >
                {isComplete ? '✓' : index + 1}
              </span>
              <span data-orb-dictate-processing-label={item.id}>{item.label}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
