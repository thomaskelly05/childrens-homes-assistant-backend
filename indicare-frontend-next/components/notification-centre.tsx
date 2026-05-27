export function NotificationCentre() {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        Notifications
      </p>

      <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6">
        <strong className="block text-sm font-black text-slate-900">
          No live notifications
        </strong>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your operational notifications will appear here once connected to the live notification and workspace bundle APIs.
        </p>
      </div>
    </section>
  )
}
