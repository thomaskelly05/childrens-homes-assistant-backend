'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { BrainGapPanel } from '@/components/indicare-lab/brain-gap-panel'
import { BuildBriefGeneratorPanel } from '@/components/indicare-lab/build-brief-generator-panel'
import { EvaluationBenchmarksPanel } from '@/components/indicare-lab/evaluation-benchmarks-panel'
import { EvidenceOfImprovementPanel } from '@/components/indicare-lab/evidence-of-improvement-panel'
import { EvidenceTimelinePanel } from '@/components/indicare-lab/evidence-timeline-panel'
import { ExperimentsPanel } from '@/components/indicare-lab/experiments-panel'
import { FounderApprovalQueue } from '@/components/indicare-lab/founder-approval-queue'
import { GovernanceLogPanel } from '@/components/indicare-lab/governance-log-panel'
import { IndiCareLabShell } from '@/components/indicare-lab/indicare-lab-shell'
import { InternalReviewTestPanel } from '@/components/indicare-lab/internal-review-test-panel'
import { KnowledgeGapPanel } from '@/components/indicare-lab/knowledge-gap-panel'
import { LabOverviewCards } from '@/components/indicare-lab/lab-overview-cards'
import { LabRoadmapPanel } from '@/components/indicare-lab/lab-roadmap-panel'
import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { PatternIntelligencePanel } from '@/components/indicare-lab/pattern-intelligence-panel'
import { RealSuggestionsPanel } from '@/components/indicare-lab/real-suggestions-panel'
import { ReviewBoardPanel } from '@/components/indicare-lab/review-board-panel'
import { ReviewEventsPanel } from '@/components/indicare-lab/review-events-panel'
import { ShadowReviewStatusCard } from '@/components/indicare-lab/shadow-review-status-card'
import { TechnologyWatchPanel } from '@/components/indicare-lab/technology-watch-panel'
import { UiUxGapPanel } from '@/components/indicare-lab/ui-ux-gap-panel'
import { generateBuildBrief } from '@/lib/indicare-lab/build-brief'
import {
  ALL_GAPS,
  APPROVAL_QUEUE,
  BRAIN_GAPS,
  EXPERIMENTS,
  KNOWLEDGE_GAPS,
  REVIEW_BOARD_AGENTS,
  ROADMAP_ITEMS,
  TECHNOLOGY_WATCH,
  UI_UX_GAPS
} from '@/lib/indicare-lab/demo-data'
import { listEvaluationRuns, summariseEvaluationRuns } from '@/lib/indicare-lab/evaluations/evaluation-storage'
import {
  evidenceLinkForApprovalItem,
  evidenceLinkForBuildBrief,
  evidenceLinkForPattern,
  evidenceLinkForReviewEvent,
  evidenceLinkForSuggestion,
  logFounderAction
} from '@/lib/indicare-lab/governance/founder-action-service'
import {
  buildEvidenceOfImprovementCounts,
  buildLabOverviewMetrics
} from '@/lib/indicare-lab/lab-overview-metrics'
import {
  getDefaultPatternDetectionFilters,
  getLabDataMode,
  getLabDataModeConfig
} from '@/lib/indicare-lab/lab-data-mode'
import {
  generateBuildBriefFromPattern,
  patternToApprovalItem
} from '@/lib/indicare-lab/patterns/pattern-actions'
import { detectPatternsFromReviewEvents } from '@/lib/indicare-lab/patterns/pattern-detection-engine'
import type { LabPattern, LabPatternStatus } from '@/lib/indicare-lab/patterns/types'
import {
  generateBuildBriefFromReviewEvent,
  reviewEventToApprovalItem
} from '@/lib/indicare-lab/review-events/review-event-actions'
import {
  listReviewEvents,
  markReviewEventReviewed,
  summariseReviewEvents
} from '@/lib/indicare-lab/review-events/review-event-storage'
import type { ReviewEvent } from '@/lib/indicare-lab/review-events/types'
import {
  createBuildBrief,
  createSuggestion,
  getEvidenceTimeline,
  getLabStorageStats,
  listFounderActionLogs,
  recordPatternDetection
} from '@/lib/indicare-lab/storage/lab-storage'
import { generateEvidenceSuggestions } from '@/lib/indicare-lab/suggestions/evidence-suggestion-engine'
import {
  generateBuildBriefFromSuggestion,
  suggestionToApprovalItem
} from '@/lib/indicare-lab/suggestions/suggestion-actions'
import type { LabSuggestion, SuggestionStatus } from '@/lib/indicare-lab/suggestions/types'
import type { ApprovalQueueItem, ApprovalStatus, BuildBrief, LabGap } from '@/lib/indicare-lab/types'

