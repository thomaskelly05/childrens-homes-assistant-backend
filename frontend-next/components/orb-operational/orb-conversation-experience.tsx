'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Mic2, Send, ShieldCheck, Sparkles } from 'lucide-react'

import { OrbCognitionPanels } from '@/components/orb-operational/orb-cognition-panels'
import { OrbOperationalActionsPanel } from '@/components/orb-operational/orb-operational-actions-panel'
import { OrbOperationalBriefingCard } from '@/components/orb-operational/orb-operational-briefing-card'
import { OrbOperationalContextPanel } from '@/components/orb-operational/orb-operational-context-panel'
import { OrbOperationalOutputsPanel } from '@/components/orb-operational/orb-operational-outputs-panel'
import { OrbOperationalSourcePanel } from '@/components/orb-operational/orb-operational-source-panel'
import {
  sendOperationalOrbMessage,
  type OrbOperationalMode,
  type OrbOperationalRequest,
  type OrbOperationalResponse,
  type OrbOperationalScope
} from '@/lib/orb/operational-client'
import { queryOrbConversation, type OrbConversationResponse, type OrbScope } from '@/lib/os-api/orb'
import type { OsPersonSummary } from '@/lib/os-api/workspaces'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  response?: OrbConversationResponse
}

type OrbIntelligenceResponse = OrbConversationResponse & {
  care_journey?: {
    emotional_themes?: string[]
    protective_factors?: string[]
    evidence_gaps?: string[]
  }
  regulatory_reasoning?: {
    inspection_relevance?: Array<{ label?: string; reason?: string }>
    management_considerations?: string[]
  }
  therapeutic_reasoning?: {
    therapeutic_observations?: string[]
  }
  context_used?: OrbConversationResponse['context_used'] & {
    degraded?: boolean
    pool_saturation_pct?: number
  }
}

const scopeOptions: Array<{ value: OrbScope; label: string; prompt: string; operationalScope: OrbOperationalScope }> = [
  { value: 'home', label: 'Home', prompt: 'What has changed in the home today?', operationalScope: 'home' },
  { value: 'child', label: 'Child', prompt: "Summarise this young person's recent care journey.", operationalScope: 'child' },
  { value: 'workforce', label: 'Workforce', prompt: 'What workforce issues are emerging?', operationalScope: 'staff' },
  { value: 'governance', label: 'Governance', prompt: 'What risks need manager review?', operationalScope: 'provider' },
  { value: 'inspection', label: 'Inspection', prompt: 'What is missing for inspection readiness?', operationalScope: 'home' },
  { value: 'provider', label: 'Provider', prompt: 'What should the registered manager look at first?', operationalScope: 'provider' }
]

const operationalModes: Array<{ mode: OrbOperationalMode; label: string; prompt: string }> = [
  { mode: 'general_operational_question', label: 'Ask OS ORB', prompt: 'What should I focus on in my role today?' },
  { mode: 'manager_daily_brief', label: 'Manager Daily Brief', prompt: 'What needs my attention today?' },
  { mode: 'record_quality_review', label: 'Record Quality', prompt: 'Which records may need recording review?' },
  { mode: 'safeguarding_themes', label: 'Safeguarding Themes', prompt: 'What safeguarding themes are emerging?' },
  { mode: 'ofsted_evidence_review', label: 'Ofsted Evidence', prompt: 'What would Ofsted ask about this home?' },
  { mode: 'action_priority', label: 'Actions', prompt: 'What actions should I prioritise this week?' },
  { mode: 'staff_support', label: 'Staff Support', prompt: 'Prepare supervision points for this staff member.' },
  { mode: 'child_journey_summary', label: 'Child Journey', prompt: "Summarise this child's last 7 days." },
  { mode: 'governance_briefing', label: 'Governance', prompt: 'Create a Reg 45 improvement briefing outline.' }
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
  return {
    ok: true,
    answer: response.answer,
    summary: response.context_summary?.headline || response.answer.split('\n', 1)[0].slice(0, 220),
    sources,
    citations: sources,
    actions: (response.context_summary?.attention_items || []).slice(0, 5).map((label) => ({
      label,
      type: 'review' as const,
      route: '/intelligence-actions'
    })),
    confidence: response.context_summary?.degraded || response.context_summary?.unavailable ? 'low' : 'medium',
    guardrails: response.boundaries?.notices || [
      'OS ORB can use permissioned IndiCare context. It only sees information available to your role.'
    ],
    context_used: {
      scope: response.permissions?.scope_resolved || undefined,
      care_retrieval: response.care_record_access,
      degraded: response.context_summary?.degraded,
      snapshot_hit: !response.context_summary?.unavailable
    }
  }
}

