'use client'

export function InspectionSourceNote() {
  return (
    <p
      data-testid="inspection-source-note"
      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-6 text-slate-700"
    >
      Import official SCCIF and Quality Standards sources into the Knowledge Library for exact passage
      citations. This workspace does not fetch or paste full official documents.
    </p>
  )
}
