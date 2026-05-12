export function ContextRail() {
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          Shift context
        </p>

        <div className="mt-5 rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6">
          <strong className="block text-3xl font-black tracking-[-0.05em] text-emerald-700">
            Stable
          </strong>

          <span className="mt-2 block text-sm leading-6 text-slate-600">
            Emotional presentation settled. Low escalation indicators.
          </span>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          Assistant
        </p>

        <div className="mt-5 space-y-3">
          {[
            'Summarise chronology',
            'Prepare handover',
            'Review safeguarding risks'
          ].map((action) => (
            <button
              key={action}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              {action}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
