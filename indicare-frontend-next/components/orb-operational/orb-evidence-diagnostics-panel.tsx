'use client'

import { FormEvent, useState } from 'react'

import {
  fetchOrbEvidenceDiagnostics,
  type OrbEvidenceDiagnostics,
  type OrbOperationalRequest,
  type OrbOperationalScope
} from '@/lib/orb/operational-client'

const scopeOptions: Array<{ value: OrbOperationalScope; label: string }> = [
  { value: 'child', label: 'Child' },
  { value: 'home', label: 'Home' },
  { value: 'staff', label: 'Staff' },
  { value: 'provider', label: 'Provider' },
  { value: 'current_user', label: 'Current user' }
]

export function OrbEvidenceDiagnosticsPanel({
  initialChildId,
  initialHomeId
}: {
  initialChildId?: string
  initialHomeId?: string
}) {
  const [message, setMessage] = useState('What evidence can ORB see for this scope?')
  const [scope, setScope] = useState<OrbOperationalScope>('child')
  const [childId, setChildId] = useState(initialChildId || '')
  const [homeId, setHomeId] = useState(initialHomeId || '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OrbEvidenceDiagnostics | null>(null)

  async function runDiagnostics(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const payload: OrbOperationalRequest = {
      message: message.trim() || 'Evidence diagnostics probe',
      scope,
      child_id: childId ? Number(childId) : null,
      home_id: homeId ? Number(homeId) : null,
      mode: 'general_operational_question'
    }
    try {
      const response = await fetchOrbEvidenceDiagnostics(payload)
      if (response.source !== 'live') {
        setError(response.warning || 'Diagnostics unavailable')
        setResult(response.data)
        return
      }
      setResult(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnostics request failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div data-testid="orb-evidence-diagnostics-panel" className="space-y-6">
      <form onSubmit={runDiagnostics} className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">
          Dev diagnostics for the canonical OS-linked ORB evidence spine ({'/api/assistant/orb/evidence-diagnostics'}).
        </p>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Question
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            className="rounded-2xl border border-slate-200 px-4 py-3 font-normal"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Scope
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as OrbOperationalScope)}
              className="rounded-2xl border border-slate-200 px-4 py-3 font-normal"
            >
              {scopeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Child ID
            <input
              value={childId}
              onChange={(event) => setChildId(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Home ID
            <input
              value={homeId}
              onChange={(event) => setHomeId(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {pending ? 'Running diagnostics…' : 'Run evidence diagnostics'}
        </button>
      </form>

      {error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{error}</p>
      ) : null}

      {result ? (
        <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-800">
          <div className="grid gap-2 md:grid-cols-2">
            <DiagnosticRow label="Runtime identity" value={result.runtime_identity || '—'} />
            <DiagnosticRow label="Scope" value={result.scope || '—'} />
            <DiagnosticRow label="Evidence count" value={String(result.evidence_count ?? 0)} />
            <DiagnosticRow label="Surface count" value={String(result.surface_count ?? 0)} />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Source tables / counts</p>
            <pre className="mt-2 overflow-x-auto rounded-2xl bg-white p-4 text-xs">
              {JSON.stringify(result.counts || {}, null, 2)}
            </pre>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Context sources</p>
            <pre className="mt-2 overflow-x-auto rounded-2xl bg-white p-4 text-xs">
              {JSON.stringify(result.context_sources || {}, null, 2)}
            </pre>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Source-labelled evidence (sample)</p>
            <pre className="mt-2 max-h-96 overflow-auto rounded-2xl bg-white p-4 text-xs">
              {JSON.stringify(result.items || [], null, 2)}
            </pre>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Errors / unavailable surfaces</p>
            <pre className="mt-2 overflow-x-auto rounded-2xl bg-white p-4 text-xs">
              {JSON.stringify(result.errors || [], null, 2)}
            </pre>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  )
}
