'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Send, Sparkles } from 'lucide-react'

import {
  sendOperationalOrbMessage,
  type OrbOperationalMode,
  type OrbOperationalRequest,
  type OrbOperationalResponse,
  type OrbOperationalScope
} from '@/lib/orb/operational-client'
import { ORB_SEND_RETRY_MESSAGE } from '@/lib/interaction/orb-send-errors'
import { logTapTarget } from '@/lib/interaction/mobile-tap-debug'
import { queryOrbConversation, type OrbConversationResponse, type OrbScope } from '@/lib/os-api/orb'
import type { OsPersonSummary } from '@/lib/os-api/workspaces'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  response?: OrbConversationResponse
}

const scopeOptions: Array<{ value: OrbScope; label: string; prompt: string; operationalScope: OrbOperationalScope }> = [
  { value: 'home', label: 'Home', prompt: 'What needs attention in the home today?', operationalScope: 'home' },
  { value: 'child', label: 'Child', prompt: "What should adults know about this young person today?", operationalScope: 'child' },
  { value: 'workforce', label: 'Workforce', prompt: 'What workforce issues need attention?', operationalScope: 'staff' },
  { value: 'governance', label: 'Governance', prompt: 'What needs manager review?', operationalScope: 'provider' },
  { value: 'inspection', label: 'Inspection', prompt: 'What evidence is missing or needs review?', operationalScope: 'home' },
  { value: 'provider', label: 'Provider', prompt: 'What should the provider look at first?', operationalScope: 'provider' }
]

const quickPrompts: Array<{ mode: OrbOperationalMode; label: string; prompt: string }> = [
  { mode: 'general_operational_question', label: 'Ask anything', prompt: 'What should I know from the records?' },
  { mode: 'child_journey_summary', label: 'Child summary', prompt: "Summarise this child's recent journey from the records." },
  { mode: 'record_quality_review', label: 'Record quality', prompt: 'Which records need review or clearer follow-up?' },
  { mode: 'action_priority', label: 'Actions', prompt: 'What actions should adults prioritise?' },
  { mode: 'plan_impact_review', label: 'Plans', prompt: 'What plan updates may need review?' },
  { mode: 'governance_briefing', label: 'Reg 44 / 45', prompt: 'Prepare a Reg 44 and Reg 45 evidence brief from what ORB can see.' },
  { mode: 'ofsted_evidence_review', label: 'Ofsted evidence', prompt: 'What would Ofsted, Reg 44 or Reg 45 want to see from this evidence?' },
  { mode: 'manager_daily_brief', label: 'Daily brief', prompt: 'Give me a simple daily brief.' }
]

function mapOperationalResponse(response: OrbOperationalResponse): OrbConversationResponse {
  const sources = (response.sources || []).map((source, index) => ({
    title: source.label,
    record_type: source.source_type,
    record_id: `${source.source_type}-${index}`,
    route: source.route,
    citation_ref: `[${index + 1}]`,
    summary: source.basis || ''
  }))

  const actions: OrbConversationResponse['actions'] = [
    ...(response.follow_up_actions || []).map((item) => ({
      label: item.label,
      type: 'open_record' as const,
      route: item.route || undefined
    })),
    ...(response.draft_actions || []).map((item) => ({
      label: item.title,
      type: 'create_task' as const,
      route: '/actions'
    })),
    ...(response.review_prompts || []).map((item) => ({
      label: item.title,
      type: 'review' as const,
      route: item.route_hint || '/record/reviews'
    })),
    ...(response.recommendations || []).map((item) => ({
      label: item.title,
      type: 'review' as const,
      route: item.route_hint || undefined
    })),
    ...(response.context_summary?.attention_items || []).map((label) => ({
      label,
      type: 'review' as const,
      route: '/intelligence-actions'
    }))
  ].slice(0, 10)

  return {
    ok: true,
    answer: response.answer,
    summary: response.context_summary?.headline || response.answer.split('\n', 1)[0].slice(0, 220),
    sources,
    citations: sources,
    actions,
    confidence: response.context_summary?.degraded || response.context_summary?.unavailable ? 'low' : 'medium',
    guardrails: response.boundaries?.notices || [
      'ORB uses permissioned IndiCare context and only sees information available to your role.'
    ],
    context_used: {
      scope: response.permissions?.scope_resolved || undefined,
      care_retrieval: response.care_record_access,
      degraded: response.context_summary?.degraded,
      snapshot_hit: !response.context_summary?.unavailable,
      suggested_output_type: response.suggested_output_type || undefined,
      save_available: response.save_available || undefined
    }
  }
}

function normaliseInitialScope(scope?: string): OrbScope {
  return scopeOptions.some((item) => item.value === scope) ? scope as OrbScope : 'home'
}

function normaliseInitialMode(mode?: string): OrbOperationalMode {
  const allowed = new Set(quickPrompts.map((entry) => entry.mode))
  if (mode && allowed.has(mode as OrbOperationalMode)) return mode as OrbOperationalMode
  return 'general_operational_question'
}

