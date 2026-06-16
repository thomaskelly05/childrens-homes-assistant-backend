'use client'

import { useEffect, useRef } from 'react'

import { FounderOrbInput } from '@/components/founder/orb-founder/founder-orb-input'
import { FounderOrbMessage, type FounderOrbChatMessage } from '@/components/founder/orb-founder/founder-orb-message'

type FounderOrbChatProps = {
  messages: FounderOrbChatMessage[]
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  pending?: boolean
}

export function FounderOrbChat({ messages, input, onInputChange, onSend, pending }: FounderOrbChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="founder-surface flex h-full min-h-[520px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">ORB Founder</p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">Your private CEO copilot</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
              Ask strategic questions about product, risk, Inspection evidence preparation, ORB usage, investor narratives, and what to
              focus on next. Hybrid intelligence uses the Founder Intelligence Layer with AI — falling back to
              rule-based responses if AI is unavailable.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <FounderOrbMessage key={message.id} message={message} />
            ))}
            {pending && (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                </div>
                <span>ORB Founder is thinking…</span>
              </div>
            )}
          </>
        )}
      </div>

      <FounderOrbInput value={input} onChange={onInputChange} onSubmit={onSend} disabled={pending} />
    </div>
  )
}
