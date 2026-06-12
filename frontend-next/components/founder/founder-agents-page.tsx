'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bot, CheckCircle2, Play, RefreshCw, Shield, XCircle } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  approveFounderAgentAction,
  fetchAutonomySettings,
  fetchFounderAgentAudit,
  fetchFounderAgents,
  fetchFounderAgentsBrief,
  markReviewedFounderAgentAction,
  postFounderAgentAction,
  postFounderAutonomousLoop,
  rejectFounderAgentAction,
  updateAutonomySettingsClient,
  type FounderAgentsOverview
} from '@/lib/founder/agents/autonomous/founder-agents-client'
import { GOVERNANCE_COPY } from '@/lib/founder/agents/autonomous/founder-agent-safety'
import type { FounderAgentEvent, FounderAgentRecommendation } from '@/lib/founder/agents/autonomous/founder-agent-event-types'
import type {
  FounderAgentApprovalItem,
  FounderAgentAuditEntry,
  FounderAgentLiveState,
  FounderAutonomySettings,
  FounderChiefOfStaffBrief
} from '@/lib/founder/agents/autonomous/founder-agent-types'

const RISK_TONE: Record<string, string> = {
  low: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  medium: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  high: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  critical: 'text-rose-200 border-rose-500/40 bg-rose-600/15'
}

const STATUS_TONE: Record<string, string> = {
  active: 'text-emerald-300',
  monitoring: 'text-cyan-300',
  idle: 'text-slate-400',
  'awaiting-approval': 'text-amber-300',
  blocked: 'text-rose-300'
}

function ApprovalBadge({ required }: { required: boolean }) {
  if (!required) return null
  return (
    <span
      className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200"
      data-testid="approval-required-badge"
    >
      Approval required
    </span>
  )
}

function AgentCard({ agent }: { agent: FounderAgentLiveState }) {
  return (
    <article
      className="founder-surface rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
      data-testid={`founder-agent-card-${agent.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-white">{agent.name}</h3>
          <p className="text-sm text-slate-400">{agent.roleTitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-bold uppercase tracking-[0.12em] ${STATUS_TONE[agent.status] ?? 'text-slate-400'}`}>
            {agent.status.replace(/-/g, ' ')}
          </span>
          <ApprovalBadge required={agent.requiresFounderApproval} />
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="text-slate-300">{agent.currentFocus}</p>
        <p className="text-cyan-200">{agent.recommendedNextAction}</p>
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${RISK_TONE[agent.riskLevel]}`}>
          {agent.riskLevel} risk
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/founder/orb-quality-agent`}
          className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-200"
        >
          View details
        </Link>
      </div>
    </article>
  )
}

