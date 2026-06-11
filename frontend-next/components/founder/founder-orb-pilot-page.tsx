'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { getQualityRuns, loadQualityLabOverview } from '@/lib/founder/quality-lab'
import type { OrbQualityLabOverview } from '@/lib/founder/quality-lab/quality-lab-client'
import {
  assessOrbPilotPrivacyStatus,
  computeOrbPilotReadinessGate,
  fetchFounderOrbPilotSummary,
  ORB_PILOT_EARLY_SIGNAL_MESSAGE,
  ORB_PILOT_OUTCOMES,
  type OrbPilotSummaryEngineResult
} from '@/lib/orb/pilot'

const GATE_TONE: Record<string, string> = {
  'not-ready': 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  'closed-pilot-ready': 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  'needs-review': 'text-amber-300 border-amber-400/30 bg-amber-500/10'
}

function formatMetric(value: number | undefined, suffix = ''): string {
  if (value === undefined || Number.isNaN(value)) return 'Unavailable'
  return `${value}${suffix}`
}

function outcomeEvidenceStatus(
  outcomeId: string,
  summary: OrbPilotSummaryEngineResult | null
): 'no-data-yet' | 'manual-feedback' | 'live-telemetry-available' | 'needs-manager-review' {
  if (!summary || summary.feedbackCount === 0) return 'no-data-yet'
  if (summary.evidenceLabel === 'early-signal-only') return 'needs-manager-review'
  if (outcomeId === 'child-voice' && summary.childHelpThemes.length > 0) return 'manual-feedback'
  return 'manual-feedback'
}

