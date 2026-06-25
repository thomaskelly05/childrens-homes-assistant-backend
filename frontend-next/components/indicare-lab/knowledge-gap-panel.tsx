import { GapCard } from '@/components/indicare-lab/gap-card'
import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import type { LabGap } from '@/lib/indicare-lab/types'

export function KnowledgeGapPanel({
  gaps,
  selectedGapIds,
  onToggleSelect,
  onCreateBrief
}: {
  gaps: LabGap[]
  selectedGapIds: Set<string>
  onToggleSelect: (gapId: string) => void
  onCreateBrief: (gap: LabGap) => void
}) {
  return (
    <LabSectionCard
      id="knowledge-gaps"
      eyebrow="Knowledge coverage"
      title="Knowledge gap detection"
      description="Reviews policy corpus coverage against residential practice domains. Recommendations strengthen knowledge packs — not regulatory certification."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {gaps.map((gap) => (
          <GapCard
            key={gap.id}
            gap={gap}
            selected={selectedGapIds.has(gap.id)}
            onToggleSelect={onToggleSelect}
            onCreateBrief={onCreateBrief}
          />
        ))}
      </div>
    </LabSectionCard>
  )
}
