'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Bot, LayoutDashboard, Lock, Sparkles, Sun } from 'lucide-react'

import { FounderOrbChat } from '@/components/founder/orb-founder/founder-orb-chat'
import { FounderOrbContextPanel } from '@/components/founder/orb-founder/founder-orb-context-panel'
import { FounderOrbSuggestionCard } from '@/components/founder/orb-founder/founder-orb-suggestion-card'
import type { FounderOrbChatMessage } from '@/components/founder/orb-founder/founder-orb-message'
import { getAllAgents, isValidAgentId, type AgentId } from '@/lib/founder/agents'
import {
  answerFounderQuestionWithAI,
  FOUNDER_ORB_PROMPT_CATEGORIES
} from '@/lib/founder/orb-founder'

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function FounderOrbPage() {
  const searchParams = useSearchParams()
  const agentParam = searchParams.get('agent')
  const initialQuestion = searchParams.get('q')

  const [messages, setMessages] = useState<FounderOrbChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [hasAutoSent, setHasAutoSent] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>('strategy')

  const agentShortcuts = useMemo(() => getAllAgents().slice(0, 6), [])

  const sendQuestion = useCallback(
    async (question: string, agentId?: AgentId) => {
      const trimmed = question.trim()
      if (!trimmed || pending) return

      const userMessage: FounderOrbChatMessage = {
        id: createMessageId('user'),
        role: 'user',
        content: trimmed
      }

      setMessages((current) => [...current, userMessage])
      setInput('')
      setPending(true)

      const history = [...messages, userMessage]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content
        }))

      const answer = await answerFounderQuestionWithAI(trimmed, {
        context: agentId ? { agentId } : undefined,
        history
      })

      const assistantMessage: FounderOrbChatMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        content: answer.answer,
        answer
      }

      setMessages((current) => [...current, assistantMessage])
      setPending(false)
    },
    [messages, pending]
  )

  useEffect(() => {
    if (hasAutoSent) return

    if (isValidAgentId(agentParam ?? '')) {
      const agent = getAllAgents().find((a) => a.id === agentParam)
      const question = `What are the latest recommendations from the ${agent?.name ?? 'agent'}?`
      setInput(question)
      void sendQuestion(question, agentParam as AgentId)
      setHasAutoSent(true)
      return
    }

    if (initialQuestion) {
      const decoded = decodeURIComponent(initialQuestion)
      setInput(decoded)
      void sendQuestion(decoded)
      setHasAutoSent(true)
    }
  }, [agentParam, initialQuestion, hasAutoSent, sendQuestion])

  function handleSend() {
    void sendQuestion(input)
  }

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-8 pb-16 md:px-8">
        <Link
          href="/founder"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Command Centre
        </Link>

        <header className="founder-surface rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Founder-only
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Hybrid intelligence enabled
                </div>
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">ORB Founder</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
                Private founder intelligence assistant for IndiCare Intelligence — powered by the Founder Intelligence
                Layer with AI-enhanced strategic responses
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10">
              <Bot className="h-7 w-7 text-cyan-200" aria-hidden />
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="space-y-4">
            <section className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Suggested prompts</p>
              <div className="mt-3 space-y-2">
                {FOUNDER_ORB_PROMPT_CATEGORIES.map((category) => (
                  <div key={category.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategory((current) => (current === category.id ? null : category.id))
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-200"
                    >
                      {category.label}
                      <span className="text-slate-600">{expandedCategory === category.id ? '−' : '+'}</span>
                    </button>
                    {expandedCategory === category.id && (
                      <div className="mt-1.5 space-y-1.5 pl-1">
                        {category.prompts.map((prompt) => (
                          <FounderOrbSuggestionCard
                            key={prompt}
                            question={prompt}
                            onSelect={(q) => void sendQuestion(q)}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Agent shortcuts</p>
              <div className="mt-3 space-y-2">
                {agentShortcuts.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      if (!isValidAgentId(agent.id)) return
                      void sendQuestion(`What are the latest recommendations from the ${agent.name}?`, agent.id)
                    }}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
                  >
                    {agent.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="founder-surface space-y-2 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
              <Link
                href="/founder/briefing"
                className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2.5 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/10"
              >
                <Sun className="h-4 w-4" aria-hidden />
                Daily briefing
              </Link>
              <Link
                href="/founder"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Dashboard
              </Link>
            </section>
          </aside>

          <main className="min-h-[600px]">
            <FounderOrbChat
              messages={messages}
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
              pending={pending}
            />
          </main>

          <div className="hidden xl:block">
            <FounderOrbContextPanel />
          </div>
        </div>

        <div className="xl:hidden">
          <FounderOrbContextPanel />
        </div>
      </div>
    </div>
  )
}
