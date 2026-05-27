import { notFound } from 'next/navigation'

import { Card, SectionHeader } from '@/components/indicare/ui'
import { CalmIntelligenceGrid, PromptList, RiskIntelligenceHeader, RiskIntelligenceShell } from '@/components/indicare/risk-intelligence-panels'
import { buildMissingRiskView } from '@/lib/indicare/risk-intelligence'

export default async function YoungPersonMissingRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = buildMissingRiskView(id)
  if (!view) notFound()

  return (
    <div className="space-y-6">
      <RiskIntelligenceHeader
        eyebrow="Missing-from-care intelligence"
        title={`${view.person.preferredName} missing risk`}
        description="Pattern suggests review points from visible missing, return, trigger and chronology evidence."
        youngPersonId={id}
      />
      <RiskIntelligenceShell
        stats={[
          { label: 'Pattern cards', value: view.patterns.length, detail: 'Missing, trigger and return-work checks.' },
          { label: 'Orb prompts', value: view.orbPrompts.length, detail: 'Conversation-safe prompts for staff.' },
          { label: 'Evidence links', value: view.allEvidence.length, detail: 'Scoped to this young person.' }
        ]}
        primary={view.patterns}
        prompts={view.reviewPrompts}
        evidence={view.allEvidence}
      >
        <Card>
          <SectionHeader eyebrow="Orb support" title="Missing risk prompts" description="Records indicate these prompts support adults during handover and review." />
          <PromptList prompts={view.orbPrompts} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Pattern review" title="Missing-from-care checks" />
          <CalmIntelligenceGrid items={view.patterns} />
        </Card>
      </RiskIntelligenceShell>
    </div>
  )
}
