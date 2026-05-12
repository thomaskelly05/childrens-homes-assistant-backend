export function NotificationCentre() {
  const notifications = [
    ['New chronology review', 'Manager oversight required'],
    ['Missing evidence', 'Education attachment not uploaded'],
    ['Assistant insight', 'Behaviour trend detected']
  ]

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        Notifications
      </p>

      <div className="mt-5 space-y-3">
        {notifications.map(([title, body]) => (
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
