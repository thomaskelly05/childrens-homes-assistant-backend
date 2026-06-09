'use client'

import Link from 'next/link'
import { ListPlus, Sparkles } from 'lucide-react'

import { addFounderAction } from '@/lib/founder/actions'
import type { FounderRecommendation } from '@/lib/founder/mock-data'

export function FounderRecommendationCard({ recommendation }: { recommendation: FounderRecommendation }) {
  function handleCreateAction() {
    addFounderAction({
      title: recommendation.title,
      detail: recommendation.detail,
      source: 'Founder Recommendation',
      priority: recommendation.priority <= 2 ? 'high' : 'medium'
    })
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-sm font-black text-cyan-200">
          P{recommendation.priority}
        </div>
        <div className="flex-1">
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Founder recommendation
          </div>
          <h3 className="text-base font-bold text-white">{recommendation.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{recommendation.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreateAction}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/15"
            >
              <ListPlus className="h-3.5 w-3.5" aria-hidden />
              Create Action
            </button>
            <Link
              href="/founder/actions"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400 transition hover:border-white/20 hover:text-slate-300"
            >
              View actions
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
