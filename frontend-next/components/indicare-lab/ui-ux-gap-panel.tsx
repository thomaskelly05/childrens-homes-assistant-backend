import { GapCard } from '@/components/indicare-lab/gap-card'
import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import type { LabGap } from '@/lib/indicare-lab/types'

export function UiUxGapPanel({
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
      id="ui-ux-gaps"
      eyebrow="Interface & experience"
      title="UI / UX assessment"
      description="Reviews staff and ORB Residential interface patterns for clarity, safety and mobile readiness. Flags friction points for founder review."
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
