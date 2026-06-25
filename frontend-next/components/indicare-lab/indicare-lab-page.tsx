'use client'

import { useCallback, useMemo, useState } from 'react'

import { BrainGapPanel } from '@/components/indicare-lab/brain-gap-panel'
import { BuildBriefGeneratorPanel } from '@/components/indicare-lab/build-brief-generator-panel'
import { ExperimentsPanel } from '@/components/indicare-lab/experiments-panel'
import { FounderApprovalQueue } from '@/components/indicare-lab/founder-approval-queue'
import { IndiCareLabShell } from '@/components/indicare-lab/indicare-lab-shell'
import { KnowledgeGapPanel } from '@/components/indicare-lab/knowledge-gap-panel'
import { LabOverviewCards } from '@/components/indicare-lab/lab-overview-cards'
import { LabRoadmapPanel } from '@/components/indicare-lab/lab-roadmap-panel'
import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { ReviewBoardPanel } from '@/components/indicare-lab/review-board-panel'
import { TechnologyWatchPanel } from '@/components/indicare-lab/technology-watch-panel'
import { UiUxGapPanel } from '@/components/indicare-lab/ui-ux-gap-panel'
import { generateBuildBrief } from '@/lib/indicare-lab/build-brief'
import {
  ALL_GAPS,
  APPROVAL_QUEUE,
  BRAIN_GAPS,
  EXPERIMENTS,
  KNOWLEDGE_GAPS,
  OVERVIEW_METRICS,
  REVIEW_BOARD_AGENTS,
  ROADMAP_ITEMS,
  TECHNOLOGY_WATCH,
  UI_UX_GAPS
} from '@/lib/indicare-lab/demo-data'
import type { BuildBrief, LabGap } from '@/lib/indicare-lab/types'

export function IndiCareLabPage() {
  const [selectedGapIds, setSelectedGapIds] = useState<Set<string>>(new Set())
  const [briefs, setBriefs] = useState<BuildBrief[]>([])

  const selectedGaps = useMemo(
    () => ALL_GAPS.filter((g) => selectedGapIds.has(g.id)),
    [selectedGapIds]
  )

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

  return (
    <IndiCareLabShell>
      <LabSectionCard
        id="overview"
        eyebrow="Dashboard"
        title="Overview"
        description="Continuous assessment snapshot for ORB Residential. All metrics are synthetic development-mode evaluations."
      >
        <LabOverviewCards metrics={OVERVIEW_METRICS} />
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

      <ExperimentsPanel experiments={EXPERIMENTS} />

      <FounderApprovalQueue initialItems={APPROVAL_QUEUE} />

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
