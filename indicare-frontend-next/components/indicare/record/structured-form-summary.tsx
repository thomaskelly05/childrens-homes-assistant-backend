'use client'

export function StructuredFormSummary({ lines }: { lines: string[] }) {
  if (!lines.length) return null
  return (
    <section data-testid="structured-form-summary" className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-800">Structured summary</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs font-semibold leading-5 text-slate-700">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  )
}
