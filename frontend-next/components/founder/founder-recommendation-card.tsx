import { Sparkles } from 'lucide-react'

import type { FounderRecommendation } from '@/lib/founder/mock-data'

export function FounderRecommendationCard({ recommendation }: { recommendation: FounderRecommendation }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-sm font-black text-cyan-200">
          P{recommendation.priority}
        </div>
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Founder recommendation
          </div>
          <h3 className="text-base font-bold text-white">{recommendation.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{recommendation.detail}</p>
        </div>
      </div>
    </article>
  )
}
