'use client'

import {
  ORB_WRITE_ADULT_RESPONSIBILITY_LINE,
  ORB_WRITE_REVIEW_ACTION_CHECKS,
  type OrbWriteReviewCheckAction
} from '@/lib/orb/orb-residential-station-copy'

/** Always-visible adult review prompts for ORB Write studio — actionable where feasible. */
export function OrbWriteStudioReviewChecklist({
  onApplyReviewAction
}: {
  onApplyReviewAction?: (check: OrbWriteReviewCheckAction) => void
}) {
  return (
    <section
      className="rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/80 p-3"
      data-orb-write-studio-review-checklist
      data-orb-write-review-structure-panel
    >
      <h3 className="text-xs font-semibold text-[var(--orb-foreground)]">ORB Review</h3>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-write-adult-responsibility>
        {ORB_WRITE_ADULT_RESPONSIBILITY_LINE} ORB can improve wording, but staff must verify accuracy.
      </p>
      <ul className="mt-2 space-y-2 text-xs text-[var(--orb-foreground)]">
        {ORB_WRITE_REVIEW_ACTION_CHECKS.map((check) => (
          <li
            key={check.id}
            className="flex flex-col gap-1.5 rounded-lg border border-[var(--orb-line)]/25 bg-white/60 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"
            data-orb-write-review-check={check.question}
            data-orb-write-review-check-id={check.id}
          >
            <span>{check.question}</span>
            {onApplyReviewAction ? (
              <button
                type="button"
                className="shrink-0 rounded-full border border-[var(--orb-primary)]/35 bg-[var(--orb-primary-soft)]/40 px-2.5 py-1 text-[10px] font-semibold text-[var(--orb-primary)] hover:bg-[var(--orb-primary-soft)]"
                data-orb-write-review-action={check.id}
                onClick={() => onApplyReviewAction(check)}
              >
                {check.actionLabel}
              </button>
            ) : (
              <span className="text-[10px] font-medium text-[var(--orb-muted)]">{check.actionLabel}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
