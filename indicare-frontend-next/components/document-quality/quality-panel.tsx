type QualityPanelProps = {
  completedSections: number
  totalSections: number
  hasUnsavedChanges: boolean
  version?: number | string
}

export function DocumentQualityPanel({ completedSections, totalSections, hasUnsavedChanges, version }: QualityPanelProps) {
  const signals = [
    `${completedSections}/${totalSections} sections started`,
    hasUnsavedChanges ? 'unconfirmed edits held in editor' : 'latest edits confirmed',
    version ? `version ${version}` : 'new draft',
  ]

  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600">Inspection intelligence</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">Quality signals</h2>
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        {signals.map((item) => (
          <span key={item} className="rounded-2xl bg-slate-50 px-3 py-2 font-bold">{item}</span>
        ))}
      </div>
      <p className="mt-4 text-xs font-bold leading-5 text-slate-500">Suggestions are supportive checks, not criticism. Detailed quality guidance comes from the document-system API during review; this panel only shows live editor facts.</p>
    </aside>
  )
}
