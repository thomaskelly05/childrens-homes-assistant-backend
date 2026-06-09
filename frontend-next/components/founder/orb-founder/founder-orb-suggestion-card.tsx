'use client'

import { MessageSquareQuote } from 'lucide-react'

type FounderOrbSuggestionCardProps = {
  question: string
  onSelect: (question: string) => void
  compact?: boolean
}

export function FounderOrbSuggestionCard({ question, onSelect, compact }: FounderOrbSuggestionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(question)}
      className={`group w-full rounded-2xl border border-white/10 bg-black/20 text-left transition hover:border-cyan-400/30 hover:bg-cyan-500/5 ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5'
      }`}
    >
      <div className="flex items-start gap-3">
        <MessageSquareQuote
          className={`shrink-0 text-cyan-400/60 transition group-hover:text-cyan-300 ${compact ? 'mt-0.5 h-3.5 w-3.5' : 'mt-0.5 h-4 w-4'}`}
          aria-hidden
        />
        <span className={`leading-6 text-slate-300 transition group-hover:text-white ${compact ? 'text-xs' : 'text-sm'}`}>
          {question}
        </span>
      </div>
    </button>
  )
}
