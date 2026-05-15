export function DocumentQualityPanel() {
  return (
    <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-600">Inspection intelligence</p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">Quality signals</h2>
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        {['child voice', 'strengths-based language', 'unsupported conclusions', 'weak outcomes', 'evidence gaps', 'chronology continuity', 'leadership oversight'].map((item) => (
          <span key={item} className="rounded-2xl bg-slate-50 px-3 py-2 font-bold">{item}</span>
        ))}
      </div>
    </aside>
  )
}
