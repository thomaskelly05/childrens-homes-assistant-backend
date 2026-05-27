import { PrivacyGovernanceDashboard } from '@/components/intelligence-governance/privacy-governance-dashboard'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader } from '@/components/indicare/ui'
import { fetchAiPrivacyDashboard } from '@/lib/os-api/ai-privacy'

type PageProps = {
  searchParams?: Promise<{ period?: string }>
}

export default async function PrivacyGovernancePage({ searchParams }: PageProps) {
  const params = (await searchParams) || {}
  const period = params.period || '7d'
  const result = await fetchAiPrivacyDashboard(period)
  const data = result.data

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="IndiCare Intelligence"
        title="AI Privacy Governance"
        description="Privacy guard decisions, redaction metrics and export governance. Metadata and redacted previews only."
      />
      <LiveDataStatus result={result} />
      <PrivacyGovernanceDashboard data={data} warning={result.warning || undefined} />
    </div>
  )
}
