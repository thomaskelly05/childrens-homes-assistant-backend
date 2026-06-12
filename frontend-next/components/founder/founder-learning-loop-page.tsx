'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Beaker,
  CheckCircle2,
  ClipboardCopy,
  Play,
  RefreshCw,
  Shield,
  XCircle
} from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  approveProposalClient,
  approveScenarioClient,
  createBuildBriefClient,
  createProposalClient,
  detectWeaknessesClient,
  fetchLearningLoopAudit,
  fetchLearningLoopOverview,
  generateScenariosClient,
  rejectProposalClient,
  rejectScenarioClient,
  startLearningLoopClient,
  updateLearningLoopAutonomySettingsClient
} from '@/lib/founder/learning-loop/learning-loop-client'
import { LEARNING_LOOP_DISCLAIMER } from '@/lib/founder/learning-loop/learning-loop-types'
import type {
  BenchmarkScenario,
  LearningLoopAuditEntry,
  LearningLoopAutonomySettings,
  LearningLoopOverview,
  LearningLoopRecord,
  LearningProposal
} from '@/lib/founder/learning-loop/learning-loop-types'

const SEVERITY_TONE: Record<string, string> = {
  critical: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  high: 'text-orange-300 border-orange-400/30 bg-orange-500/10',
  medium: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  low: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
}

const STATUS_TONE: Record<string, string> = {
  pending: 'text-slate-400',
  analysing: 'text-cyan-300',
  generating_scenarios: 'text-cyan-300',
  testing: 'text-cyan-300',
  proposing_improvement: 'text-amber-300',
  awaiting_approval: 'text-amber-300',
  approved: 'text-emerald-300',
  rejected: 'text-rose-300',
  completed: 'text-emerald-300'
}

function ApprovalBadge() {
  return (
    <span
      className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200"
      data-testid="learning-loop-approval-badge"
    >
      Approval required
    </span>
  )
}

