export function OverviewMetrics() {
  const metrics = [
    ['277', 'Live chronology items'],
    ['275', 'Reviews pending'],
    ['94%', 'Chronology continuity']
  ]

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {metrics.map(([value, label]) => (
        <article
          key={label}
          className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]"
        >
          <strong className="block text-4xl font-black tracking-[-0.06em] text-slate-950">
            {value}
          </strong>

          <span className="mt-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {label}
          </span>
        </article>
      ))}
    </section>
  )
}
