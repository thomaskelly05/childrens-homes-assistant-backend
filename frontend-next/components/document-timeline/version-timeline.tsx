export function DocumentVersionTimeline() {
  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Timeline</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">Version history</h2>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        <li>Versions are created before meaningful saves.</li>
        <li>Autosaves are recoverable drafts, not hidden final records.</li>
        <li>Review and sign-off events remain visible for Inspection evidence preparation.</li>
      </ul>
    </aside>
  )
}