export function IndiCareLabPage() {
  const [selectedGapIds, setSelectedGapIds] = useState<Set<string>>(new Set())
  const [briefs, setBriefs] = useState<BuildBrief[]>([])
  const [reviewEvents, setReviewEvents] = useState<ReviewEvent[]>(() => listReviewEvents())
  const [approvalItems, setApprovalItems] = useState<ApprovalQueueItem[]>(APPROVAL_QUEUE)
  const [patternStatuses, setPatternStatuses] = useState<Record<string, LabPatternStatus>>({})
  const [suggestionStatuses, setSuggestionStatuses] = useState<Record<string, SuggestionStatus>>({})
  const [evaluationRunVersion, setEvaluationRunVersion] = useState(0)
  const [investorSafeView, setInvestorSafeView] = useState(false)
  const [governanceVersion, setGovernanceVersion] = useState(0)

  const dataMode = getLabDataMode()
  const dataConfig = useMemo(
    () => getLabDataModeConfig({ investorSafeOverride: investorSafeView }),
    [investorSafeView]
  )

  const refreshGovernance = useCallback(() => {
    setGovernanceVersion((v) => v + 1)
  }, [])

  const reviewSummary = useMemo(() => summariseReviewEvents(), [reviewEvents])

  const evaluationSummary = useMemo(
    () => summariseEvaluationRuns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when benchmarks run
    [evaluationRunVersion]
  )

  const evaluationRuns = useMemo(
    () => listEvaluationRuns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when benchmarks run
    [evaluationRunVersion]
  )

  const patternFilters = useMemo(
    () =>
      getDefaultPatternDetectionFilters({
        showDemoData: dataConfig.showDemoData,
        investorSafeView: dataConfig.investorSafeView,
        mode: dataConfig.mode,
        showSyntheticBenchmarks: dataConfig.showSyntheticBenchmarks
      }),
    [dataConfig]
  )

  const patternDetection = useMemo(
    () => detectPatternsFromReviewEvents(reviewEvents, patternFilters),
    [reviewEvents, patternFilters]
  )

  const patterns = useMemo(
    () =>
      patternDetection.patterns.map((pattern) => ({
        ...pattern,
        founderDecisionStatus: patternStatuses[pattern.id] ?? pattern.founderDecisionStatus
      })),
    [patternDetection.patterns, patternStatuses]
  )

  const suggestionResult = useMemo(
    () =>
      generateEvidenceSuggestions({
        reviewEvents,
        patterns,
        evaluationRuns,
        approvalItems,
        requireRealEvidence: dataConfig.requireRealEvidenceForSuggestions
      }),
    [reviewEvents, patterns, evaluationRuns, approvalItems, dataConfig.requireRealEvidenceForSuggestions]
  )

  const suggestions = useMemo(
    () =>
      suggestionResult.suggestions.map((suggestion) => ({
        ...suggestion,
        status: suggestionStatuses[suggestion.id] ?? suggestion.status
      })),
    [suggestionResult.suggestions, suggestionStatuses]
  )

  useEffect(() => {
    for (const suggestion of suggestions) {
      createSuggestion(suggestion)
    }
  }, [suggestions])

  useEffect(() => {
    for (const pattern of patterns) {
      recordPatternDetection(pattern.id, pattern.title, pattern.detectedAt)
    }
  }, [patterns])

  const realSuggestions = useMemo(
    () => suggestions.filter((s) => !s.isSyntheticEvidence),
    [suggestions]
  )

  const storageStats = useMemo(
    () => getLabStorageStats(),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when governance changes
    [governanceVersion, reviewEvents, evaluationRunVersion]
  )

  const founderActions = useMemo(
    () => listFounderActionLogs(),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when governance changes
    [governanceVersion]
  )

  const evidenceTimeline = useMemo(
    () =>
      getEvidenceTimeline({
        includeDemo: dataConfig.showDemoData && !dataConfig.investorSafeView,
        includeSynthetic: !dataConfig.investorSafeView
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when governance changes
    [governanceVersion, dataConfig.showDemoData, dataConfig.investorSafeView]
  )

  const buildBriefsFromEvidence = useMemo(
    () =>
      briefs.filter(
        (brief) =>
          brief.id.startsWith('brief-rev-') ||
          brief.id.startsWith('brief-pattern-') ||
          brief.id.startsWith('brief-eval-') ||
          brief.id.startsWith('brief-sug-')
      ).length,
    [briefs]
  )

  const founderDecisions = useMemo(
    () =>
      approvalItems.filter((item) => item.status === 'approved' || item.status === 'rejected').length +
      reviewEvents.filter((event) => event.founderReviewed).length +
      founderActions.length,
    [approvalItems, reviewEvents, founderActions]
  )

  const evidenceCounts = useMemo(
    () =>
      buildEvidenceOfImprovementCounts({
        reviewEvents,
        patterns,
        evaluationSummary,
        suggestions,
        buildBriefsFromEvidence,
        founderDecisions,
        storageStats
      }),
    [
      reviewEvents,
      patterns,
      evaluationSummary,
      suggestions,
      buildBriefsFromEvidence,
      founderDecisions,
      storageStats
    ]
  )

  const overviewMetrics = useMemo(
    () =>
      buildLabOverviewMetrics({
        reviewSummary,
        reviewEvents,
        patterns,
        pendingApprovals: approvalItems.filter((item) => item.status === 'pending').length,
        evaluationSummary,
        suggestions,
        investorSafeView: dataConfig.investorSafeView
      }),
    [reviewSummary, reviewEvents, patterns, approvalItems, evaluationSummary, suggestions, dataConfig.investorSafeView]
  )

  const selectedGaps = useMemo(
    () => ALL_GAPS.filter((g) => selectedGapIds.has(g.id)),
    [selectedGapIds]
  )

  const refreshReviewEvents = useCallback(() => {
    setReviewEvents(listReviewEvents())
    refreshGovernance()
  }, [refreshGovernance])

  const toggleSelect = useCallback((gapId: string) => {
    setSelectedGapIds((prev) => {
      const next = new Set(prev)
      if (next.has(gapId)) next.delete(gapId)
      else next.add(gapId)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedGapIds(new Set()), [])

  const persistBuildBrief = useCallback(
    (brief: BuildBrief, sourceType?: string, sourceId?: string) => {
      createBuildBrief({ ...brief, sourceType, sourceId })
      setBriefs((prev) => [brief, ...prev])
      refreshGovernance()
      document.getElementById('build-briefs')?.scrollIntoView({ behavior: 'smooth' })
    },
    [refreshGovernance]
  )

  const handleCreateBriefFromGap = useCallback(
    (gap: LabGap) => {
      const brief = generateBuildBrief([gap])
      logFounderAction({
        actionType: 'create-build-brief',
        targetType: 'gap',
        targetId: gap.id,
        riskLevel: gap.riskLevel,
        evidenceLinks: [evidenceLinkForBuildBrief(brief.id, brief.title)]
      })
      persistBuildBrief(brief, 'gap', gap.id)
    },
    [persistBuildBrief]
  )

  const handleReviewEventCreated = useCallback(
    (_event: ReviewEvent) => {
      refreshReviewEvents()
      document.getElementById('review-events')?.scrollIntoView({ behavior: 'smooth' })
    },
    [refreshReviewEvents]
  )

  const handleCreateBuildBriefFromEvent = useCallback(
    (event: ReviewEvent) => {
      const brief = generateBuildBriefFromReviewEvent(event)
      logFounderAction({
        actionType: 'create-build-brief',
        targetType: 'review-event',
        targetId: event.id,
        riskLevel: event.riskLevel,
        evidenceLinks: [evidenceLinkForReviewEvent(event.id, event.reasonSummary)]
      })
      persistBuildBrief(brief, 'review-event', event.id)
    },
    [persistBuildBrief]
  )

  const handleAddEventToApprovalQueue = useCallback(
    (event: ReviewEvent) => {
      const item = reviewEventToApprovalItem(event)
      setApprovalItems((prev) => {
        if (prev.some((existing) => existing.id === item.id)) return prev
        return [item, ...prev]
      })
      logFounderAction({
        actionType: 'add-to-approval-queue',
        targetType: 'review-event',
        targetId: event.id,
        riskLevel: event.riskLevel,
        evidenceLinks: [
          evidenceLinkForReviewEvent(event.id),
          evidenceLinkForApprovalItem(item.id, item.title)
        ]
      })
      refreshGovernance()
      document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth' })
    },
    [refreshGovernance]
  )

  const handleMarkEventReviewed = useCallback(
    (eventId: string) => {
      const event = reviewEvents.find((e) => e.id === eventId)
      markReviewEventReviewed(eventId)
      if (event) {
        logFounderAction({
          actionType: 'mark-reviewed',
          targetType: 'review-event',
          targetId: eventId,
          riskLevel: event.riskLevel,
          reason: 'founder-reviewed',
          evidenceLinks: [evidenceLinkForReviewEvent(eventId)]
        })
      }
      refreshReviewEvents()
    },
    [reviewEvents, refreshReviewEvents]
  )

  const handleUpdatePatternStatus = useCallback(
    (patternId: string, status: LabPatternStatus) => {
      const pattern = patterns.find((p) => p.id === patternId)
      setPatternStatuses((prev) => ({ ...prev, [patternId]: status }))

      if (!pattern) return

      const actionMap: Partial<Record<LabPatternStatus, Parameters<typeof logFounderAction>[0]['actionType']>> = {
        accepted: 'accept-pattern',
        dismissed: 'dismiss',
        'needs-expert-review': 'send-to-expert-review',
        'in-approval-queue': 'add-to-approval-queue'
      }

      const actionType = actionMap[status]
      if (actionType) {
        logFounderAction({
          actionType,
          targetType: 'pattern',
          targetId: patternId,
          riskLevel: pattern.riskLevel,
          evidenceLinks: [evidenceLinkForPattern(patternId, pattern.title)]
        })
        refreshGovernance()
      }
    },
    [patterns, refreshGovernance]
  )

  const handleCreateBuildBriefFromPattern = useCallback(
    (pattern: LabPattern) => {
      const brief = generateBuildBriefFromPattern(pattern)
      logFounderAction({
        actionType: 'create-build-brief',
        targetType: 'pattern',
        targetId: pattern.id,
        riskLevel: pattern.riskLevel,
        evidenceLinks: [evidenceLinkForPattern(pattern.id, pattern.title)]
      })
      persistBuildBrief(brief, 'pattern', pattern.id)
      setPatternStatuses((prev) => ({ ...prev, [pattern.id]: 'build-brief-created' }))
    },
    [persistBuildBrief]
  )

  const handleCreateBuildBriefFromBenchmark = useCallback(
    (brief: BuildBrief) => {
      logFounderAction({
        actionType: 'create-build-brief',
        targetType: 'benchmark-run',
        targetId: brief.id,
        riskLevel: 'high',
        evidenceLinks: [evidenceLinkForBuildBrief(brief.id, brief.title)]
      })
      persistBuildBrief(brief, 'benchmark-run', brief.id)
      setEvaluationRunVersion((v) => v + 1)
    },
    [persistBuildBrief]
  )

  const handleEvaluationRunComplete = useCallback(() => {
    setEvaluationRunVersion((v) => v + 1)
    refreshGovernance()
  }, [refreshGovernance])

  const handleAddPatternToApprovalQueue = useCallback(
    (pattern: LabPattern) => {
      const item = patternToApprovalItem(pattern)
      setApprovalItems((prev) => {
        if (prev.some((existing) => existing.id === item.id)) return prev
        return [item, ...prev]
      })
      handleUpdatePatternStatus(pattern.id, 'in-approval-queue')
      document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth' })
    },
    [handleUpdatePatternStatus]
  )

  const handleCreateBuildBriefFromSuggestion = useCallback(
    (suggestion: LabSuggestion) => {
      const pattern = patterns.find((p) =>
        suggestion.evidenceSources.some((s) => s.type === 'detected-pattern' && s.id === p.id)
      )
      const brief = generateBuildBriefFromSuggestion(suggestion, { pattern })
      if (brief) {
        logFounderAction({
          actionType: 'create-build-brief',
          targetType: 'suggestion',
          targetId: suggestion.id,
          riskLevel: suggestion.riskLevel,
          evidenceLinks: [evidenceLinkForSuggestion(suggestion.id, suggestion.title)]
        })
        persistBuildBrief(brief, 'suggestion', suggestion.id)
      }
    },
    [patterns, persistBuildBrief]
  )

  const handleAddSuggestionToApprovalQueue = useCallback(
    (suggestion: LabSuggestion) => {
      const item = suggestionToApprovalItem(suggestion)
      setApprovalItems((prev) => {
        if (prev.some((existing) => existing.id === item.id)) return prev
        return [item, ...prev]
      })
      logFounderAction({
        actionType: 'add-to-approval-queue',
        targetType: 'suggestion',
        targetId: suggestion.id,
        riskLevel: suggestion.riskLevel,
        evidenceLinks: [
          evidenceLinkForSuggestion(suggestion.id),
          evidenceLinkForApprovalItem(item.id, item.title)
        ]
      })
      refreshGovernance()
      document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth' })
    },
    [refreshGovernance]
  )

  const handleUpdateSuggestionStatus = useCallback(
    (suggestionId: string, status: SuggestionStatus) => {
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      setSuggestionStatuses((prev) => ({ ...prev, [suggestionId]: status }))

      if (!suggestion) return

      const actionMap: Partial<Record<SuggestionStatus, Parameters<typeof logFounderAction>[0]['actionType']>> = {
        accepted: 'accept-suggestion',
        dismissed: 'dismiss',
        'needs-evidence': 'needs-more-evidence',
        'sent-to-expert-review': 'send-to-expert-review'
      }

      const actionType = actionMap[status]
      if (actionType) {
        logFounderAction({
          actionType,
          targetType: 'suggestion',
          targetId: suggestionId,
          riskLevel: suggestion.riskLevel,
          evidenceLinks: [evidenceLinkForSuggestion(suggestionId, suggestion.title)]
        })
        refreshGovernance()
      }
    },
    [suggestions, refreshGovernance]
  )

  const handleApprovalStatusChange = useCallback(
    (id: string, status: ApprovalStatus) => {
      const item = approvalItems.find((i) => i.id === id)
      setApprovalItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))

      if (!item) return

      const actionMap: Partial<Record<ApprovalStatus, Parameters<typeof logFounderAction>[0]['actionType']>> = {
        approved: 'approve',
        rejected: 'reject',
        'needs-evidence': 'needs-more-evidence',
        'expert-review': 'send-to-expert-review'
      }

      const actionType = actionMap[status]
      if (actionType) {
        logFounderAction({
          actionType,
          targetType: 'approval-item',
          targetId: id,
          riskLevel: item.riskLevel,
          reason: status === 'approved' ? 'approved-for-build' : status === 'rejected' ? 'rejected-by-founder' : undefined,
          evidenceLinks: [evidenceLinkForApprovalItem(id, item.title)]
        })
        refreshGovernance()
      }
    },
    [approvalItems, refreshGovernance]
  )

  return (
    <IndiCareLabShell
      dataMode={dataMode}
      investorSafeView={investorSafeView}
      onInvestorSafeViewChange={setInvestorSafeView}
    >
      <LabSectionCard
        id="overview"
        eyebrow="Dashboard"
        title="Overview"
        description="Data-mode-aware snapshot for ORB Residential. Metrics reflect real shadow review evidence, synthetic benchmarks, and evidence-based suggestions — no fake usage numbers."
      >
        <LabOverviewCards metrics={overviewMetrics} />
      </LabSectionCard>

      <BrainGapPanel
        gaps={BRAIN_GAPS}
        selectedGapIds={selectedGapIds}
        onToggleSelect={toggleSelect}
        onCreateBrief={handleCreateBriefFromGap}
      />

      <KnowledgeGapPanel
        gaps={KNOWLEDGE_GAPS}
        selectedGapIds={selectedGapIds}
        onToggleSelect={toggleSelect}
        onCreateBrief={handleCreateBriefFromGap}
      />

      <UiUxGapPanel
        gaps={UI_UX_GAPS}
        selectedGapIds={selectedGapIds}
        onToggleSelect={toggleSelect}
        onCreateBrief={handleCreateBriefFromGap}
      />

      <TechnologyWatchPanel items={TECHNOLOGY_WATCH} />

      <ReviewBoardPanel agents={REVIEW_BOARD_AGENTS} />

      <ShadowReviewStatusCard />

      <ReviewEventsPanel
        events={reviewEvents}
        summary={reviewSummary}
        investorSafeView={investorSafeView}
        onCreateBuildBrief={handleCreateBuildBriefFromEvent}
        onAddToApprovalQueue={handleAddEventToApprovalQueue}
        onMarkReviewed={handleMarkEventReviewed}
      />

      <RealSuggestionsPanel
        suggestions={suggestions}
        realSuggestions={realSuggestions}
        onCreateBuildBrief={handleCreateBuildBriefFromSuggestion}
        onAddToApprovalQueue={handleAddSuggestionToApprovalQueue}
        onUpdateStatus={handleUpdateSuggestionStatus}
      />

      <EvidenceOfImprovementPanel counts={evidenceCounts} />

      <EvidenceTimelinePanel
        entries={evidenceTimeline}
        storageMode={evidenceCounts.storageMode}
      />

      <GovernanceLogPanel actions={founderActions} />

      <PatternIntelligencePanel
        patterns={patterns}
        analysedEventCount={patternDetection.analysedEventCount}
        onCreateBuildBrief={handleCreateBuildBriefFromPattern}
        onAddToApprovalQueue={handleAddPatternToApprovalQueue}
        onUpdatePatternStatus={handleUpdatePatternStatus}
        onNavigateToBenchmarks={(scenarioId) => {
          const el = document.getElementById('evaluation-benchmarks')
          el?.scrollIntoView({ behavior: 'smooth' })
          if (scenarioId) {
            window.location.hash = `#evaluation-benchmarks`
          }
        }}
      />

      <EvaluationBenchmarksPanel
        onCreateBuildBrief={handleCreateBuildBriefFromBenchmark}
        onRunComplete={handleEvaluationRunComplete}
      />

      <InternalReviewTestPanel onEventCreated={handleReviewEventCreated} />

      <ExperimentsPanel experiments={EXPERIMENTS} />

      <FounderApprovalQueue
        items={approvalItems}
        onItemsChange={setApprovalItems}
        onStatusChange={handleApprovalStatusChange}
      />

      <LabRoadmapPanel items={ROADMAP_ITEMS} />

      <BuildBriefGeneratorPanel
        selectedGaps={selectedGaps}
        allGaps={ALL_GAPS}
        briefs={briefs}
        onBriefsChange={setBriefs}
        onClearSelection={clearSelection}
      />
    </IndiCareLabShell>
  )
}
