'use client'

import Link from 'next/link'

import type { RecordingGovernanceMetricCard } from '@/lib/os-api/recording-governance'

const TONE_CLASS: Record<string, string> = {
  neutral: 'border-slate-100 bg-white text-slate-950',
  purple: 'border-purple-100 bg-purple-50/80 text-purple-950',
  rose: 'border-rose-100 bg-rose-50/80 text-rose-950',
  amber: 'border-amber-100 bg-amber-50/80 text-amber-950',
  emerald: 'border-emerald-100 bg-emerald-50/80 text-emerald-950',
  blue: 'border-blue-100 bg-blue-50/80 text-blue-950'
}

export function RecordingGovernanceCard({ card }: { card: RecordingGovernanceMetricCard }) {
  const tone = TONE_CLASS[card.tone || 'neutral'] || TONE_CLASS.neutral
  const inner = (
    <article
      data-testid={`recording-governance-card-${card.id}`}
      className={`rounded-2xl border p-4 shadow-sm ${tone} ${card.route ? 'transition hover:shadow-md' : ''}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{card.title}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{card.value}</p>
      {card.label ? <p className="mt-1 text-xs font-semibold opacity-80">{card.label}</p> : null}
      {card.description ? (
        <p className="mt-2 text-xs font-medium leading-5 opacity-75">{card.description}</p>
      ) : null}
    </article>
  )

  if (card.route) {
    return (
      <Link href={card.route} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
        {inner}
      </Link>
    )
  }
  return inner
}
