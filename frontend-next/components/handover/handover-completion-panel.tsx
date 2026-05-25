'use client'

export function HandoverCompletionPanel({
  status,
  warnings
}: {
  status: string
  warnings: string[]
}) {
  if (status !== 'completed') return null
  return (
    <section
      data-testid="handover-completion-panel"
      className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4"
    >
      <p className="text-sm font-black text-emerald-900">Handover draft completed in workspace</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
        This marks the workspace draft only — not a formal young-person handover record.
      </p>
      {warnings.length ? (
        <ul className="mt-2 space-y-1 text-xs font-semibold text-emerald-900">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
