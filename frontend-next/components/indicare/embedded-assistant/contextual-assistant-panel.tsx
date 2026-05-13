'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, FileText, ShieldAlert, Sparkles } from 'lucide-react'

import {
  AssistantContext,
  generateMockAssistantResponse,
  suggestedActionsForContext
} from '@/lib/indicare/assistant-adapter'

const operationalFocus = [
  { label: 'Summaries', icon: FileText },
  { label: 'Risks', icon: ShieldAlert },
  { label: 'Actions', icon: ClipboardList }
]

export function ContextualAssistantPanel({ context }: { context: AssistantContext }) {
  const actions = useMemo(() => suggestedActionsForContext(context), [context])
  const [response, setResponse] = useState('Select a suggested action to generate a contextual assistant response from the current record set.')
  const [loading, setLoading] = useState(false)

  function runPrompt(prompt: string) {
    setLoading(true)
    window.setTimeout(() => {
      setResponse(generateMockAssistantResponse(prompt, context))
      setLoading(false)
    }, 220)
  }

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Embedded OS assistant</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Operational co-pilot</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{context.pageTitle || 'Context-aware care intelligence'}</p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Ready</div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {operationalFocus.map((item) => {
          const Icon = item.icon

          return (
            <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
              <Icon className="mx-auto h-4 w-4 text-blue-600" aria-hidden />
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-6 space-y-3">
        {actions.map((prompt) => (
          <button
            key={prompt}
            onClick={() => runPrompt(prompt)}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[22px] border border-blue-100 bg-blue-50/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
          <Sparkles className="h-4 w-4" aria-hidden />
          Compact deterministic output
        </div>
        <div className="max-h-[360px] overflow-auto whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {loading ? 'Generating contextual response...' : response}
        </div>
      </div>

      <Link href="/assistant" className="mt-4 inline-flex text-sm font-black text-blue-700 hover:text-blue-900">
        Open standalone IndiCare Assistant
      </Link>
    </section>
  )
}
