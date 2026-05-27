import { notFound } from 'next/navigation'

import { RiskIntelligenceHeader, RiskIntelligenceShell } from '@/components/indicare/risk-intelligence-panels'
import { buildRiskIntelligenceView } from '@/lib/indicare/risk-intelligence'

export default async function YoungPersonRiskIntelligencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = buildRiskIntelligenceView(id)
  if (!view) notFound()

  return (
    <div className="space-y-6">
      <RiskIntelligenceHeader
        eyebrow="Operational risk support"
        title={`${view.person.preferredName} risk intelligence`}
        description="Child-level trends and patterns — improving, repeating, or action needed. Decision support only; adults remain responsible for review."
        youngPersonId={id}
      />
      <RiskIntelligenceShell
        stats={[
          { label: 'Scoped records', value: view.allEvidence.length, detail: 'Active child evidence only.' },
          { label: 'Domains', value: view.domains.length, detail: 'Missing, exploitation support, wellbeing, education and family context.' },
          { label: 'Review prompts', value: view.reviewPrompts.length, detail: 'Draft guidance for manager oversight.' }
        ]}
        primary={view.overview}
        prompts={view.reviewPrompts}
        evidence={view.allEvidence}
      />
    </div>
  )
}
