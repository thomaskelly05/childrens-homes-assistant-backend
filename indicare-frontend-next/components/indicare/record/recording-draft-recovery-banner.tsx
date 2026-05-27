'use client'

type RecordingDraftRecoveryBannerProps = {
  onRestore: () => void
  onDismiss: () => void
}

export function RecordingDraftRecoveryBanner({ onRestore, onDismiss }: RecordingDraftRecoveryBannerProps) {
  return (
    <section
      data-testid="recording-draft-recovery-banner"
      className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-semibold leading-6 text-amber-950"
    >
      <p className="font-black text-amber-950">You have an unsaved browser draft.</p>
      <p className="mt-1 text-xs text-amber-900/90">
        A draft was found in this browser that is not linked to your secure server draft. Restore it or dismiss to continue.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex min-h-9 items-center rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white"
        >
          Restore browser draft
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-9 items-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-950"
        >
          Dismiss
        </button>
      </div>
    </section>
  )
}
