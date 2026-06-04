'use client'

import { useCallback, useEffect, useState } from 'react'

type TrustBundle = {
  effective: Record<string, unknown>
  warnings?: string[]
  sources?: Record<string, string>
}

type TrustStatus = Record<string, string>

const BOOL_LABELS: Record<string, string> = {
  external_ai_enabled: 'Use external AI for drafting',
  prompt_storage: 'Store prompts',
  transcript_storage: 'Store transcripts',
  report_ai_drafting_enabled: 'Allow report drafting',
  realtime_voice_enabled: 'Allow realtime voice',
  premium_tts_enabled: 'Allow premium voice provider',
  local_policy_sources_enabled: 'Allow local policy sources'
}

export function AiTrustSettingsForm() {
  const [bundle, setBundle] = useState<TrustBundle | null>(null)
  const [status, setStatus] = useState<TrustStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ack, setAck] = useState({
    acknowledge_external_ai_processing: false,
    acknowledge_subprocessor_terms: false,
    acknowledge_human_review_required: false,
    acknowledge_prompt_storage: false,
    acknowledge_transcript_storage: false,
    acknowledge_redaction_off: false,
    acknowledge_premium_tts_external_provider: false
  })

  const load = useCallback(async () => {
    setError(null)
    try {
      const [settingsRes, statusRes] = await Promise.all([
        fetch('/api/admin/ai-settings', { credentials: 'include' }),
        fetch('/api/admin/ai-trust-status', { credentials: 'include' })
      ])
      if (settingsRes.status === 403) {
        setError('Only provider administrators can edit AI trust settings.')
        return
      }
      if (!settingsRes.ok) {
        setError('Could not load AI trust settings.')
        return
      }
      setBundle(await settingsRes.json())
      if (statusRes.ok) {
        setStatus(await statusRes.json())
      }
    } catch {
      setError('Network error loading settings.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function patch(partial: Record<string, unknown>) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...partial, acknowledgements: ack })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(typeof body.detail === 'string' ? body.detail : 'Save failed.')
        return
      }
      setBundle(await res.json())
      await load()
    } catch {
      setError('Network error saving settings.')
    } finally {
      setSaving(false)
    }
  }

  if (error && !bundle) {
    return <p className="text-sm text-amber-800">{error}</p>
  }

  if (!bundle?.effective) {
    return <p className="text-sm text-slate-600">Loading AI trust settings…</p>
  }

  const effective = bundle.effective

  return (
    <div className="space-y-6">
      {bundle.warnings?.length ? (
        <ul className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {bundle.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {status ? (
        <dl className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <dt className="font-medium">External AI</dt>
            <dd>{status.external_ai}</dd>
          </div>
          <div>
            <dt className="font-medium">Redaction</dt>
            <dd>{status.redaction}</dd>
          </div>
          <div>
            <dt className="font-medium">Usage audit</dt>
            <dd>{status.usage_audit}</dd>
          </div>
          <div>
            <dt className="font-medium">Settings source</dt>
            <dd>{status.settings_source}</dd>
          </div>
        </dl>
      ) : null}
      <div className="space-y-4">
        {Object.entries(BOOL_LABELS).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-4 text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(effective[key])}
              disabled={saving}
              onChange={(e) => void patch({ [key]: e.target.checked })}
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Remove identifiers before sending to AI (redaction mode)</span>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={String(effective.redaction_mode || 'strict')}
            disabled={saving}
            onChange={(e) => void patch({ redaction_mode: e.target.value })}
          >
            <option value="strict">Strict</option>
            <option value="balanced">Balanced</option>
            <option value="off">Off (high risk)</option>
          </select>
        </label>
      </div>
      <details className="rounded-xl border border-slate-200 p-4 text-sm">
        <summary className="cursor-pointer font-medium">Confirmations required for high-risk changes</summary>
        <div className="mt-3 space-y-2">
          {Object.entries(ack).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setAck((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              <span className="text-slate-600">{key.replaceAll('_', ' ')}</span>
            </label>
          ))}
        </div>
      </details>
      <p className="text-sm">
        <a href="/settings" className="underline">
          Review AI usage
        </a>{' '}
        via the governance dashboard; detailed audit rows are available to administrators through the API.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
