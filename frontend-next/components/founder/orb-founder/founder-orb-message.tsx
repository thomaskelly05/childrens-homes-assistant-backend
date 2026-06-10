'use client'

import { Bot, User } from 'lucide-react'

import { SaveToFounderMemoryButton } from '@/components/founder/save-to-founder-memory-button'
import type { FounderOrbAiAnswer } from '@/lib/founder/orb-founder'

export type FounderOrbChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  answer?: FounderOrbAiAnswer
}

const confidenceTone = {
  high: 'text-emerald-400',
  medium: 'text-amber-300',
  low: 'text-slate-400'
} as const

export function FounderOrbMessage({ message }: { message: FounderOrbChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <article className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          isUser ? 'border-violet-400/30 bg-violet-500/10' : 'border-cyan-400/30 bg-cyan-500/10'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-violet-200" aria-hidden />
        ) : (
          <Bot className="h-4 w-4 text-cyan-200" aria-hidden />
        )}
      </div>

      <div className={`max-w-[85%] space-y-2 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${
            isUser
              ? 'border-violet-400/20 bg-violet-500/10 text-slate-100'
              : 'border-white/10 bg-white/[0.04] text-slate-200'
          }`}
        >
          {message.content}
        </div>

        {!isUser && message.answer && (
          <div className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {message.answer.responseMode === 'fallback' && (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-bold uppercase tracking-[0.12em] text-amber-300">
                  Rule-based fallback used
                </span>
              )}
              <span className={`font-bold uppercase tracking-[0.12em] ${confidenceTone[message.answer.confidence]}`}>
                {message.answer.confidence} confidence
              </span>
              {message.answer.usedSources.map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-slate-500"
                >
                  {source}
                </span>
              ))}
            </div>

            {message.answer.suggestedFollowUps.length > 0 && (
              <p className="text-[11px] text-slate-600">
                Suggested follow-ups available in the sidebar
              </p>
            )}

            <SaveToFounderMemoryButton
              type="decision"
              title="ORB Founder answer"
              content={message.content}
              tags={['orb-founder']}
              source="founder-ui"
            />
          </div>
        )}
      </div>
    </article>
  )
}
