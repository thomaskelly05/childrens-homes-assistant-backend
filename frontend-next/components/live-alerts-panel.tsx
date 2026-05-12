export function LiveAlertsPanel() {
  const alerts = [
    ['Manager review required', '2 records awaiting oversight'],
    ['Chronology continuity', 'One missing evening entry'],
    ['Safeguarding pattern', 'Behaviour escalation trend flagged']
  ]

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        Live alerts
      </p>

      <div className="mt-5 space-y-4">
        {alerts.map(([title, body]) => (
          <article
            key={title}
            className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4"
          >
            <strong className="block text-sm font-black text-amber-900">
              {title}
            </strong>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              {body}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
