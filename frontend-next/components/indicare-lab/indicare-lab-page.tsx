'use client'

import { useCallback, useMemo, useState } from 'react'

import { BrainGapPanel } from '@/components/indicare-lab/brain-gap-panel'
import { BuildBriefGeneratorPanel } from '@/components/indicare-lab/build-brief-generator-panel'
import { EvaluationBenchmarksPanel } from '@/components/indicare-lab/evaluation-benchmarks-panel'
import { ExperimentsPanel } from '@/components/indicare-lab/experiments-panel'
import { FounderApprovalQueue } from '@/components/indicare-lab/founder-approval-queue'
import { IndiCareLabShell } from '@/components/indicare-lab/indicare-lab-shell'
import { InternalReviewTestPanel } from '@/components/indicare-lab/internal-review-test-panel'
import { KnowledgeGapPanel } from '@/components/indicare-lab/knowledge-gap-panel'
import { LabOverviewCards } from '@/components/indicare-lab/lab-overview-cards'
import { LabRoadmapPanel } from '@/components/indicare-lab/lab-roadmap-panel'
import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { PatternIntelligencePanel } from '@/components/indicare-lab/pattern-intelligence-panel'
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
import { buildLabOverviewMetrics } from '@/lib/indicare-lab/lab-overview-metrics'
import { summariseEvaluationRuns } from '@/lib/indicare-lab/evaluations/evaluation-storage'
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
import type { ApprovalQueueItem, BuildBrief, LabGap } from '@/lib/indicare-lab/types'

export function IndiCareLabPage() {
  const [selectedGapIds, setSelectedGapIds] = useState<Set<string>>(new Set())
  const [briefs, setBriefs] = useState<BuildBrief[]>([])
  const [reviewEvents, setReviewEvents] = useState<ReviewEvent[]>(() => listReviewEvents())
  const [approvalItems, setApprovalItems] = useState<ApprovalQueueItem[]>(APPROVAL_QUEUE)
  const [patternStatuses, setPatternStatuses] = useState<Record<string, LabPatternStatus>>({})
  const [evaluationRunVersion, setEvaluationRunVersion] = useState(0)

  const reviewSummary = useMemo(() => summariseReviewEvents(), [reviewEvents])

  const evaluationSummary = useMemo(
    () => summariseEvaluationRuns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when benchmarks run
    [evaluationRunVersion]
  )

  const patternDetection = useMemo(() => detectPatternsFromReviewEvents(reviewEvents), [reviewEvents])

  const patterns = useMemo(
    () =>
      patternDetection.patterns.map((pattern) => ({
        ...pattern,
        founderDecisionStatus: patternStatuses[pattern.id] ?? pattern.founderDecisionStatus
      })),
    [patternDetection.patterns, patternStatuses]
  )

  const overviewMetrics = useMemo(
    () =>
      buildLabOverviewMetrics({
        reviewSummary,
        patterns,
        pendingApprovals: approvalItems.filter((item) => item.status === 'pending').length,
        evaluationSummary
      }),
    [reviewSummary, patterns, approvalItems, evaluationSummary]
  )

  const selectedGaps = useMemo(
    () => ALL_GAPS.filter((g) => selectedGapIds.has(g.id)),
    [selectedGapIds]
  )

  const refreshReviewEvents = useCallback(() => {
    setReviewEvents(listReviewEvents())
  }, [])

  const toggleSelect = useCallback((gapId: string) => {
    setSelectedGapIds((prev) => {
      const next = new Set(prev)
      if (next.has(gapId)) next.delete(gapId)
      else next.add(gapId)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedGapIds(new Set()), [])

  const handleCreateBriefFromGap = useCallback((gap: LabGap) => {
    const brief = generateBuildBrief([gap])
    setBriefs((prev) => [brief, ...prev])
    document.getElementById('build-briefs')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleReviewEventCreated = useCallback(
    (_event: ReviewEvent) => {
      refreshReviewEvents()
      document.getElementById('review-events')?.scrollIntoView({ behavior: 'smooth' })
    },
    [refreshReviewEvents]
  )

  const handleCreateBuildBriefFromEvent = useCallback((event: ReviewEvent) => {
    const brief = generateBuildBriefFromReviewEvent(event)
    setBriefs((prev) => [brief, ...prev])
    document.getElementById('build-briefs')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleAddEventToApprovalQueue = useCallback((event: ReviewEvent) => {
    const item = reviewEventToApprovalItem(event)
    setApprovalItems((prev) => {
      if (prev.some((existing) => existing.id === item.id)) return prev
      return [item, ...prev]
    })
    document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleMarkEventReviewed = useCallback(
    (eventId: string) => {
      markReviewEventReviewed(eventId)
      refreshReviewEvents()
    },
    [refreshReviewEvents]
  )

  const handleUpdatePatternStatus = useCallback((patternId: string, status: LabPatternStatus) => {
    setPatternStatuses((prev) => ({ ...prev, [patternId]: status }))
  }, [])

  const handleCreateBuildBriefFromPattern = useCallback(
    (pattern: LabPattern) => {
      const brief = generateBuildBriefFromPattern(pattern)
      setBriefs((prev) => [brief, ...prev])
      document.getElementById('build-briefs')?.scrollIntoView({ behavior: 'smooth' })
    },
    []
  )

  const handleCreateBuildBriefFromBenchmark = useCallback((brief: BuildBrief) => {
    setBriefs((prev) => [brief, ...prev])
    setEvaluationRunVersion((v) => v + 1)
    document.getElementById('build-briefs')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleEvaluationRunComplete = useCallback(() => {
    setEvaluationRunVersion((v) => v + 1)
  }, [])

  const handleAddPatternToApprovalQueue = useCallback((pattern: LabPattern) => {
    const item = patternToApprovalItem(pattern)
    setApprovalItems((prev) => {
      if (prev.some((existing) => existing.id === item.id)) return prev
      return [item, ...prev]
    })
    document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <IndiCareLabShell>
      <LabSectionCard
        id="overview"
        eyebrow="Dashboard"
        title="Overview"
        description="Continuous assessment snapshot for ORB Residential. Metrics combine review events, pattern intelligence, evaluation benchmarks, and shadow review status — all internal evaluation."
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
        onCreateBuildBrief={handleCreateBuildBriefFromEvent}
        onAddToApprovalQueue={handleAddEventToApprovalQueue}
        onMarkReviewed={handleMarkEventReviewed}
      />

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

      <FounderApprovalQueue items={approvalItems} onItemsChange={setApprovalItems} />

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
