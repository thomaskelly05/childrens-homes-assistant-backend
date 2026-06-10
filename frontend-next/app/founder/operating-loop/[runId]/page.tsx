import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderOperatingLoopDetailPage } from '@/components/founder/founder-operating-loop-detail-page'

type PageProps = {
  params: Promise<{ runId: string }>
}

export default async function Page({ params }: PageProps) {
  const { runId } = await params
  return (
    <FounderGuard>
      <FounderOperatingLoopDetailPage runId={runId} />
    </FounderGuard>
  )
}
