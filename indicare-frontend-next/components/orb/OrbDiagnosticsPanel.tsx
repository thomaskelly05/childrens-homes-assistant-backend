"use client"

import { FormEvent, useMemo, useState } from 'react'
import { apiPost } from '@/lib/api'

type DiagnosticItem = {
  id?: string
  label?: string
  title?: string
  source_type?: string
  source_table?: string
  source_id?: string
  date?: string
  status?: string
  summary?: string
  basis?: string
  route?: string
}

type DiagnosticResponse = {
  success?: boolean
  data?: {
    runtime_identity?: string
    scope?: string
    mode?: string
    question?: string
    child_id?: number
    home_id?: number
    evidence_count?: number
    surface_count?: number
    counts?: Record<string, number>
    items?: DiagnosticItem[]
    errors?: string[]
  }
}

export function OrbDiagnosticsPanel({ childId = '1', homeId, scope = 'child' }: { childId?: string; homeId?: string; scope?: 'child' | 'home' | 'provider' | 'current_user' }) {
  const [question, setQuestion] = useState('What needs manager review today?')
  const [loading, setLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticResponse['data'] | null>(null)
  const [error, setError] = useState('')

  const resolvedScope = useMemo(() => {
    if (childId) return 'child'
    if (homeId) return 'home'
    return scope
  }, [childId, homeId, scope])

  async function runDiagnostics(event?: FormEvent) {
    event?.preventDefault()
    setLoading(true)
    setError('')
    const result = await apiPost<DiagnosticResponse>('/api/assistant/orb/evidence-diagnostics', {
      message: question,
      mode: question.toLowerCase().includes('ofsted') ? 'ofsted_evidence_review' : 'general_operational_question',
      scope: resolvedScope,
      child_id: childId ? Number(childId) : undefined,
      home_id: homeId ? Number(homeId) : undefined,
      days: 30,
      include_actions: true,
      include_record_quality: true,
      include_patterns: true
    })
    if (result.ok && result.data?.data) {
      setDiagnostics(result.data.data)
    } else {
      setDiagnostics(null)
      setError(result.error || `Diagnostics failed with status ${result.status}`)
    }
    setLoading(false)
  }

  return (
    <section className="ic-live-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p className="ic-eyebrow">ORB evidence diagnostics</p>
          <h2>What did ORB actually check?</h2>
          <p className="ic-body-copy">Use this before relying on ORB. It confirms the runtime, scope, returned evidence and unavailable surfaces.</p>
        </div>
        <span className="ic-pill">{diagnostics?.runtime_identity || 'diagnostics ready'}</span>
      </div>

      <form onSubmit={runDiagnostics} style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          style={{ width: '100%', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '1.2rem', padding: '1rem', resize: 'vertical' }}
        />
        <button className="ic-primary-action" type="submit" disabled={loading}>{loading ? 'Checking ORB evidence...' : 'Run diagnostics'}</button>
      </form>

      {error ? (
        <div className="ic-empty-card" style={{ marginTop: '1rem' }}>
          <strong>Diagnostics unavailable</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {diagnostics ? (
        <div className="ic-story-page" style={{ marginTop: '1rem' }}>
          <section className="ic-today-grid">
            <div className="ic-signal-card"><p className="ic-eyebrow">Evidence</p><p className="ic-signal-value">{diagnostics.evidence_count || 0}</p><p>source-labelled items returned</p></div>
            <div className="ic-signal-card"><p className="ic-eyebrow">Surfaces</p><p className="ic-signal-value">{diagnostics.surface_count || 0}</p><p>source types with returned evidence</p></div>
            <div className="ic-signal-card"><p className="ic-eyebrow">Scope</p><p className="ic-signal-value">{diagnostics.scope || resolvedScope}</p><p>current ORB search scope</p></div>
            <div className="ic-signal-card"><p className="ic-eyebrow">Errors</p><p className="ic-signal-value">{diagnostics.errors?.length || 0}</p><p>unavailable surfaces</p></div>
          </section>

          <section className="ic-section-grid-2">
            <div className="ic-story-card">
              <p className="ic-eyebrow">Counts by source type</p>
              <h2>Evidence spread</h2>
              <div className="ic-soft-list" style={{ marginTop: '1rem' }}>
                {Object.entries(diagnostics.counts || {}).map(([key, value]) => (
                  <div className="ic-soft-row" key={key}><p>{key}</p><strong>{value} item(s)</strong></div>
                ))}
                {!Object.keys(diagnostics.counts || {}).length ? <div className="ic-empty-card"><strong>No counts returned</strong><p>ORB did not return any source counts for this question.</p></div> : null}
              </div>
            </div>

            <div className="ic-story-card">
              <p className="ic-eyebrow">Unavailable surfaces</p>
              <h2>What could not be checked</h2>
              <div className="ic-soft-list" style={{ marginTop: '1rem' }}>
                {(diagnostics.errors || []).slice(0, 8).map((item) => <div className="ic-soft-row" key={item}><p>error</p><strong>{item}</strong></div>)}
                {!diagnostics.errors?.length ? <div className="ic-empty-card"><strong>No surface errors returned</strong><p>ORB did not report unavailable evidence surfaces for this diagnostic run.</p></div> : null}
              </div>
            </div>
          </section>

          <section className="ic-live-card">
            <p className="ic-eyebrow">Source-labelled evidence</p>
            <h2>Records ORB can use</h2>
            <div className="ic-soft-list" style={{ marginTop: '1rem' }}>
              {(diagnostics.items || []).slice(0, 30).map((item, index) => (
                <article className="ic-soft-row" key={`${item.source_table || 'source'}-${item.source_id || index}`}>
                  <p>{item.source_type || 'source'} · {item.source_table || 'table not returned'} · [{index + 1}]</p>
                  <strong>{item.title || item.label || 'Evidence item'}</strong>
                  <span style={{ display: 'block', marginTop: '0.35rem', color: '#64748b', lineHeight: 1.55 }}>{item.summary || item.basis || 'No summary returned.'}</span>
                  <span style={{ display: 'block', marginTop: '0.35rem', color: '#2563eb', fontWeight: 800 }}>{item.route || item.source_id}</span>
                </article>
              ))}
              {!diagnostics.items?.length ? <div className="ic-empty-card"><strong>No evidence items returned</strong><p>ORB cannot answer this question from evidence until matching source records are available.</p></div> : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
