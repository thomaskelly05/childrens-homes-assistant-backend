import { FounderIntelligenceBriefingDetailPage } from '@/components/founder/founder-intelligence-briefing-detail-page'
import { FounderGuard } from '@/components/founder/founder-guard'

type PageProps = { params: Promise<{ briefingId: string }> }

export default async function Page({ params }: PageProps) {
  const { briefingId } = await params
  return (
    <FounderGuard>
      <FounderIntelligenceBriefingDetailPage briefingId={briefingId} />
    </FounderGuard>
  )
}
