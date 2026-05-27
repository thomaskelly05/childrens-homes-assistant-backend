"use client"

import { FormEvent, useMemo, useState } from 'react'
import { apiPost } from '@/lib/api'

type OrbSource = {
  label?: string
  source_type?: string
  basis?: string
  route?: string
  excerpt?: string
}

type OrbResponse = {
  success?: boolean
  data?: {
    answer?: string
    sources?: OrbSource[]
    citations?: Array<{ citation_ref?: string; label?: string; source_type?: string; basis?: string; route?: string }>
    warnings?: string[]
    context_summary?: {
      headline?: string
      summary_lines?: string[]
      unavailable?: boolean
    }
    privacy_guard?: unknown
    audit_reference?: string
  }
}

const starterPrompts = [
  'What needs manager review today?',
  'Summarise this child’s last 30 days',
  'What would Ofsted want to understand here?',
  'What evidence is missing?',
  'What actions are overdue?',
  'Help me write this therapeutically'
]

export function OrbConversationPanel({ childId, homeId, scope = 'child' }: { childId?: string; homeId?: string; scope?: 'child' | 'home' | 'provider' | 'current_user' }) {
  const [message, setMessage] = useState('What needs manager review today?')
  const [answer, setAnswer] = useState('Ask ORB a question. ORB should answer only from permissioned IndiCare OS evidence and say what is missing if it cannot evidence something.')
  const [sources, setSources] = useState<OrbSource[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('Ready · OS-linked ORB')

  const resolvedScope = useMemo(() => {
    if (childId) return 'child'
    if (homeId) return 'home'
    return scope
  }, [childId, homeId, scope])

  async function askOrb(event?: FormEvent) {
    event?.preventDefault()
    setLoading(true)
    setStatus('ORB is checking the OS evidence spine...')
    const result = await apiPost<OrbResponse>('/api/assistant/orb/conversation', {
      message,
      mode: message.toLowerCase().includes('ofsted') ? 'ofsted_evidence_review' : message.toLowerCase().includes('write') || message.toLowerCase().includes('therapeutic') ? 'recording_live_coach' : 'general_operational_question',
      scope: resolvedScope,
      child_id: childId ? Number(childId) : undefined,
      home_id: homeId ? Number(homeId) : undefined,
      days: 30,
      include_actions: true,
      include_record_quality: true,
      include_patterns: true
    })
    const payload = result.data?.data
    if (result.ok && payload?.answer) {
      setAnswer(payload.answer)
      setSources(payload.sources || [])
      setWarnings(payload.warnings || [])
      setStatus(`Answered · ${payload.sources?.length || 0} source(s) returned`)
    } else {
      setAnswer('ORB could not answer from the OS route just now. Check the backend route, session permissions or diagnostics endpoint.')
      setSources([])
      setWarnings([result.error || `Request failed with status ${result.status}`])
      setStatus('ORB route unavailable')
    }
    setLoading(false)
  }

  return (
    <section className="ic-live-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <p className="ic-eyebrow">OS-linked ORB</p>
          <h2>Ask once. Search the OS. Save adult time.</h2>
          <p className="ic-body-copy">Scope: {resolvedScope}{childId ? ` · child ${childId}` : ''}{homeId ? ` · home ${homeId}` : ''}</p>
        </div>
        <span className="ic-pill">{status}</span>
      </div>

      <form onSubmit={askOrb} style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          style={{ width: '100%', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '1.2rem', padding: '1rem', resize: 'vertical' }}
          placeholder="Ask ORB about this child, home or provider..."
        />
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="ic-primary-action" type="submit" disabled={loading}>{loading ? 'Checking evidence...' : 'Ask ORB'}</button>
          {starterPrompts.map((prompt) => (
            <button key={prompt} className="ic-secondary-action" type="button" onClick={() => setMessage(prompt)}>{prompt}</button>
          ))}
        </div>
      </form>

      <div className="ic-soft-row" style={{ marginTop: '1rem' }}>
        <p>ORB answer</p>
        <strong style={{ whiteSpace: 'pre-wrap' }}>{answer}</strong>
      </div>

      {warnings.length ? (
        <div className="ic-empty-card" style={{ marginTop: '1rem' }}>
          <strong>Warnings / limitations</strong>
          <p>{warnings.join(' · ')}</p>
        </div>
      ) : null}

      <div style={{ marginTop: '1rem' }}>
        <p className="ic-eyebrow">Evidence returned</p>
        <div className="ic-soft-list" style={{ marginTop: '0.75rem' }}>
          {sources.length ? sources.slice(0, 8).map((source, index) => (
            <article className="ic-soft-row" key={`${source.label || 'source'}-${index}`}>
              <p>{source.source_type || 'source'} · [{index + 1}]</p>
              <strong>{source.label || 'Operational source'}</strong>
              <span style={{ display: 'block', marginTop: '0.35rem', color: '#64748b', lineHeight: 1.55 }}>{source.basis || source.excerpt || 'Evidence source returned without a summary.'}</span>
              {source.route ? <span style={{ display: 'block', marginTop: '0.35rem', color: '#2563eb', fontWeight: 800 }}>{source.route}</span> : null}
            </article>
          )) : (
            <div className="ic-empty-card">
              <strong>No evidence shown yet</strong>
              <p>After ORB answers, source-labelled evidence should appear here. If none appears, use diagnostics before trusting the response.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
