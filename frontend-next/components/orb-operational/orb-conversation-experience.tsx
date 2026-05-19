'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Send, ShieldCheck, Sparkles } from 'lucide-react'

import { queryOrbConversation, type OrbConversationResponse, type OrbScope } from '@/lib/os-api/orb'
import type { OsPersonSummary } from '@/lib/os-api/workspaces'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  response?: OrbConversationResponse
}

const scopeOptions: Array<{ value: OrbScope; label: string; prompt: string }> = [
  { value: 'home', label: 'Home', prompt: 'What has changed in the home today?' },
  { value: 'child', label: 'Child', prompt: "Summarise this young person's recent care journey." },
  { value: 'workforce', label: 'Workforce', prompt: 'What workforce issues are emerging?' },
  { value: 'governance', label: 'Governance', prompt: 'What risks need manager review?' },
  { value: 'inspection', label: 'Inspection', prompt: 'What is missing for inspection readiness?' },
  { value: 'provider', label: 'Provider', prompt: 'What should the registered manager look at first?' }
]

function childName(person: OsPersonSummary) {
  return String(person.preferredName || person.displayName || person.firstName || `Young person ${person.id}`)
}

function scopePrompt(scope: OrbScope) {
  return scopeOptions.find((item) => item.value === scope)?.prompt || scopeOptions[0].prompt
}

export function OrbConversationExperience({ childrenOptions }: { childrenOptions: OsPersonSummary[] }) {
  const [scope, setScope] = useState<OrbScope>('home')
  const [youngPersonId, setYoungPersonId] = useState<string>('')
  const [conversationId] = useState(() => `orb-${Date.now().toString(36)}`)
  const [input, setInput] = useState(scopePrompt('home'))
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const latestResponse = useMemo(() => [...messages].reverse().find((message) => message.response)?.response, [messages])

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
    const result = await queryOrbConversation({
      message,
      scope: activeScope,
      young_person_id: activeScope === 'child' ? selectedChildId : null,
      conversation_id: conversationId
    }, controller.signal)
    setWarning(result.warning || null)
    setMessages((current) => [
      ...current,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: result.data.answer,
        response: result.data
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
            <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] text-slate-950 md:text-6xl">Ask live IndiCare records</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">ORB retrieves live permitted records, cites sources where available, and keeps professional judgement with the registered manager and safeguarding leads.</p>
          </div>
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            {latestResponse?.context_used?.snapshot_hit ? 'Snapshot + live' : 'Live DB backed'}
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

        <div className="mt-6 flex flex-wrap gap-2">
          {scopeOptions.map((item) => (
            <button key={item.value} type="button" onClick={() => { applyScope(item.value); void submit(undefined, item.prompt, item.value) }} className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-800 transition hover:bg-blue-100">
              {item.prompt}
            </button>
          ))}
        </div>

        <div className="mt-6 min-h-[360px] space-y-4 rounded-[28px] bg-slate-50 p-4">
          {!messages.length ? (
            <div className="flex h-72 items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-center">
              <div>
                <Sparkles className="mx-auto h-8 w-8 text-blue-500" aria-hidden />
                <p className="mt-3 text-sm font-black text-slate-800">Ask about children, workforce, governance, documents, reports, actions or inspection evidence.</p>
                <p className="mt-2 text-xs font-bold text-slate-500">If live records are missing, ORB will say so.</p>
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <article key={message.id} className={`rounded-[24px] p-4 ${message.role === 'user' ? 'ml-auto max-w-2xl bg-slate-950 text-white' : 'mr-auto max-w-4xl bg-white text-slate-800 shadow-sm ring-1 ring-slate-100'}`}>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-60">{message.role === 'user' ? 'You' : 'ORB'}</p>
              <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-7">{message.text}</div>
            </article>
          ))}
          {pending ? <div className="rounded-[24px] bg-white p-4 text-sm font-black text-blue-700 ring-1 ring-blue-100">ORB is checking live records...</div> : null}
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
        <section className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" aria-hidden />
            <h2 className="text-lg font-black text-slate-950">Review guardrails</h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
            {(latestResponse?.guardrails?.length ? latestResponse.guardrails : ['ORB supports review; it does not replace RM or safeguarding judgement.']).map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </section>

        <section className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white">
          <h2 className="text-lg font-black text-slate-950">Sources</h2>
          <div className="mt-4 space-y-3">
            {latestResponse?.sources?.map((source) => (
              <article key={`${source.record_type}-${source.record_id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{source.citation_ref} {source.record_type.replaceAll('_', ' ')}</p>
                <h3 className="mt-1 text-sm font-black text-slate-900">{source.title}</h3>
                <p className="mt-1 line-clamp-3 text-xs font-semibold leading-5 text-slate-500">{source.summary || 'Record available for review.'}</p>
                {source.route ? <Link href={source.route} className="mt-2 inline-block text-xs font-black text-blue-700">Open source</Link> : null}
              </article>
            ))}
            {!latestResponse?.sources?.length ? <p className="text-sm font-semibold leading-6 text-slate-500">Citations appear here when live records are returned.</p> : null}
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white">
          <h2 className="text-lg font-black text-slate-950">Suggested actions</h2>
          <div className="mt-4 space-y-2">
            {latestResponse?.actions?.map((action) => (
              <Link key={`${action.type}-${action.label}`} href={action.route || '/command-centre'} className="block rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
                {action.label}
              </Link>
            ))}
            {!latestResponse?.actions?.length ? <p className="text-sm font-semibold leading-6 text-slate-500">Actions appear after ORB checks the live context.</p> : null}
          </div>
        </section>

        <section className="rounded-[32px] bg-slate-950 p-5 text-white shadow-lg shadow-slate-300/60">
          <h2 className="text-lg font-black">Context used</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">Scope: {latestResponse?.context_used?.scope || scope}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Confidence: {latestResponse?.confidence || 'not run yet'}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Live tables: {latestResponse?.context_used?.live_tables?.length || 0}</p>
          <p className="text-sm font-semibold leading-6 text-slate-300">Projection keys: {latestResponse?.context_used?.projection_keys?.length || 0}</p>
        </section>
      </aside>
    </div>
  )
}