export function FounderLearningLoopPage() {
  const [overview, setOverview] = useState<LearningLoopOverview | null>(null)
  const [audit, setAudit] = useState<LearningLoopAuditEntry[]>([])
  const [autonomy, setAutonomy] = useState<LearningLoopAutonomySettings | null>(null)
  const [activeLoop, setActiveLoop] = useState<LearningLoopRecord | null>(null)
  const [buildBriefFormatted, setBuildBriefFormatted] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, auditEntries] = await Promise.all([
        fetchLearningLoopOverview(),
        fetchLearningLoopAudit()
      ])
      setOverview(ov)
      setAutonomy(ov.autonomySettings)
      setAudit(auditEntries)
      setActiveLoop(ov.activeLoops[0] ?? null)
    } catch {
      setMessage('Failed to load Learning Loop overview.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleStartLoop = async () => {
    setBusy('Starting learning loop…')
    setMessage(null)
    try {
      const loop = await startLearningLoopClient({ triggerType: 'manual_founder_trigger' })
      setActiveLoop(loop)
      setMessage('Learning loop started. Weakness detection running.')
      await load()
    } catch {
      setMessage('Could not start learning loop.')
    } finally {
      setBusy(null)
    }
  }

  const handleDetectWeaknesses = async () => {
    if (!activeLoop) return
    setBusy('Detecting weaknesses…')
    try {
      const loop = await detectWeaknessesClient(activeLoop.id)
      setActiveLoop(loop)
      setMessage('Weakness detection complete.')
      await load()
    } catch {
      setMessage('Weakness detection failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleGenerateScenarios = async () => {
    if (!activeLoop) return
    setBusy('Generating synthetic scenarios…')
    try {
      const loop = await generateScenariosClient(activeLoop.id, { count: 3 })
      setActiveLoop(loop)
      setMessage('Synthetic scenarios generated. Awaiting founder approval for benchmark bank.')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Scenario generation failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleApproveScenario = async (scenarioId: string) => {
    setBusy('Approving scenario…')
    try {
      await approveScenarioClient(scenarioId, 'approved_for_testing')
      setMessage('Scenario approved for testing.')
      await load()
    } catch {
      setMessage('Scenario approval failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleRejectScenario = async (scenarioId: string) => {
    setBusy('Rejecting scenario…')
    try {
      await rejectScenarioClient(scenarioId, 'Founder rejected')
      setMessage('Scenario rejected.')
      await load()
    } catch {
      setMessage('Scenario rejection failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleCreateProposal = async () => {
    if (!activeLoop) return
    setBusy('Creating learning proposal…')
    try {
      await createProposalClient(activeLoop.id)
      setMessage('Learning proposal created. Awaiting your approval.')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Proposal creation failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleApproveProposal = async (proposal: LearningProposal) => {
    setBusy('Approving proposal…')
    try {
      await approveProposalClient(proposal.id)
      setMessage('Proposal approved. You may now create a build brief.')
      await load()
    } catch {
      setMessage('Proposal approval failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleRejectProposal = async (proposal: LearningProposal) => {
    setBusy('Rejecting proposal…')
    try {
      await rejectProposalClient(proposal.id)
      setMessage('Proposal rejected.')
      await load()
    } catch {
      setMessage('Proposal rejection failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleCreateBuildBrief = async (proposalId: string) => {
    setBusy('Creating build brief…')
    try {
      const result = await createBuildBriefClient(proposalId)
      setBuildBriefFormatted(result.formatted)
      setMessage('Build brief created. Review safety constraints before pasting into Cursor.')
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Build brief creation failed.')
    } finally {
      setBusy(null)
    }
  }

  const handleCopyBrief = async () => {
    if (!buildBriefFormatted) return
    await navigator.clipboard.writeText(buildBriefFormatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAutonomyToggle = async (key: keyof LearningLoopAutonomySettings, value: boolean) => {
    if (!autonomy) return
    try {
      const updated = await updateLearningLoopAutonomySettingsClient({ [key]: value })
      setAutonomy(updated)
      setMessage('Autonomy settings updated.')
    } catch {
      setMessage('Could not update autonomy settings.')
    }
  }

  const awaitingScenarios =
    overview?.benchmarkBank.filter((s) => ['generated', 'under_review'].includes(s.status)) ?? []

  return (
    <div className="founder-dashboard-bg min-h-screen px-4 py-8 md:px-8" data-testid="founder-learning-loop-page">
      <div className="mx-auto max-w-7xl space-y-8">
        <FounderNavHeader
          title="IndiCare Learning Loop"
          subtitle="Approval-gated internal brain improvement from synthetic evaluation evidence"
        />

        <div
          className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/5 p-5 text-sm text-cyan-100"
          data-testid="learning-loop-disclaimer"
        >
          <Shield className="mb-2 inline h-4 w-4 text-cyan-300" aria-hidden />
          {' '}
          {LEARNING_LOOP_DISCLAIMER}
        </div>

        {message ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            {message}
          </p>
        ) : null}

        {busy ? (
          <p className="text-sm text-cyan-300" data-testid="learning-loop-busy">
            {busy}
          </p>
        ) : null}

        <FounderSectionCard eyebrow="Dashboard" title="Learning Loop Dashboard">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleStartLoop()}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200"
              data-testid="learning-loop-start-btn"
            >
              <Play className="h-4 w-4" aria-hidden />
              Start learning loop
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200"
              data-testid="learning-loop-refresh-btn"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading…</p>
          ) : overview ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="founder-surface rounded-xl border border-white/10 p-4" data-testid="learning-loop-active-count">
                <p className="text-xs uppercase tracking-wider text-slate-500">Active loops</p>
                <p className="mt-1 text-2xl font-bold text-white">{overview.activeLoops.length}</p>
              </div>
              <div className="founder-surface rounded-xl border border-white/10 p-4" data-testid="learning-loop-pending-proposals">
                <p className="text-xs uppercase tracking-wider text-slate-500">Pending proposals</p>
                <p className="mt-1 text-2xl font-bold text-white">{overview.pendingProposals.length}</p>
              </div>
              <div className="founder-surface rounded-xl border border-white/10 p-4" data-testid="learning-loop-approval-required">
                <p className="text-xs uppercase tracking-wider text-slate-500">Approval required</p>
                <p className="mt-1 text-2xl font-bold text-amber-200">{overview.approvalRequired}</p>
              </div>
              <div className="founder-surface rounded-xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Latest weakness</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {overview.latestWeakness?.category ?? 'None detected'}
                </p>
              </div>
            </div>
          ) : null}

          {activeLoop ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid="learning-loop-active-loop">
              <p className="font-semibold text-white">Active loop: {activeLoop.id}</p>
              <p className={`mt-1 text-xs uppercase ${STATUS_TONE[activeLoop.status] ?? 'text-slate-400'}`}>
                {activeLoop.status.replace(/_/g, ' ')}
              </p>
              {activeLoop.approvalRequired ? <div className="mt-2"><ApprovalBadge /></div> : null}
            </div>
          ) : null}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Weakness Map" title="Detected Weaknesses">
          <div className="space-y-3" data-testid="learning-loop-weakness-map">
            {(overview?.weaknessMap ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No weaknesses detected yet. Start a learning loop to analyse synthetic evidence.</p>
            ) : (
              overview?.weaknessMap.map((weakness) => (
                <div key={weakness.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{weakness.category}</p>
                      <p className="text-sm text-slate-400">{weakness.area.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_TONE[weakness.severity]}`}>
                      {weakness.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{weakness.recommendedAction}</p>
                  {weakness.affectedScenarios.length > 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Scenarios: {weakness.affectedScenarios.join(', ')}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
          {activeLoop ? (
            <button
              type="button"
              onClick={() => void handleDetectWeaknesses()}
              disabled={Boolean(busy)}
              className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200"
              data-testid="learning-loop-detect-weaknesses-btn"
            >
              Detect weaknesses
            </button>
          ) : null}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Scenario Generator" title="Synthetic Scenario Generator">
          <p className="mb-4 text-sm text-slate-400">
            Generate fictional scenarios for weak areas. Synthetic data only — no real child records.
          </p>
          <button
            type="button"
            onClick={() => void handleGenerateScenarios()}
            disabled={Boolean(busy) || !activeLoop}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200"
            data-testid="learning-loop-generate-scenarios-btn"
          >
            <Beaker className="h-4 w-4" aria-hidden />
            Generate scenarios for weak area
          </button>

          <div className="mt-4 space-y-3" data-testid="learning-loop-scenario-list">
            {awaitingScenarios.map((scenario: BenchmarkScenario) => (
              <div key={scenario.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="font-semibold text-white">{scenario.area}</p>
                <p className="mt-1 text-sm text-slate-300">{scenario.prompt}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Expected markers: {scenario.expectedMarkers.slice(0, 4).join(', ')}
                </p>
                <p className="mt-1 text-xs text-emerald-400">syntheticDataOnly: true</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleApproveScenario(scenario.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200"
                    data-testid="learning-loop-approve-scenario-btn"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Approve for testing
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRejectScenario(scenario.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200"
                    data-testid="learning-loop-reject-scenario-btn"
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Proposals" title="Learning Proposals">
          <div className="space-y-3" data-testid="learning-loop-proposals">
            {(overview?.pendingProposals ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No pending proposals.</p>
            ) : (
              overview?.pendingProposals.map((proposal) => (
                <div key={proposal.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-white">{proposal.changeType.replace(/_/g, ' ')}</p>
                    <ApprovalBadge />
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{proposal.whatBrainShouldLearn}</p>
                  <p className="mt-2 text-xs text-amber-200">Risk: {proposal.safetyRisk}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Files: {proposal.filesLikelyToChange.join(', ')}
                  </p>
                  {proposal.safeguardingReviewRequired ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-rose-200">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      Safeguarding review required
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleApproveProposal(proposal)}
                      className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200"
                      data-testid="learning-loop-approve-proposal-btn"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRejectProposal(proposal)}
                      className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-200"
                      data-testid="learning-loop-reject-proposal-btn"
                    >
                      Reject
                    </button>
                    {proposal.status === 'approved' ? (
                      <button
                        type="button"
                        onClick={() => void handleCreateBuildBrief(proposal.id)}
                        className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-200"
                        data-testid="learning-loop-create-build-brief-btn"
                      >
                        Create build brief
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          {activeLoop ? (
            <button
              type="button"
              onClick={() => void handleCreateProposal()}
              disabled={Boolean(busy)}
              className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200"
              data-testid="learning-loop-create-proposal-btn"
            >
              Create learning proposal
            </button>
          ) : null}

          {buildBriefFormatted ? (
            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4" data-testid="learning-loop-build-brief">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-cyan-200">PR-ready build brief</p>
                <button
                  type="button"
                  onClick={() => void handleCopyBrief()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-cyan-200"
                  data-testid="learning-loop-copy-brief-btn"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
                {buildBriefFormatted.slice(0, 1200)}
                {buildBriefFormatted.length > 1200 ? '…' : ''}
              </pre>
            </div>
          ) : null}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Benchmark Bank" title="Benchmark Scenario Bank">
          <div className="space-y-3" data-testid="learning-loop-benchmark-bank">
            {(overview?.benchmarkBank ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No benchmark scenarios yet.</p>
            ) : (
              overview?.benchmarkBank.slice(0, 8).map((scenario) => (
                <div key={scenario.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{scenario.area}</p>
                    <span className="text-xs uppercase text-slate-400">{scenario.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Why: {scenario.whyGenerated}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Pass/fail history: {scenario.passHistory.length} run(s)
                  </p>
                </div>
              ))
            )}
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Autonomy" title="Learning Loop Autonomy Settings">
          {autonomy ? (
            <div className="space-y-3" data-testid="learning-loop-autonomy-settings">
              {(
                [
                  ['autoDetectWeaknesses', 'Auto-detect weaknesses'],
                  ['autoGenerateSyntheticScenarios', 'Auto-generate synthetic scenarios'],
                  ['autoRunExperimentalScenarios', 'Auto-run experimental scenarios'],
                  ['autoCreateLearningProposals', 'Auto-create learning proposals'],
                  ['autoCreateBuildBriefs', 'Auto-create build briefs'],
                  ['requireFounderApprovalForBenchmarkAddition', 'Require approval for benchmark addition'],
                  ['requireFounderApprovalForBrainChanges', 'Require approval for brain changes']
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
                  <span className="text-sm text-slate-300">{label}</span>
                  <input
                    type="checkbox"
                    checked={autonomy[key]}
                    onChange={(e) => void handleAutonomyToggle(key, e.target.checked)}
                    className="h-4 w-4"
                    data-testid={`learning-loop-autonomy-${key}`}
                  />
                </label>
              ))}
              <p className="text-xs text-slate-500">
                Max generated scenarios/day: {autonomy.maxGeneratedScenariosPerDay} · Max experimental runs/day:{' '}
                {autonomy.maxExperimentalRunsPerDay}
              </p>
              <p className="text-xs text-amber-200">No auto-merge pathway exists.</p>
            </div>
          ) : null}
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Audit" title="Learning Loop Audit Trail">
          <div className="space-y-2" data-testid="learning-loop-audit-trail">
            {audit.length === 0 ? (
              <p className="text-sm text-slate-400">No audit entries yet.</p>
            ) : (
              audit.slice(0, 15).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  <p className="text-xs uppercase text-cyan-300">{entry.action.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-slate-300">{entry.summary}</p>
                  <p className="text-xs text-slate-500">{entry.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </FounderSectionCard>
      </div>
    </div>
  )
}