function normaliseInitialScope(scope?: string): OrbScope {
  return scopeOptions.some((item) => item.value === scope) ? scope as OrbScope : 'home'
}

function childName(person: OsPersonSummary) {
  return String(person.preferredName || person.displayName || person.firstName || `Young person ${person.id}`)
}

function scopePrompt(scope: OrbScope) {
  return scopeOptions.find((item) => item.value === scope)?.prompt || scopeOptions[0].prompt
}

function fieldText(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const field = (value as Record<string, unknown>)[key]
  return typeof field === 'string' ? field : ''
}

function cognitionSummary(response: OrbConversationResponse) {
  return fieldText(response.operational_atmosphere, 'manager_summary') ||
    fieldText(response.operational_cognition, 'cognition_summary') ||
    'ORB returned atmosphere, trajectory, impact and reflection blocks for review.'
}

export function OrbConversationExperience({
  childrenOptions,
  initialScope,
  initialYoungPersonId,
  initialPrompt
}: {
  childrenOptions: OsPersonSummary[]
  initialScope?: string
  initialYoungPersonId?: string
  initialPrompt?: string
}) {
  const startingScope = normaliseInitialScope(initialScope)
  const [scope, setScope] = useState<OrbScope>(startingScope)
  const [operationalMode, setOperationalMode] = useState<OrbOperationalMode>('general_operational_question')
  const [youngPersonId, setYoungPersonId] = useState<string>(startingScope === 'child' ? initialYoungPersonId || '' : '')
  const [conversationId] = useState(() => `orb-${Date.now().toString(36)}`)
  const [input, setInput] = useState(initialPrompt || scopePrompt(startingScope))
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [latestOperational, setLatestOperational] = useState<OrbOperationalResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<OrbOperationalRequest | null>(null)
  const [savedOutputId, setSavedOutputId] = useState<string | null>(null)
  const [outputsPanelOpen, setOutputsPanelOpen] = useState(false)
  const [outputsRefresh, setOutputsRefresh] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const latestResponse = useMemo(() => [...messages].reverse().find((message) => message.response)?.response, [messages])
  const latestIntelligence = latestResponse as OrbIntelligenceResponse | undefined
  const latestContext = latestIntelligence?.context_used
  const isDegraded = Boolean(latestContext?.degraded)
  const statusLabel = latestContext?.care_retrieval === false
    ? `${latestContext.brain || 'general'} - no care retrieval`
    : isDegraded ? 'Partial context' : latestContext?.snapshot_hit ? 'Snapshot + live' : 'Live DB backed'
  const cognitionTimeline = messages.filter((message) => message.role === 'assistant' && message.response)
  const voiceHref = `/assistant/orb?voice=1&scope=${encodeURIComponent(scope)}${youngPersonId ? `&young_person_id=${encodeURIComponent(youngPersonId)}` : ''}`

  async function submit(event?: FormEvent<HTMLFormElement>, override?: string, overrideScope?: OrbScope) {
    event?.preventDefault()
    const message = (override || input).trim()
    if (!message || pending) return
    const activeScope = overrideScope || scope
    const selectedChildId = youngPersonId ? Number(youngPersonId) : null
    const userMessage: Message = { id: `u-${Date.now()}`, role: 'user', text: message }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setPending(true)
    setWarning(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const scopeMeta = scopeOptions.find((item) => item.value === activeScope) || scopeOptions[0]
    const operationalPayload: OrbOperationalRequest = {
      message,
      mode: operationalMode,
      scope: scopeMeta.operationalScope,
      child_id: activeScope === 'child' ? selectedChildId : null,
      staff_id: activeScope === 'workforce' ? null : null,
      days: 7
    }
    setLastRequest(operationalPayload)
    const operationalResult = await sendOperationalOrbMessage(operationalPayload, controller.signal)
    let responseData: OrbConversationResponse
    if (operationalResult.source === 'live' && operationalResult.data.answer) {
      setLatestOperational(operationalResult.data)
      if (operationalResult.data.operational_output?.saved && operationalResult.data.operational_output.output_id) {
        setSavedOutputId(operationalResult.data.operational_output.output_id)
        setOutputsRefresh((n) => n + 1)
      }
      responseData = mapOperationalResponse(operationalResult.data)
      const evalWarnings = operationalResult.data.warnings || []
      setWarning([operationalResult.warning, ...evalWarnings].filter(Boolean).join(' ') || null)
    } else {
      setLatestOperational(null)
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
      setWarning(legacy.warning || operationalResult.warning || null)
    }
    setMessages((current) => [
      ...current,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: responseData.answer,
        response: responseData
      }
    ])
    setPending(false)
  }

  function applyScope(nextScope: OrbScope) {
    setScope(nextScope)
    setInput(scopePrompt(nextScope))
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-[36px] bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-white md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Operational ORB</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-slate-950 md:text-6xl">Reflective operational cognition</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              OS ORB can use permissioned IndiCare context. It only sees information available to your role. Care questions use scoped summary context and source labels; everyday questions may use general support without care retrieval.
            </p>
          </div>
          <div className={`rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] ${isDegraded ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>
            {statusLabel}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Scope
            <select value={scope} onChange={(event) => applyScope(event.target.value as OrbScope)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-400">
              {scopeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Child context
            <select value={youngPersonId} onChange={(event) => setYoungPersonId(event.target.value)} disabled={scope !== 'child' || !childrenOptions.length} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-400">
              <option value="">{childrenOptions.length ? 'No child selected' : 'No child records returned'}</option>
              {childrenOptions.map((person) => <option key={person.id} value={person.id}>{childName(person)}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ['Voice state', 'Voice ORB stays inside this same ORB workspace'],
            ['RM review', 'Themes support review, not final decisions'],
            ['Current brain', latestContext?.brain || latestIntelligence?.regulatory_reasoning?.inspection_relevance?.[0]?.label || 'Auto-routed']
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <p className="mt-1 text-xs font-black text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOutputsPanelOpen(true)}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
            data-testid="orb-open-operational-outputs"
          >
            Operational outputs
          </button>
          {savedOutputId ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-900">
              Saved ref {savedOutputId.slice(0, 8)}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2" data-testid="orb-operational-permission-badges">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-800">
            Permissioned OS context
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">
            Summary-level evidence
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-900">
            Manager review where indicated
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-xs font-semibold leading-6 text-blue-900">
          OS ORB can use permissioned IndiCare context. It only sees information available to your role. ORB does not make final safeguarding or inspection decisions.
          {latestOperational?.audit_summary?.audit_reference ? (
            <span className="mt-2 block text-[11px] font-bold opacity-80">
              Audit ref: {latestOperational.audit_summary.audit_reference}
              {latestOperational.permissions?.role ? ` · Role: ${latestOperational.permissions.role}` : ''}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {operationalModes.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => {
                setOperationalMode(item.mode)
                void submit(undefined, item.prompt, scope)
              }}
              className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                operationalMode === item.mode
                  ? 'border-slate-900 bg-slate-950 text-white'
                  : 'border-blue-100 bg-white text-blue-800 hover:bg-blue-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {scopeOptions.map((item) => (
            <button key={item.value} type="button" onClick={() => { applyScope(item.value); void submit(undefined, item.prompt, item.value) }} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 min-h-[360px] space-y-4 rounded-[28px] bg-slate-50 p-4">
          {!messages.length ? (
            <div className="flex h-72 items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-center">
              <div>
                <Sparkles className="mx-auto h-8 w-8 text-blue-500" aria-hidden />
                <p className="mt-3 text-sm font-black text-slate-800">Ask about children, workforce, governance, documents, reports, actions, inspection evidence or everyday questions.</p>
                <p className="mt-2 text-xs font-bold text-slate-500">Care answers cite scoped records. General answers will say no care records were retrieved.</p>
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <article key={message.id} className={`rounded-[24px] p-4 ${message.role === 'user' ? 'ml-auto max-w-2xl bg-slate-950 text-white' : 'mr-auto max-w-4xl bg-white text-slate-800 shadow-sm ring-1 ring-slate-100'}`}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-60">{message.role === 'user' ? 'You' : 'ORB'}</p>
                <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7">{message.text}</div>
                {message.response ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-950">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Evidence</p>
                      <p className="mt-1 text-sm font-black">{message.response.context_used?.care_retrieval === false ? 'No care retrieval' : `${message.response.sources?.length || 0} source${message.response.sources?.length === 1 ? '' : 's'}`}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-950">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Actions</p>
                      <p className="mt-1 text-sm font-black">{message.response.actions?.length || 0} suggested</p>
                    </div>
                    <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-purple-950">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-600">Confidence</p>
                      <p className="mt-1 text-sm font-black">{message.response.confidence || 'review'}</p>
                    </div>
                  </div>
                ) : null}
                {message.response?.operational_atmosphere || message.response?.operational_cognition ? (
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Converged cognition surfaced</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                      {cognitionSummary(message.response)}
                    </p>
                  </div>
                ) : null}
            </article>
          ))}
          {pending ? <div className="rounded-[24px] bg-white p-4 text-sm font-black text-blue-700 ring-1 ring-blue-100">ORB is checking live records...</div> : null}
          {latestOperational?.privacy_guard ? (
            <div
              className="rounded-[24px] border border-blue-100 bg-blue-50/80 p-4 text-sm font-medium text-blue-950"
              data-testid="operational-privacy-guard-badge"
            >
              <span className="font-black">Privacy guard applied</span>
              {latestOperational.privacy_guard.minimisation_applied ? (
                <span className="ml-2 text-xs font-bold">· Summary-level context</span>
              ) : null}
              {latestOperational.privacy_guard.redaction_applied ? (
                <span className="ml-2 text-xs font-bold">· Redaction applied</span>
              ) : null}
              {latestOperational.privacy_guard.manager_review_required ? (
                <span className="ml-2 text-xs font-bold text-amber-800">· Manager review required</span>
              ) : null}
            </div>
          ) : null}
          {warning ? <div className="rounded-[24px] bg-amber-50 p-4 text-sm font-bold text-amber-800 ring-1 ring-amber-100">{warning}</div> : null}
        </div>

        <form onSubmit={submit} className="mt-4 flex gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
          <label htmlFor="orb-message" className="sr-only">Ask ORB</label>
          <textarea
            id="orb-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="Ask ORB what needs review..."
            className="min-h-12 flex-1 resize-none rounded-[18px] px-4 py-3 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button type="submit" disabled={!input.trim() || pending} className="rounded-[20px] bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            <Send className="h-4 w-4" aria-hidden />
            <span className="sr-only">Send</span>
          </button>
        </form>
      </section>

      <aside className="space-y-4">
        {latestOperational?.briefing ? (
          <OrbOperationalBriefingCard
            briefing={latestOperational.briefing}
            request={lastRequest || undefined}
            answer={latestOperational.answer}
            onSaved={(id) => {
              setSavedOutputId(id)
              setOutputsRefresh((n) => n + 1)
            }}
          />
        ) : null}

        <OrbOperationalContextPanel
          cards={latestOperational?.context_cards || []}
          contextStatus={latestOperational?.context_status}
        />

        <OrbOperationalSourcePanel
          sources={latestOperational?.sources || []}
          evidenceItems={latestOperational?.evidence_items}
        />

        <OrbOperationalActionsPanel
          recommendations={latestOperational?.recommendations || []}
          draftActions={latestOperational?.draft_actions || []}
          reviewPrompts={latestOperational?.review_prompts || []}
          scope={{
            child_id: lastRequest?.child_id,
            home_id: lastRequest?.home_id,
            staff_id: lastRequest?.staff_id,
            output_id: savedOutputId
          }}
          onActionsCreated={() => setOutputsRefresh((n) => n + 1)}
        />

        <section className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" aria-hidden />
            <h2 className="text-lg font-black text-slate-950">Review guardrails</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
            {(latestResponse?.guardrails?.length ? latestResponse.guardrails : ['ORB supports review; it does not replace RM or safeguarding judgement.']).map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </section>

        <OrbCognitionPanels response={latestResponse} />

        <section className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white">
          <h2 className="text-lg font-black text-slate-950">Cognition timeline</h2>
          <div className="mt-4 space-y-3">
            {cognitionTimeline.map((message, index) => (
              <article key={message.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Step {index + 1}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{message.response?.context_used?.scope || scope} reasoning</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{message.response?.sources?.length || 0} sources, {message.response?.context_used?.projection_keys?.length || 0} projection keys, confidence {message.response?.confidence || 'review'}.</p>
              </article>
            ))}
            {!cognitionTimeline.length ? <p className="text-sm font-semibold leading-6 text-slate-500">Timeline appears after ORB checks live context.</p> : null}
          </div>
        </section>

        <section className="rounded-[32px] bg-slate-950 p-5 text-white shadow-lg shadow-slate-300/60">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Context used</h2>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${isDegraded ? 'bg-amber-300 text-slate-950' : 'bg-emerald-300 text-slate-950'}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">Scope: {latestResponse?.context_used?.scope || scope}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Confidence: {latestResponse?.confidence || 'not run yet'}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Brain: {latestResponse?.context_used?.brain || 'not routed yet'}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Care retrieval: {latestResponse?.context_used?.care_retrieval === false ? 'no' : latestResponse ? 'yes' : 'not run yet'}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Live tables: {latestResponse?.context_used?.live_tables?.length || 0}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Projection keys: {latestResponse?.context_used?.projection_keys?.length || 0}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Pool saturation: {latestContext?.pool_saturation_pct ?? 0}%</p>
          <Link href={voiceHref} className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white">
            <Mic2 className="h-4 w-4" aria-hidden />
            Voice ORB uses this same ORB identity
          </Link>
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white/10 p-3 text-xs font-semibold leading-5 text-slate-200">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
            Typed and voice ORB now share one routing identity: scoped care questions use guardrails and general questions stay out of care records.
          </div>
        </section>
      </aside>

      <OrbOperationalOutputsPanel
        open={outputsPanelOpen}
        onClose={() => setOutputsPanelOpen(false)}
        refreshToken={outputsRefresh}
      />
    </div>
  )
}
