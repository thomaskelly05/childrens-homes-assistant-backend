export function OversightPanel() {
  const reviews = [
    ['Incident review', 'Awaiting sign-off'],
    ['Chronology gap', 'Missing overnight entry'],
    ['Direct work review', 'Pending QA']
  ]

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        Oversight
      </p>

      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
        Review queue
      </h3>

      <div className="mt-6 space-y-4">
        {reviews.map(([title, body]) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
          >
            <strong className="block text-sm font-black text-slate-900">
              {title}
            </strong>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {body}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