export function FounderOrbPilotPage() {
  const [overview, setOverview] = useState<OrbQualityLabOverview | null>(null)
  const [summary, setSummary] = useState<OrbPilotSummaryEngineResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const privacyStatus = useMemo(() => assessOrbPilotPrivacyStatus(), [])
  const runs = getQualityRuns()

  const readinessGate = useMemo(
    () =>
      computeOrbPilotReadinessGate({
        runs,
        whistleblowingCovered: overview?.coverage?.whistleblowing_covered ?? false,
        privacyUxCompleted: privacyStatus.privacyUxCompleted,
        privacyNoticeAvailable: privacyStatus.privacyNoticeAvailable,
        buildPassing: true
      }),
    [runs, overview, privacyStatus]
  )

  useEffect(() => {
    loadQualityLabOverview()
      .then(setOverview)
      .catch(() => setOverview(null))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchFounderOrbPilotSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [refresh])

  async function handleRefresh() {
    setError(null)
    setLoading(true)
    try {
      const [overviewData, summaryData] = await Promise.all([
        loadQualityLabOverview().catch(() => null),
        fetchFounderOrbPilotSummary().catch(() => null)
      ])
      setOverview(overviewData)
      setSummary(summaryData)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh pilot data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="ORB Closed Pilot Validation"
          subtitle="Measure whether ORB Residential saves time, improves records and supports safer, more child-centred practice."
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300"
            data-testid="orb-pilot-refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
          <Link
            href="/founder/quality-lab"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
          >
            Quality Lab
          </Link>
          <Link
            href="/orb/pilot/feedback"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300"
          >
            Pilot feedback form
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        ) : null}

        <FounderSectionCard eyebrow="Pilot readiness" title="Closed pilot readiness gate">
          <div className="flex flex-wrap items-center gap-3" data-testid="orb-pilot-readiness-gate">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${GATE_TONE[readinessGate.recommendation]}`}
            >
              {readinessGate.recommendation}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: 'Build passing', value: readinessGate.buildPassing === null ? 'Unavailable' : readinessGate.buildPassing ? 'Yes' : 'No' },
              { label: 'Privacy UX', value: readinessGate.privacyUxCompleted ? 'Complete' : 'Incomplete' },
              { label: 'Privacy notice', value: readinessGate.privacyNoticeAvailable ? 'Available' : 'Unavailable' },
              { label: 'Quality Lab live run', value: readinessGate.qualityLabLiveRunCompleted ? 'Complete' : 'Missing' },
              { label: 'High-risk review', value: readinessGate.highRiskScenariosReviewed ? 'Reviewed' : 'Pending' },
              { label: 'Whistleblowing coverage', value: readinessGate.whistleblowingCovered ? 'Covered' : 'Missing' },
              { label: 'Critical failures', value: String(readinessGate.criticalFailuresOpen) }
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {readinessGate.blockers.length > 0 ? (
            <ul className="mt-4 list-inside list-disc text-sm text-rose-200" data-testid="orb-pilot-blockers">
              {readinessGate.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
          {readinessGate.warnings.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-sm text-amber-200">
              {readinessGate.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Feedback summary" title="Pilot feedback (manual)">
          {summary?.evidenceLabel === 'early-signal-only' ? (
            <div
              className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
              data-testid="orb-pilot-early-signal-warning"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>{ORB_PILOT_EARLY_SIGNAL_MESSAGE}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="orb-pilot-feedback-summary">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Feedback count</p>
              <p className="mt-2 text-3xl font-black text-white">{summary?.feedbackCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Average time saved (min)</p>
              <p className="mt-2 text-2xl font-black text-cyan-200">
                {formatMetric(summary?.averageTimeSavedMinutes)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Record quality rating</p>
              <p className="mt-2 text-2xl font-black text-emerald-200">
                {formatMetric(summary?.averageRecordQualityRating, '/5')}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Child voice rating</p>
              <p className="mt-2 text-2xl font-black text-emerald-200">
                {formatMetric(summary?.averageChildVoiceRating, '/5')}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Therapeutic language</p>
              <p className="mt-2 text-2xl font-black text-emerald-200">
                {formatMetric(summary?.averageTherapeuticLanguageRating, '/5')}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Staff confidence</p>
              <p className="mt-2 text-2xl font-black text-emerald-200">
                {formatMetric(summary?.averageStaffConfidenceRating, '/5')}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Would use again</p>
              <p className="mt-2 text-2xl font-black text-cyan-200">
                {summary?.wouldUseAgainPercent !== undefined
                  ? `${summary.wouldUseAgainPercent}%`
                  : 'Unavailable'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Evidence label</p>
              <p className="mt-2 text-sm font-bold text-slate-300">{summary?.evidenceLabel ?? 'unavailable'}</p>
            </div>
          </div>

          {summary?.limitations?.length ? (
            <ul className="mt-4 list-inside list-disc text-xs text-slate-500">
              {summary.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          ) : null}
        </FounderSectionCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <FounderSectionCard eyebrow="Child-centred" title="What helped the child?">
            <p className="text-sm text-slate-400">Safe, redacted themes from manual feedback only.</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200" data-testid="orb-pilot-child-help-themes">
              {(summary?.childHelpThemes ?? []).length > 0 ? (
                summary?.childHelpThemes.map((theme) => <li key={theme}>• {theme}</li>)
              ) : (
                <li className="text-slate-500">No themes yet.</li>
              )}
            </ul>
          </FounderSectionCard>

          <FounderSectionCard eyebrow="Safety" title="Friction and safety concerns">
            <p className="text-sm text-slate-400">
              Safe summaries only. Count: {summary?.safetyConcernCount ?? 0}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200" data-testid="orb-pilot-friction-themes">
              {(summary?.frictionThemes ?? []).length > 0 ? (
                summary?.frictionThemes.map((theme) => <li key={theme}>• {theme}</li>)
              ) : (
                <li className="text-slate-500">No friction themes reported yet.</li>
              )}
            </ul>
          </FounderSectionCard>
        </div>

        <FounderSectionCard eyebrow="Outcome framework" title="Evidence status by outcome">
          <div className="space-y-4" data-testid="orb-pilot-outcome-framework">
            {ORB_PILOT_OUTCOMES.map((outcome) => {
              const status = outcomeEvidenceStatus(outcome.id, summary)
              return (
                <div key={outcome.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-white">{outcome.title}</h3>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                      {status.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{outcome.summary}</p>
                  <ul className="mt-2 list-inside list-disc text-xs text-slate-500">
                    {outcome.questions.map((question) => (
                      <li key={question.id}>
                        {question.text} — {question.dataSource}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Next actions" title="Suggested pilot actions">
          <ul className="space-y-2 text-sm text-slate-300" data-testid="orb-pilot-next-actions">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" aria-hidden />
              <Link href="/founder/quality-lab" className="hover:text-cyan-200">
                Run live GOLD Quality Lab verification
              </Link>
            </li>
            <li className="flex items-start gap-2">
              <ClipboardCheck className="mt-0.5 h-4 w-4 text-cyan-300" aria-hidden />
              <Link href="/orb/privacy" className="hover:text-cyan-200">
                Review closed-pilot privacy notice with pilot homes
              </Link>
            </li>
            <li className="flex items-start gap-2">
              <ClipboardCheck className="mt-0.5 h-4 w-4 text-cyan-300" aria-hidden />
              <span>Invite supervised pilot users in 5–10 homes</span>
            </li>
            <li className="flex items-start gap-2">
              <ClipboardCheck className="mt-0.5 h-4 w-4 text-cyan-300" aria-hidden />
              <span>Review feedback weekly — child voice and safety concerns first</span>
            </li>
            <li className="flex items-start gap-2">
              <ClipboardCheck className="mt-0.5 h-4 w-4 text-cyan-300" aria-hidden />
              <Link href="/founder/actions" className="hover:text-cyan-200">
                Create improvement action from friction themes
              </Link>
            </li>
          </ul>
        </FounderSectionCard>
      </div>
    </div>
  )
}
