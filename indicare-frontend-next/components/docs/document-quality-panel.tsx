import { CheckCircle2, Link2, MessageCircleHeart } from 'lucide-react'

export type DocumentQualityIndicator = {
  key: string
  status: 'ok' | 'needs_review'
  improvement?: string | null
}

export function DocumentQualityPanel({
  score,
  indicators
}: {
  score: number
  indicators: DocumentQualityIndicator[]
}) {
  const reviewItems = indicators.filter((item) => item.status === 'needs_review')
  return (
    <section className="rounded-[30px] bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)] ring-1 ring-white/80">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Care-native quality</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">{score}% ready for review</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Evidence links, child voice and review needs stay visible before sign-off.</p>
        </div>
        <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">{reviewItems.length} review prompt(s)</div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {indicators.map((item) => {
          const Icon = item.key.includes('voice') ? MessageCircleHeart : item.key.includes('evidence') ? Link2 : CheckCircle2
          return (
            <article key={item.key} className="rounded-3xl bg-slate-50/90 p-4 ring-1 ring-slate-100">
              <Icon className={`h-5 w-5 ${item.status === 'ok' ? 'text-emerald-600' : 'text-amber-600'}`} aria-hidden />
              <h3 className="mt-3 text-sm font-black capitalize text-slate-950">{item.key.replace(/_/g, ' ')}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.improvement || 'Looks ready for manager review.'}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
