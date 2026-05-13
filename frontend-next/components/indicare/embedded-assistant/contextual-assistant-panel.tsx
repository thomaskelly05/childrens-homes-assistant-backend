'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ClipboardList, FileText, ShieldAlert, Sparkles } from 'lucide-react'

import { citationHref } from '@/lib/assistant-core/citations'
import { contextSummary } from '@/lib/assistant-core/context'
import { queryAssistant } from '@/lib/assistant-core/client'
import { suggestedPromptsForWorkspace } from '@/lib/assistant-core/retrieval'
import type { AssistantContext, AssistantQueryData } from '@/lib/assistant-core/types'

const operationalFocus = [
  { label: 'Summaries', icon: FileText },
  { label: 'Risks', icon: ShieldAlert },
  { label: 'Actions', icon: ClipboardList }
]

export function ContextualAssistantPanel({ context }: { context: AssistantContext }) {
  const actions = useMemo(() => suggestedPromptsForWorkspace(context.current_workspace_type, 'embedded'), [context])
  const [input, setInput] = useState('')
  const [response, setResponse] = useState<AssistantQueryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function runPrompt(prompt: string) {
    const message = prompt.trim()
    if (!message || loading) return
    setLoading(true)
    setError(null)

    try {
      const data = await queryAssistant({
        message,
        mode: 'embedded',
        context: { ...context, assistant_mode: 'embedded' },
        conversation_id: context.conversation_id || undefined,
        project_id: context.project_id || undefined
      })
      setResponse(data)
    } catch (assistantError) {
      setError(assistantError instanceof Error ? assistantError.message : 'Assistant backend unavailable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Embedded OS assistant</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Operational co-pilot</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{contextSummary(context)}</p>
        </div>
        <div className="rounded-full bg-blue-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">{loading ? 'Thinking' : 'Ready'}</div>
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

      <form
        className="mt-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void runPrompt(input)
          setInput('')
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this page or selected record..."
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
        />
        <button disabled={loading} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
          Ask
        </button>
      </form>

      <div className="mt-5 rounded-[22px] border border-blue-100 bg-blue-50/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
          <Sparkles className="h-4 w-4" aria-hidden />
          Live OS answer
        </div>
        <div className="max-h-[360px] overflow-auto whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {loading ? 'Retrieving permitted records and building citations...' : (response?.answer || 'Ask a question or choose a suggested prompt. Record-specific answers will include citations.')}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
          <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden />
          Backend unavailable or permission denied: {error}
        </div>
      ) : null}

      {response?.review_required ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          Review required before this answer is used in care records, actions or reports.
        </div>
      ) : null}

      {response && response.citations.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Citations unavailable. No record-specific conclusion has been made.
        </div>
      ) : null}

      {response?.citations.length ? (
        <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Citations</p>
          <div className="mt-3 space-y-2">
            {response.citations.slice(0, 5).map((citation, index) => (
              <Link key={`${citation.source_type}-${citation.source_id}-${index}`} href={citationHref(citation)} className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100">
                {citation.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {response?.suggested_actions.length ? (
        <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Suggested actions</p>
          <div className="mt-3 space-y-2">
            {response.suggested_actions.slice(0, 4).map((action, index) => (
              <Link key={`${action.title}-${index}`} href={action.route || '/actions'} className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100">
                {action.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {response?.evidence_gaps.length ? (
        <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Evidence gaps</p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
            {response.evidence_gaps.slice(0, 4).map((gap, index) => (
              <div key={`${gap.gap}-${index}`}>{gap.gap}</div>
            ))}
          </div>
        </div>
      ) : null}

      <Link href="/assistant" className="mt-4 inline-flex text-sm font-black text-blue-700 hover:text-blue-900">
        Open standalone IndiCare Assistant
      </Link>
    </section>
  )
}
