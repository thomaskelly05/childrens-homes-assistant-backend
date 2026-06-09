import type { FounderHomeReadiness } from '@/lib/founder/mock-data'

const toneClasses: Record<FounderHomeReadiness['statusTone'], string> = {
  emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  amber: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  red: 'border-rose-400/30 bg-rose-500/10 text-rose-200'
}

export function FounderReadinessPanel({
  homes,
  commonGaps
}: {
  homes: FounderHomeReadiness[]
  commonGaps: string[]
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="space-y-3">
        {homes.map((home) => (
          <article key={home.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">{home.name}</p>
                <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${toneClasses[home.statusTone]}`}>
                  {home.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white">{home.score}%</p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Readiness</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${home.statusTone === 'emerald' ? 'bg-emerald-400' : home.statusTone === 'amber' ? 'bg-amber-400' : 'bg-rose-400'}`}
                style={{ width: `${home.score}%` }}
              />
            </div>
          </article>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Common gaps</p>
        <ul className="mt-4 space-y-2">
          {commonGaps.map((gap) => (
            <li key={gap} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {gap}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
