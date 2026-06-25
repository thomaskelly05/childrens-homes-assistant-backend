import { GapCard } from '@/components/indicare-lab/gap-card'
import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import type { LabGap } from '@/lib/indicare-lab/types'

export function BrainGapPanel({
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
      id="brain-gaps"
      eyebrow="Brain quality"
      title="Brain gap detection"
      description="Flags reasoning, grounding and calibration gaps in ORB Residential brain responses. Supports internal evaluation — does not guarantee compliance."
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