function childName(person: OsPersonSummary) {
  return String(person.preferredName || person.displayName || person.firstName || `Young person ${person.id}`)
}

function scopePrompt(scope: OrbScope) {
  return scopeOptions.find((item) => item.value === scope)?.prompt || scopeOptions[0].prompt
}

function MessageSources({ response }: { response?: OrbConversationResponse }) {
  const [open, setOpen] = useState(false)
  const sources = response?.sources || response?.citations || []
  const actions = response?.actions || []
  if (!response || (!sources.length && !actions.length && !response.guardrails?.length)) return null
  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left text-xs font-black text-slate-700">
        <span>What ORB used · {sources.length} source{sources.length === 1 ? '' : 's'} · {actions.length} action{actions.length === 1 ? '' : 's'}</span>
        {open ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          {sources.length ? (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Sources</p>
              {sources.slice(0, 6).map((source, index) => (
                <div key={`${source.record_id || source.title || index}`} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
                  <p className="font-black text-slate-900">{source.title || source.record_type || `Source ${index + 1}`}</p>
                  {source.summary ? <p className="mt-1">{source.summary}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
          {actions.length ? (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Suggested next steps</p>
              {actions.slice(0, 8).map((action, index) => {
                const label = action.label || `Action ${index + 1}`
                const route = action.route
                return route ? (
                  <Link key={`${label}-${index}`} href={route} className="block rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-800 ring-1 ring-blue-50">
                    {label}
                  </Link>
                ) : (
                  <p key={`${label}-${index}`} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700">{label}</p>
                )
              })}
            </div>
          ) : null}
          {response.context_used?.save_available ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-xs font-black text-emerald-950">This ORB response can be saved as {String(response.context_used.suggested_output_type || 'an operational output').replace(/_/g, ' ')}.</p>
            </div>
          ) : null}
          {response.guardrails?.length ? (
            <p className="text-[11px] font-semibold leading-5 text-slate-500">{response.guardrails[0]}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function OrbConversationExperience({
  childrenOptions,
  initialScope,
  initialYoungPersonId,
  initialOperationalMode,
  initialPrompt
}: {
  childrenOptions: OsPersonSummary[]
  initialScope?: string
  initialYoungPersonId?: string
  initialOperationalMode?: string
  initialPrompt?: string
}) {
  const startingScope = normaliseInitialScope(initialScope)
  const [scope, setScope] = useState<OrbScope>(startingScope)
  const [operationalMode, setOperationalMode] = useState<OrbOperationalMode>(normaliseInitialMode(initialOperationalMode))
  const [youngPersonId, setYoungPersonId] = useState<string>(startingScope === 'child' ? initialYoungPersonId || '' : '')
  const [conversationId] = useState('orb-operational-session')
  const [input, setInput] = useState(initialPrompt || '')
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const submitInFlightRef = useRef(false)
  const latestResponse = useMemo(() => [...messages].reverse().find((message) => message.response)?.response, [messages])

  const workspaceBackHref = scope === 'child' && youngPersonId ? `/young-people/${encodeURIComponent(youngPersonId)}/workspace` : '/select-scope'

  async function submit(event?: FormEvent<HTMLFormElement>, override?: string, overrideMode?: OrbOperationalMode, overrideScope?: OrbScope) {
    event?.preventDefault()
    if (submitInFlightRef.current) return
    const message = (override || input).trim()
    if (!message || pending) return
    submitInFlightRef.current = true
    const activeScope = overrideScope || scope
    const activeMode = overrideMode || operationalMode
    const selectedChildId = youngPersonId ? Number(youngPersonId) : null
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: 'user', text: message }])
    setInput('')
    setPending(true)
    setWarning(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const scopeMeta = scopeOptions.find((item) => item.value === activeScope) || scopeOptions[0]
    const operationalPayload: OrbOperationalRequest = {
      message,
      mode: activeMode,
      scope: scopeMeta.operationalScope,
      child_id: activeScope === 'child' ? selectedChildId : null,
      staff_id: null,
      days: 7,
      include_actions: true,
      include_patterns: true,
      include_record_quality: true
    }
    try {
      const operationalResult = await sendOperationalOrbMessage(operationalPayload, controller.signal)
      let responseData: OrbConversationResponse
      if (operationalResult.source === 'live' && operationalResult.data.answer) {
        responseData = mapOperationalResponse(operationalResult.data)
        setWarning([operationalResult.warning, ...(operationalResult.data.warnings || [])].filter(Boolean).join(' ') || null)
      } else {
        const legacy = await queryOrbConversation(
          {
            message,
            scope: activeScope,
            young_person_id: activeScope === 'child' ? selectedChildId : null,
            conversation_id: conversationId
          },
          controller.signal
        )
        responseData = legacy.data
        const combinedWarning = [legacy.warning, operationalResult.warning].filter(Boolean).join(' ')
        setWarning(combinedWarning || null)
        if (legacy.source !== 'live' && operationalResult.source !== 'live') setWarning(ORB_SEND_RETRY_MESSAGE)
      }
      setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: responseData.answer, response: responseData }])
    } catch {
      setWarning(ORB_SEND_RETRY_MESSAGE)
      if (process.env.NODE_ENV === 'development') console.error('[operational-orb] send failed')
    } finally {
      setPending(false)
      submitInFlightRef.current = false
    }
  }

  function applyScope(nextScope: OrbScope) {
    setScope(nextScope)
    setInput(scopePrompt(nextScope))
    if (nextScope !== 'child') setYoungPersonId('')
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-200/70 md:rounded-[36px]">
      <header className="border-b border-slate-100 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={workspaceBackHref} className="inline-flex min-h-10 items-center text-xs font-black text-blue-700" data-testid="orb-operational-back-workspace">
              ← Back to workspace
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">ORB</p>
                <h1 className="text-2xl font-black tracking-[-0.05em] text-slate-950 md:text-4xl">Ask IndiCare</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Ask about records, plans, risks, chronology, reviews, appointments, Reg 44, Reg 45, Ofsted evidence or what needs doing next. ORB uses the same brain as standalone ORB, with permissioned OS records when authorised.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
            {latestResponse?.context_used?.care_retrieval === false ? 'General answer' : latestResponse ? 'Records checked' : 'Ready'}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Scope
            <select value={scope} onChange={(event) => applyScope(event.target.value as OrbScope)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-blue-400">
              {scopeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {scope === 'child' ? (
            <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Young person
              <select value={youngPersonId} onChange={(event) => setYoungPersonId(event.target.value)} disabled={!childrenOptions.length} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-400">
                <option value="">{childrenOptions.length ? 'Choose young person' : 'No child records returned'}</option>
                {childrenOptions.map((person) => <option key={person.id} value={person.id}>{childName(person)}</option>)}
              </select>
            </label>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" data-testid="orb-quick-prompts">
          {quickPrompts.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => { setOperationalMode(item.mode); void submit(undefined, item.prompt, item.mode, scope) }}
              className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900 transition hover:bg-blue-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="min-h-0 flex-1 space-y-4 overflow-auto bg-slate-50/70 p-4 md:p-6" data-testid="orb-chat-messages">
        {!messages.length ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white p-6 text-center">
            <div className="max-w-lg">
              <Sparkles className="mx-auto h-9 w-9 text-blue-500" aria-hidden />
              <h2 className="mt-4 text-xl font-black tracking-[-0.04em] text-slate-950">What do you need to know?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Try asking: “When was the last dentist appointment?”, “What changed this week?”, “Prepare Reg 45 evidence”, or “What would a Reg 44 visitor want to see?”
              </p>
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <article key={message.id} className={`rounded-[24px] p-4 ${message.role === 'user' ? 'ml-auto max-w-2xl bg-slate-950 text-white' : 'mr-auto max-w-4xl bg-white text-slate-800 shadow-sm ring-1 ring-slate-100'}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-60">{message.role === 'user' ? 'You' : 'ORB'}</p>
            <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7">{message.text}</div>
            {message.role === 'assistant' ? <MessageSources response={message.response} /> : null}
          </article>
        ))}

        {pending ? <div className="mr-auto max-w-sm rounded-[24px] bg-white p-4 text-sm font-black text-blue-700 ring-1 ring-blue-100">ORB is checking the records…</div> : null}
        {warning ? (
          <div className="rounded-[24px] bg-amber-50 p-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100" data-testid="orb-operational-send-error" role="alert">
            {warning}
          </div>
        ) : null}
      </section>

      <div className="border-t border-slate-100 bg-white p-4 md:p-5" data-orb-operational-composer data-testid="orb-operational-composer">
        <form
          onSubmit={(event) => { logTapTarget(event, 'orb-operational-form-submit'); void submit(event) }}
          className="flex gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm"
          data-testid="orb-operational-message-form"
        >
          <label htmlFor="orb-message" className="sr-only">Ask ORB</label>
          <textarea
            id="orb-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="Ask ORB about the records…"
            className="min-h-11 flex-1 resize-none rounded-[18px] px-4 py-3 text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400 md:min-h-12 md:text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            aria-label="Send message to ORB"
            onClick={(event) => logTapTarget(event, 'orb-operational-send-click')}
            data-testid="orb-operational-send-clickable"
            className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send className="h-4 w-4" aria-hidden />
            <span className="sr-only">Send</span>
          </button>
        </form>
        <p className="mt-2 text-[11px] leading-4 text-slate-500" data-orb-composer-disclaimer>
          ORB answers from permissioned IndiCare records where available. Adults and managers remain responsible for decisions and sign-off.
        </p>
      </div>
    </div>
  )
}
