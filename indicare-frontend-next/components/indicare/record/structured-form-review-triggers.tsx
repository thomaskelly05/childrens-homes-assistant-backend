'use client'

export function StructuredFormReviewTriggers({ triggers }: { triggers: string[] }) {
  if (!triggers.length) return null
  return (
    <section data-testid="structured-form-review-triggers" className="rounded-xl border border-amber-100 bg-amber-50/80 p-3">
      <p className="text-xs font-black text-amber-950">Review triggers</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-semibold leading-5 text-amber-900">
        {triggers.map((trigger) => (
          <li key={trigger}>{trigger}</li>
        ))}
      </ul>
    </section>
  )
}
