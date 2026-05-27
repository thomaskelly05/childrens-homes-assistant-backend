export function OperationalStatusBar() {
  const items = [
    ['Shift', 'Stable'],
    ['Safeguarding', 'Monitoring'],
    ['Reviews', '275 pending'],
    ['Continuity', '94%']
  ]

  return (
    <section className="grid gap-4 md:grid-cols-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[24px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl"
        >
          <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {label}
          </span>

          <strong className="mt-2 block text-2xl font-black tracking-[-0.04em] text-slate-950">
            {value}
          </strong>
        </div>
      ))}
    </section>
  )
}
