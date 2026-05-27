'use client'

import { useState } from 'react'

type RedactPreviewResult = {
  text: string
  findings: Array<{ label: string; pattern_type: string; count: number }>
  warnings: string[]
  redaction_applied: boolean
}

export function PrivacyRedactionPreview() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<RedactPreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runPreview() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/intelligence/governance/privacy/redact-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: input, mode: 'strict' })
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.detail || 'Redaction preview failed')
      }
      setResult(payload.data as RedactPreviewResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-6" data-testid="privacy-redaction-preview">
      <div>
        <h2 className="text-lg font-black text-slate-950">Redaction preview</h2>
        <p className="text-sm font-medium text-slate-600" data-testid="privacy-redaction-preview-label">
          Paste sample text to preview automated identifier redaction. This does not store care records.
        </p>
      </div>
      <textarea
        className="min-h-[120px] w-full rounded-2xl border border-slate-200 p-4 text-sm"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste text that may contain identifiers…"
        data-testid="privacy-redaction-input"
      />
      <button
        type="button"
        onClick={runPreview}
        disabled={loading || !input.trim()}
        className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
      >
        {loading ? 'Redacting…' : 'Run redaction preview'}
      </button>
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      {result ? (
        <div className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-xs font-bold text-amber-900" data-testid="privacy-redaction-warning">
            Automated redaction may not catch every identifier. Review before sharing or exporting.
          </p>
          <pre className="whitespace-pre-wrap text-sm text-slate-800" data-testid="privacy-redaction-output">
            {result.text}
          </pre>
          {result.findings.length ? (
            <ul className="text-xs font-medium text-slate-600">
              {result.findings.map((f) => (
                <li key={f.label}>
                  {f.label}: {f.count}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
