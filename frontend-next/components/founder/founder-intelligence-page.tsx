'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Bot, Building2, Loader2, RefreshCw, Sparkles } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { SaveToFounderMemoryButton } from '@/components/founder/save-to-founder-memory-button'
import { founderGet, founderPost } from '@/lib/founder/api/founder-api-client'
import { addFounderAction } from '@/lib/founder/actions/founder-action-store'
import type {
  FounderBriefingType,
  FounderIntelligenceSnapshot
} from '@/lib/founder/intelligence-centre/intelligence-centre-types'
import { narrativeToPlainText } from '@/lib/founder/intelligence-centre/founder-narrative-engine'

const PRIORITY_TONE: Record<string, string> = {
  critical: 'text-rose-300 border-rose-400/40',
  high: 'text-amber-300 border-amber-400/40',
  medium: 'text-cyan-300 border-cyan-400/40',
  low: 'text-slate-400 border-white/20'
}

const BRIEFING_BUTTONS: Array<{ type: FounderBriefingType; label: string }> = [
  { type: 'daily', label: 'Daily' },
  { type: 'weekly', label: 'Weekly' },
  { type: 'monthly', label: 'Monthly' },
  { type: 'investor', label: 'Investor' },
  { type: 'board', label: 'Board' },
  { type: 'partnership', label: 'Partnership' },
  { type: 'launch', label: 'Launch' }
]

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function FounderIntelligencePage() {
  const [snapshot, setSnapshot] = useState<FounderIntelligenceSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [briefingType, setBriefingType] = useState<FounderBriefingType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [narrativeQueued, setNarrativeQueued] = useState(false)

  const loadSnapshot = useCallback(async () => {
    const result = await founderGet<{ snapshot: FounderIntelligenceSnapshot | null }>('/intelligence/snapshot')
    if (result.ok && result.data.snapshot) {
      setSnapshot(result.data.snapshot)
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadSnapshot().finally(() => {
      if (active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [loadSnapshot])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const result = await founderPost<{ snapshot: FounderIntelligenceSnapshot }>('/intelligence/generate')
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSnapshot(result.data.snapshot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleBriefing(type: FounderBriefingType) {
    setBriefingType(type)
    setError(null)
    try {
      const result = await founderPost<{ briefing: { id: string } }>('/intelligence/briefings', { type })
      if (!result.ok) {
        setError(result.error)
        return
      }
      window.location.href = `/founder/intelligence/briefings/${result.data.briefing.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Briefing failed')
    } finally {
      setBriefingType(null)
    }
  }

  async function handleQueueNarrative() {
    setError(null)
    try {
      const result = await founderPost<{ approvalId?: string }>('/intelligence/narrative/approve', {
        period: 'daily'
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setNarrativeQueued(true)
      setTimeout(() => setNarrativeQueued(false), 3000)
    } catch {
      setError('Could not queue narrative for approval')
    }
  }

  function handleCreateAction(title: string, detail: string) {
    addFounderAction({ title: title.slice(0, 120), detail, source: 'Founder Intelligence Centre' })
  }

  const score = snapshot?.founderScore
  const dailyNarrative = snapshot?.narrative.daily

  return (
    <div className="founder-dashboard min-h-screen" data-testid="founder-intelligence-page">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Intelligence Centre"
          subtitle="Strategic decision layer for IndiCare Intelligence."
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2.5 text-sm font-bold text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-50"
            data-testid="generate-intelligence-snapshot"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {snapshot ? 'Refresh intelligence snapshot' : 'Generate intelligence snapshot'}
          </button>
          <Link
            href="/founder/intelligence/briefings"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-white/20"
          >
            View briefings
          </Link>
          <Link
            href="/founder/orb"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
          >
            <Bot className="h-4 w-4" />
            Ask ORB Founder
          </Link>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-400">Loading intelligence snapshot…</p>
        ) : !snapshot ? (
          <FounderSectionCard
            eyebrow="Get started"
            title="No intelligence snapshot yet"
            description="Generate a snapshot from Founder Memory, revenue, relationships, evidence, Quality Lab, telemetry, approvals, actions and operating loop outputs."
          >
            <p className="text-sm text-slate-400">
              Live-only data remains the default. Missing sources will appear as limitations — nothing is invented.
            </p>
          </FounderSectionCard>
        ) : (
          <>
            <FounderSectionCard eyebrow="Founder Score" title="Readiness overview" description={score?.explanation}>
              <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 p-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Overall</p>
                  <p className="mt-2 text-5xl font-black text-white" data-testid="founder-score-overall">
                    {score?.overall}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">out of 100</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ScoreBar label="Product readiness" value={score?.productReadiness ?? 0} />
                  <ScoreBar label="Evidence readiness" value={score?.evidenceReadiness ?? 0} />
                  <ScoreBar label="Commercial readiness" value={score?.commercialReadiness ?? 0} />
                  <ScoreBar label="Relationship health" value={score?.relationshipHealth ?? 0} />
                  <ScoreBar label="Revenue readiness" value={score?.revenueReadiness ?? 0} />
                  <ScoreBar label="Quality readiness" value={score?.qualityReadiness ?? 0} />
                  <ScoreBar label="Approval health" value={score?.approvalHealth ?? 0} />
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">Generated {new Date(snapshot.generatedAt).toLocaleString('en-GB')}</p>
            </FounderSectionCard>

            {snapshot.company ? (
              <FounderSectionCard
                eyebrow="Company operating model"
                title="Executive company layer"
                description="Company score, department scorecards, CEO agenda and board report status."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
                    <p className="text-xs uppercase text-slate-500">Company score</p>
                    <p className="mt-1 text-3xl font-black text-white">{snapshot.company.companyScore}/100</p>
                    <p className="text-xs text-slate-400">Confidence {snapshot.company.companyConfidence}%</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase text-slate-500">CEO agenda items</p>
                    <p className="mt-1 text-3xl font-black text-white">{snapshot.company.ceoAgendaCount}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase text-slate-500">Board report</p>
                    <p className="mt-1 text-lg font-bold text-white">{snapshot.company.boardReportStatus}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {snapshot.company.departmentScores.slice(0, 6).map((d) => (
                    <div key={d.departmentId} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                      <span className="text-slate-300">{d.name}</span>
                      <span className="float-right font-bold text-cyan-300">{d.score}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/founder/company"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200"
                >
                  <Building2 className="h-4 w-4" />
                  Open Company Operating Model
                </Link>
              </FounderSectionCard>
            ) : null}

            <FounderSectionCard eyebrow="Priorities" title="Today's priorities">
              <div className="space-y-4">
                {snapshot.topPriorities.map((priority) => (
                  <article
                    key={priority.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                    data-testid="founder-priority-item"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-bold text-white">{priority.title}</h3>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_TONE[priority.priority] ?? PRIORITY_TONE.medium}`}
                      >
                        {priority.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{priority.reason}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Confidence: {Math.round(priority.confidence * 100)}%
                      {priority.linkedEntityType ? ` · ${priority.linkedEntityType}` : ''}
                    </p>
                    <p className="mt-2 text-sm text-cyan-200/90">{priority.recommendedAction}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateAction(priority.title, priority.recommendedAction)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:border-white/20"
                      >
                        Create action
                      </button>
                      <Link
                        href={`/founder/orb?q=${encodeURIComponent(`Help me with: ${priority.title}`)}`}
                        className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
                      >
                        Ask ORB Founder
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </FounderSectionCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <FounderSectionCard eyebrow="Risks" title="Founder risks">
                <div className="space-y-3">
                  {snapshot.risks.map((risk) => (
                    <article key={risk.id} className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-4">
                      <h3 className="font-bold text-white">{risk.title}</h3>
                      <p className="mt-1 text-xs text-rose-300/80">
                        {risk.severity} · {risk.likelihood} likelihood · {risk.riskType}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">{risk.summary}</p>
                      <p className="mt-2 text-sm text-slate-300">Mitigation: {risk.mitigation}</p>
                    </article>
                  ))}
                </div>
              </FounderSectionCard>

              <FounderSectionCard eyebrow="Opportunities" title="Founder opportunities">
                <div className="space-y-3">
                  {snapshot.opportunities.map((opp) => (
                    <article key={opp.id} className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                      <h3 className="font-bold text-white">{opp.title}</h3>
                      <p className="mt-1 text-xs text-emerald-300/80">
                        {opp.opportunityType} · value {opp.valueEstimate} · {Math.round(opp.confidence * 100)}% confidence
                      </p>
                      <p className="mt-2 text-sm text-slate-400">{opp.summary}</p>
                      <p className="mt-2 text-sm text-cyan-200/90">{opp.nextAction}</p>
                    </article>
                  ))}
                </div>
              </FounderSectionCard>
            </div>

            <FounderSectionCard eyebrow="Strategy" title="Strategic alignment">
              {snapshot.strategicAlignment.deferredWarnings.length > 0 ? (
                <p className="mb-4 text-sm text-amber-200/90">{snapshot.strategicAlignment.deferredWarnings.join(' ')}</p>
              ) : null}
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-bold text-emerald-300">Aligned</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {snapshot.strategicAlignment.aligned.slice(0, 6).map((item) => (
                      <li key={item.id} className="rounded-lg border border-emerald-400/20 bg-black/20 px-3 py-2">
                        <strong className="text-white">{item.title}</strong> — {item.alignedTo} ({item.alignmentScore})
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-bold text-amber-300">Misaligned / deferred</h3>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {snapshot.strategicAlignment.misaligned.slice(0, 6).map((item) => (
                      <li key={item.id} className="rounded-lg border border-amber-400/20 bg-black/20 px-3 py-2">
                        <strong className="text-white">{item.title}</strong> — {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FounderSectionCard>

            {dailyNarrative ? (
              <FounderSectionCard eyebrow="Narrative" title="Founder narrative">
                <h3 className="text-lg font-bold text-white">{dailyNarrative.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{dailyNarrative.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/founder/content"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300"
                  >
                    Create LinkedIn Draft
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleQueueNarrative()}
                    className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200"
                  >
                    {narrativeQueued ? 'Queued' : 'Send to Approvals'}
                  </button>
                  <SaveToFounderMemoryButton
                    type="milestone"
                    title={dailyNarrative.title}
                    content={narrativeToPlainText(dailyNarrative)}
                    tags={['intelligence', 'narrative']}
                    source="Founder Intelligence Centre"
                  />
                </div>
              </FounderSectionCard>
            ) : null}

            <FounderSectionCard eyebrow="Briefings" title="Briefing generator">
              <div className="flex flex-wrap gap-2">
                {BRIEFING_BUTTONS.map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    disabled={briefingType !== null}
                    onClick={() => void handleBriefing(type)}
                    className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
                    data-testid={`generate-briefing-${type}`}
                  >
                    {briefingType === type ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null} Generate {label}{' '}
                    Briefing
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Investor, board, partnership and launch briefings create approval items before external use.
              </p>
            </FounderSectionCard>

            <FounderSectionCard eyebrow="Limitations" title="Missing data and unsupported claims">
              <ul className="list-inside list-disc space-y-2 text-sm text-amber-200/90">
                {snapshot.limitations.length > 0 ? (
                  snapshot.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)
                ) : (
                  <li className="text-slate-400">No major limitations recorded for this snapshot.</li>
                )}
              </ul>
            </FounderSectionCard>
          </>
        )}
      </div>
    </div>
  )
}
