export function CommandCentrePanel() {
  const actions = [
    'Open safeguarding review',
    'Generate chronology summary',
    'Review manager oversight',
    'Audit chronology continuity'
  ]

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Command centre
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Operational actions
          </h3>
        </div>

        <div className="rounded-full bg-amber-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
          Live ops
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {actions.map((action) => (
          <button
            key={action}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  )
}
