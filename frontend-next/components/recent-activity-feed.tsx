export function RecentActivityFeed() {
  const activity = [
    ['20:14', 'Chronology entry created'],
    ['19:48', 'Safeguarding review updated'],
    ['18:32', 'Direct work session logged'],
    ['17:55', 'Medication administration recorded']
  ]

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        Activity
      </p>

      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">
        Recent operational activity
      </h3>

      <div className="mt-6 space-y-4">
        {activity.map(([time, action]) => (
          <div
            key={`${time}-${action}`}
            className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4"
          >
            <div className="rounded-full bg-slate-950 px-3 py-2 text-[11px] font-black text-white">
              {time}
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                {action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
