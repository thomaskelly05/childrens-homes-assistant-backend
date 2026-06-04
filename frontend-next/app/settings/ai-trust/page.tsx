import Link from 'next/link'

import { Card, PageHeader, SectionHeader } from '@/components/indicare/ui'
import { AiTrustSettingsForm } from '@/components/settings/ai-trust-settings-form'

export default function AiTrustSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="AI Trust & Data Settings"
        description="Control external AI processing, redaction, storage, voice, report drafting, and review usage audit. Changes require provider administrator access."
      />
      <p className="text-sm text-slate-600">
        <Link href="/settings" className="underline">
          Back to provider settings
        </Link>
      </p>
      <Card>
        <SectionHeader
          eyebrow="Provider controls"
          title="External AI and data minimisation"
          description="Dangerous options require confirmation. Draft outputs always need human review before records are finalised."
        />
        <AiTrustSettingsForm />
      </Card>
    </div>
  )
}
