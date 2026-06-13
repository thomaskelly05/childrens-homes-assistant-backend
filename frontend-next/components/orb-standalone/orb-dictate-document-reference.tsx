'use client'

export function OrbDictateDocumentReference({
  onOpenDocuments
}: {
  onOpenDocuments?: () => void
}) {
  return (
    <section
      className="rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] p-3"
      data-orb-dictate-document-reference
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
        Supporting documents
      </h3>
      <p className="mt-1 text-[10px] leading-relaxed text-[var(--orb-muted)]">
        You can open Documents &amp; Guidance to upload or reference a policy, care plan extract or agenda.
        ORB will only use documents you explicitly choose — nothing is auto-ingested into this record.
      </p>
      {onOpenDocuments ? (
        <button
          type="button"
          data-orb-dictate-open-documents
          onClick={onOpenDocuments}
          className="mt-2 rounded-lg border border-sky-400/30 px-2.5 py-1 text-[10px] text-sky-200"
        >
          Open Documents &amp; Guidance
        </button>
      ) : null}
    </section>
  )
}
