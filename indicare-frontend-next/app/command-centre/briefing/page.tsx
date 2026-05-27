import { ManagerDailyBriefPage } from '@/components/command-centre/manager-daily-brief-page'
import { PageHeader } from '@/components/indicare/ui'

export default function CommandCentreBriefingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Command Centre"
        title="Manager daily brief"
        description="Metadata-only recording, review and safeguarding follow-up for today. Manager judgement remains required."
      />
      <ManagerDailyBriefPage />
    </div>
  )
}
