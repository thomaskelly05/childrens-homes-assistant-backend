'use client'

import { ORB_WRITE_STUDIO_REVIEW_CHECKS } from '@/lib/orb/orb-residential-copy'

/** Always-visible adult review prompts for ORB Write studio. */
export function OrbWriteStudioReviewChecklist() {
  return (
    <section
      className="rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/80 p-3"
      data-orb-write-studio-review-checklist
      data-orb-write-review-structure-panel
    >
      <h3 className="text-xs font-semibold text-[var(--orb-foreground)]">ORB Review</h3>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--orb-muted)]">
        Adult remains responsible for the final record. ORB can improve wording, but staff must verify accuracy.
      </p>
      <ul className="mt-2 space-y-1.5 text-xs text-[var(--orb-foreground)]">
        {ORB_WRITE_STUDIO_REVIEW_CHECKS.map((check) => (
          <li key={check} data-orb-write-review-check={check}>
            {check}
          </li>
        ))}
      </ul>
    </section>
  )
}
