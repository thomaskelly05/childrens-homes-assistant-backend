export function SystemHealthPanel() {
  const systems = [
    ['Chronology engine', 'Operational'],
    ['Assistant orchestration', 'Operational'],
    ['Safeguarding intelligence', 'Operational'],
    ['Continuity runtime', 'Operational']
  ]

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        System health
      </p>

      <div className="mt-5 space-y-4">
        {systems.map(([system, status]) => (
          <div
            key={system}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4"
          >
            <strong className="text-sm font-black text-slate-900">
              {system}
            </strong>

            <span className="rounded-full bg-emerald-100 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
              {status}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