function ApprovalQueueItem({
  item,
  onApprove,
  onReject,
  onRequestChanges,
  onMarkReviewed
}: {
  item: FounderAgentApprovalItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onRequestChanges: (id: string) => void
  onMarkReviewed: (id: string) => void
}) {
  if (item.status !== 'pending' && item.status !== 'changes_requested') return null

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
      data-testid="founder-agent-approval-item"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-sm text-slate-400">{item.summary}</p>
          {item.safetyNotes ? (
            <p className="mt-2 text-xs text-amber-200/80" data-testid="founder-agent-safety-notes">
              {item.safetyNotes}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">
            {item.agentId} · {item.actionType.replace(/_/g, ' ')} · {item.riskLevel} risk
            {item.eventId ? ` · event ${item.eventId}` : ''}
          </p>
        </div>
        <ApprovalBadge required />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onApprove(item.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200"
          data-testid="founder-agent-approve-btn"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Approve
        </button>
        <button
          type="button"
          onClick={() => onReject(item.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200"
        >
          <XCircle className="h-3.5 w-3.5" aria-hidden />
          Reject
        </button>
        <button
          type="button"
          onClick={() => onRequestChanges(item.id)}
          className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-200"
        >
          Request changes
        </button>
        <button
          type="button"
          onClick={() => onMarkReviewed(item.id)}
          className="rounded-lg border border-slate-400/30 bg-slate-500/10 px-3 py-1.5 text-xs font-bold text-slate-200"
          data-testid="founder-agent-mark-reviewed-btn"
        >
          Mark reviewed
        </button>
      </div>
    </div>
  )
}

function LiveEventRow({ event }: { event: FounderAgentEvent }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm" data-testid="founder-agent-live-event">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-white">{event.title}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${RISK_TONE[event.severity] ?? RISK_TONE.low}`}>
          {event.severity}
        </span>
      </div>
      <p className="mt-1 text-slate-400">{event.summary}</p>
      <p className="mt-1 text-xs text-slate-500">
        {event.source} · {event.type.replace(/_/g, ' ')} ·{' '}
        {event.processed ? 'processed' : 'pending'} · agents: {event.affectedAgents.join(', ')}
      </p>
    </div>
  )
}

function RecommendationRow({ rec }: { rec: FounderAgentRecommendation }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm" data-testid="founder-agent-recommendation">
      <p className="font-semibold text-white">{rec.agentId}</p>
      <p className="text-slate-300">{rec.recommendation}</p>
      <p className="mt-1 text-xs text-slate-500">
        {rec.riskLevel} risk · {rec.proposedAction.replace(/_/g, ' ')} ·{' '}
        {rec.approvalRequired ? 'approval required' : 'observe only'}
      </p>
    </div>
  )
}

export function FounderAgentsPage() {
  const [overview, setOverview] = useState<FounderAgentsOverview | null>(null)
  const [brief, setBrief] = useState<FounderChiefOfStaffBrief | null>(null)
  const [audit, setAudit] = useState<FounderAgentAuditEntry[]>([])
  const [settings, setSettings] = useState<FounderAutonomySettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [agentsData, briefData, auditData, settingsData] = await Promise.all([
      fetchFounderAgents(),
      fetchFounderAgentsBrief(),
      fetchFounderAgentAudit(),
      fetchAutonomySettings()
    ])
    setOverview(agentsData)
    setBrief(briefData)
    setAudit(auditData)
    setSettings(settingsData)
  }, [])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  async function handleRefresh() {
    setLoading(true)
    try {
      await load()
    } finally {
      setLoading(false)
    }
  }

  async function handleRunLoop() {
    setLoading(true)
    setMessage(null)
    try {
      const result = await postFounderAutonomousLoop('manual_founder_trigger')
      setMessage(result.recommendations.join(' '))
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Loop failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    await approveFounderAgentAction(id)
    await load()
  }

  async function handleReject(id: string) {
    await rejectFounderAgentAction(id)
    await load()
  }

  async function handleRequestChanges(id: string) {
    await rejectFounderAgentAction(id, true)
    await load()
  }

  async function handleMarkReviewed(id: string) {
    await markReviewedFounderAgentAction(id)
    await load()
  }

  async function handleToggleSetting(key: keyof FounderAutonomySettings, value: boolean) {
    const updated = await updateAutonomySettingsClient({ [key]: value })
    setSettings(updated)
  }

  async function handleGenerateBrief() {
    setLoading(true)
    try {
      await postFounderAgentAction({
        agentId: 'orb-quality-agent',
        actionType: 'generate_build_brief'
      })
      await load()
      setMessage('Build brief prepared — awaiting approval.')
    } finally {
      setLoading(false)
    }
  }

  const pendingApprovals = overview?.approvalQueue.filter(
    (a) => a.status === 'pending' || a.status === 'changes_requested'
  ) ?? []

  return (
    <div className="founder-dashboard min-h-screen" data-testid="founder-agents-page">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Agent Operating System"
          subtitle="Approval-gated autonomous agents for IndiCare Intelligence and ORB Residential — powered by IndiCare Intelligence."
        />

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-5 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden />
            <div className="space-y-2">
              <p>{GOVERNANCE_COPY.agentDisclaimer}</p>
              <p>{GOVERNANCE_COPY.approvalGates}</p>
              <p>{GOVERNANCE_COPY.failedRunsVisible}</p>
              <p>{GOVERNANCE_COPY.noRealChildData}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleRunLoop}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-200"
            data-testid="founder-agent-run-loop-btn"
          >
            <Play className="h-4 w-4" aria-hidden />
            Run autonomous loop
          </button>
          <Link
            href="/founder/quality-lab"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200"
          >
            Quality Lab
          </Link>
          <Link
            href="/founder/team"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200"
          >
            Founder Team
          </Link>
        </div>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

        <FounderSectionCard eyebrow="Live events" title="Agent event feed">
          {(overview?.liveEvents ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No live events yet. Events appear when evaluation runs complete, deploys occur, or governance blockers are detected.</p>
          ) : (
            <div className="space-y-2" data-testid="founder-agent-live-events-feed">
              {(overview?.liveEvents ?? []).slice(0, 15).map((event) => (
                <LiveEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Recommendations" title="Agent recommendations">
          {(overview?.recommendations ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No recommendations from live events yet.</p>
          ) : (
            <div className="space-y-4" data-testid="founder-agent-recommendations">
              {Object.entries(overview?.recommendationsByAgent ?? {}).map(([agentId, recs]) => (
                <div key={agentId}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{agentId}</p>
                  <div className="mt-2 space-y-2">
                    {recs.slice(0, 5).map((rec) => (
                      <RecommendationRow key={rec.id} rec={rec} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Chief of Staff" title="Today's Founder Brief">
          {brief ? (
            <div className="space-y-4 text-sm" data-testid="founder-chief-of-staff-brief">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Top priorities</p>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-200">
                  {brief.topPriorities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
              {brief.testsRecommended && brief.testsRecommended.length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Tests recommended</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-cyan-200">
                    {brief.testsRecommended.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {brief.blockersFromEvents && brief.blockersFromEvents.length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Blockers from events</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-200">
                    {brief.blockersFromEvents.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {brief.whatNeedsApproval.length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Needs approval</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-200">
                    {brief.whatNeedsApproval.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {brief.launchGateBlockers.length > 0 ? (
                <div className="flex items-start gap-2 text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>{brief.launchGateBlockers.join('; ')}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Loading brief…</p>
          )}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Approval queue" title="Waiting for Tom">
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-slate-400">No pending agent approvals.</p>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((item) => (
                <ApprovalQueueItem
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRequestChanges={handleRequestChanges}
                  onMarkReviewed={handleMarkReviewed}
                />
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateBrief}
              disabled={loading}
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200"
            >
              Generate brief
            </button>
            <Link
              href="/founder/orb-quality-agent"
              className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200"
            >
              Create draft PR
            </Link>
            <Link
              href="/founder/quality-lab"
              className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"
            >
              Run test
            </Link>
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Agent team" title="Role-based agents">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(overview?.agents ?? []).map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Audit trail" title="Agent actions">
          {audit.length === 0 ? (
            <p className="text-sm text-slate-400">No audit entries yet.</p>
          ) : (
            <div className="space-y-2 text-sm" data-testid="founder-agent-audit-trail">
              {audit.slice(0, 20).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <p className="text-slate-300">
                    <span className="font-semibold text-white">{entry.agentId}</span> · {entry.actionType}
                  </p>
                  <p className="text-slate-400">{entry.summary}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.timestamp).toLocaleString()} · {entry.approvalStatus}
                  </p>
                </div>
              ))}
            </div>
          )}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Autonomy" title="Autonomy status">
          {overview?.autonomyStatus ? (
            <div className="mb-4 space-y-2 text-sm" data-testid="founder-autonomy-status">
              <p className="text-slate-300">
                Last loop:{' '}
                {overview.autonomyStatus.lastAutonomousLoopRun
                  ? new Date(overview.autonomyStatus.lastAutonomousLoopRun).toLocaleString()
                  : 'never'}
                {overview.autonomyStatus.lastAutonomousLoopTrigger
                  ? ` (${overview.autonomyStatus.lastAutonomousLoopTrigger.replace(/_/g, ' ')})`
                  : ''}
              </p>
              <p className="text-cyan-200">Next: {overview.autonomyStatus.nextSuggestedAction}</p>
              <ul className="list-disc pl-5 text-xs text-emerald-200/80">
                {overview.autonomyStatus.safetyGatesActive.map((gate) => (
                  <li key={gate}>{gate}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {settings ? (
            <div className="space-y-4 text-sm" data-testid="founder-autonomy-settings">
              <p className="text-slate-400">
                Agents can prepare work and run safe synthetic checks. Tom remains the approval gate for merge, launch,
                publishing and external action.
              </p>
              {(
                [
                  ['autoRunAfterDeploy', 'Auto-run after deploy'],
                  ['autoRunNightly', 'Auto-run nightly synthetic'],
                  ['autoCreateDraftPR', 'Auto-create draft PR'],
                  ['requireApprovalForPRCreation', 'Require approval for PR creation']
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
                  <span className="text-slate-200">{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings[key])}
                    onChange={(e) => handleToggleSetting(key, e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              ))}
              <p className="text-xs text-slate-500">
                Max scenario runs per day: {settings.maxScenarioRunsPerDay} · Allowed packs:{' '}
                {settings.allowedPacks.join(', ')}
              </p>
            </div>
          ) : null}
        </FounderSectionCard>

        {overview?.qualityLabIntegration ? (
          <FounderSectionCard eyebrow="Quality Lab" title="Agent integration">
            <div className="space-y-3 text-sm">
              <p className="text-slate-300">
                Coverage: {overview.qualityLabIntegration.coverageMap.overallStrength} · Weak areas:{' '}
                {overview.qualityLabIntegration.weakCategories.slice(0, 5).join(', ') || 'none'}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-cyan-200">
                {overview.qualityLabIntegration.agentRecommendations.map((rec) => (
                  <li key={rec}>{rec}</li>
                ))}
              </ul>
              <Link
                href="/founder/orb-quality-agent"
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-200"
              >
                <Bot className="h-3.5 w-3.5" aria-hidden />
                Open ORB Quality Agent
              </Link>
            </div>
          </FounderSectionCard>
        ) : null}
      </div>
    </div>
  )
}
