'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCopy, FileText, GitPullRequest, RefreshCw, ShieldAlert } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import type {
  OrbQualityAgentAnalysis,
  OrbQualityAgentAuditRecord,
  OrbQualityBuildBrief,
  OrbQualityPrSummary
} from '@/lib/orb/quality-agent/orb-quality-agent-types'
import { ORB_QUALITY_AGENT_DISCLAIMER } from '@/lib/orb/quality-agent/orb-quality-agent-service'

const SAFETY_RISK_COLOURS: Record<string, string> = {
  critical: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  high: 'text-orange-300 border-orange-400/30 bg-orange-500/10',
  medium: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  low: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
}

export function FounderOrbQualityAgentPage() {
  const [analysis, setAnalysis] = useState<OrbQualityAgentAnalysis | null>(null)
  const [auditRecords, setAuditRecords] = useState<OrbQualityAgentAuditRecord[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [brief, setBrief] = useState<OrbQualityBuildBrief | null>(null)
  const [briefFormatted, setBriefFormatted] = useState<string | null>(null)
  const [prSummary, setPrSummary] = useState<OrbQualityPrSummary | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadAnalysis = useCallback(async () => {
    setLoadState('loading')
    setLoadError(null)
    try {
      const [analyzeRes, auditRes] = await Promise.all([
        fetch('/api/orb/quality-agent/analyze', { cache: 'no-store' }),
        fetch('/api/orb/quality-agent/audit', { cache: 'no-store' })
      ])

      if (!analyzeRes.ok) {
        const err = (await analyzeRes.json().catch(() => ({}))) as { message?: string }
        throw new Error(err.message ?? 'Failed to load ORB Quality Agent analysis.')
      }

      const analyzePayload = (await analyzeRes.json()) as { data: OrbQualityAgentAnalysis }
      setAnalysis(analyzePayload.data)

      if (auditRes.ok) {
        const auditPayload = (await auditRes.json()) as { data: { records: OrbQualityAgentAuditRecord[] } }
        setAuditRecords(auditPayload.data.records ?? [])
      }

      setLoadState('ready')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load analysis.')
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadAnalysis()
  }, [loadAnalysis])

  const handleGenerateBrief = async () => {
    if (!analysis) return
    setBusy('Generating build brief…')
    setMessage(null)
    try {
      const res = await fetch('/api/orb/quality-agent/build-brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runId: analysis.run.id })
      })
      if (!res.ok) throw new Error('Build brief generation failed.')
      const payload = (await res.json()) as { data: { brief: OrbQualityBuildBrief; formatted: string } }
      setBrief(payload.data.brief)
      setBriefFormatted(payload.data.formatted)
      setMessage('Build brief generated. Review constraints before pasting into Cursor.')
      void loadAnalysis()
    } catch {
      setMessage('Could not generate build brief.')
    } finally {
      setBusy(null)
    }
  }

  const handleCreateDraftPr = async () => {
    if (!analysis) return
    setBusy('Preparing draft PR…')
    setMessage(null)
    try {
      const res = await fetch('/api/orb/quality-agent/create-pr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ runId: analysis.run.id })
      })
      if (!res.ok) throw new Error('Draft PR preparation failed.')
      const payload = (await res.json()) as { data: { prSummary: OrbQualityPrSummary } }
      setPrSummary(payload.data.prSummary)
      setMessage('Draft PR prepared. Founder approval required — auto-merge is not available.')
      void loadAnalysis()
    } catch {
      setMessage('Could not prepare draft PR.')
    } finally {
      setBusy(null)
    }
  }

  const handleCopyBrief = async () => {
    if (!briefFormatted) return
    await navigator.clipboard.writeText(briefFormatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <FounderNavHeader
        title="ORB Quality Agent"
        subtitle="ORB Residential — powered by IndiCare Intelligence. Monitors evaluation failures, classifies root causes, and prepares founder-approved improvement work."
        showBack
        backHref="/founder/orb-evaluation"
      />

      <div
        className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm leading-6 text-amber-100"
        data-testid="orb-quality-agent-disclaimer"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
          <p>{ORB_QUALITY_AGENT_DISCLAIMER}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void loadAnalysis()}
          disabled={loadState === 'loading'}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loadState === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
          Refresh analysis
        </button>
        {analysis ? (
          <span
            className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-200"
            data-testid="approval-required-badge"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Approval required
          </span>
        ) : null}
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {loadError}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-4 text-sm text-cyan-100">
          {message}
        </div>
      ) : null}

      {analysis ? (
        <>
          <FounderSectionCard title="Latest Run Status">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Run</dt>
                <dd className="mt-1 font-mono text-sm text-white">{analysis.run.id}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Type</dt>
                <dd className="mt-1 text-sm text-white">{analysis.runType}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</dt>
                <dd className="mt-1 text-sm text-white">{analysis.run.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Failed scenarios</dt>
                <dd className="mt-1 text-sm text-white">{analysis.failedResults.length}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate-400">
              Suggested next action: <span className="text-cyan-200">{analysis.suggestedNextAction}</span>
            </p>
          </FounderSectionCard>

          <FounderSectionCard title="Detected Failure Groups">
            {analysis.failureGroups.length === 0 ? (
              <p className="text-sm text-slate-400">No failures detected in the latest run.</p>
            ) : (
              <div className="space-y-4">
                {analysis.failureGroups.map((group) => (
                  <div
                    key={group.classification}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                    data-testid={`failure-group-${group.classification}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{group.label}</h3>
                        <p className="mt-1 text-sm text-slate-400">{group.reason}</p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${SAFETY_RISK_COLOURS[group.safetyRisk] ?? SAFETY_RISK_COLOURS.medium}`}
                      >
                        {group.safetyRisk} risk
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confidence</dt>
                        <dd className="mt-1 text-sm text-white">{group.confidence}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Categories</dt>
                        <dd className="mt-1 text-sm text-white">{group.affectedScenarioCategories.join(', ')}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recommended action</dt>
                        <dd className="mt-1 text-sm text-cyan-200">{group.recommendedAction}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </FounderSectionCard>

          <FounderSectionCard title="Actions">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleGenerateBrief()}
                disabled={!!busy || analysis.failureGroups.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
                data-testid="generate-build-brief-button"
              >
                <FileText className="h-4 w-4" aria-hidden />
                Generate build brief
              </button>
              <button
                type="button"
                onClick={() => void handleCreateDraftPr()}
                disabled={!!busy || analysis.failureGroups.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20 disabled:opacity-50"
                data-testid="create-draft-pr-button"
              >
                <GitPullRequest className="h-4 w-4" aria-hidden />
                Create draft PR
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500" data-testid="no-auto-merge-notice">
              Auto-merge is not available. Tom must approve all PRs.
            </p>
            {busy ? <p className="mt-2 text-sm text-slate-400">{busy}</p> : null}
          </FounderSectionCard>

          {briefFormatted ? (
            <FounderSectionCard title="Generated Build Brief">
              <button
                type="button"
                onClick={() => void handleCopyBrief()}
                className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <pre className="max-h-96 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-slate-300 whitespace-pre-wrap">
                {briefFormatted}
              </pre>
            </FounderSectionCard>
          ) : null}

          {prSummary ? (
            <FounderSectionCard title="Draft PR Summary">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Title</dt>
                  <dd className="mt-1 text-white">{prSummary.title}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Branch</dt>
                  <dd className="mt-1 font-mono text-cyan-200">{prSummary.branchName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Founder approval</dt>
                  <dd className="mt-1 flex items-center gap-2 text-amber-200">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Required — auto-merge disabled
                  </dd>
                </div>
              </dl>
              <pre className="mt-4 max-h-96 overflow-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-slate-300 whitespace-pre-wrap">
                {prSummary.body}
              </pre>
            </FounderSectionCard>
          ) : null}
        </>
      ) : loadState === 'ready' ? (
        <FounderSectionCard title="No Failed Runs">
          <p className="text-sm text-slate-400">
            No failed ORB evaluation runs found. Run a high-risk or adversarial pack from ORB Evaluation first.
          </p>
        </FounderSectionCard>
      ) : null}

      {auditRecords.length > 0 ? (
        <FounderSectionCard title="Audit Trail">
          <div className="space-y-3">
            {auditRecords.slice(0, 10).map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm"
                data-testid="audit-record"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">{record.action}</span>
                  <span className="text-xs text-slate-500">{new Date(record.timestamp).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-slate-400">
                  Run {record.runId} · {record.user} · Approval: {record.approvalStatus}
                </p>
              </div>
            ))}
          </div>
        </FounderSectionCard>
      ) : null}
    </div>
  )
}
