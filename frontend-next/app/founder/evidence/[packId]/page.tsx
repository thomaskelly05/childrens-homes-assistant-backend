import { notFound } from 'next/navigation'

import { FounderEvidenceDetailPage } from '@/components/founder/founder-evidence-detail-page'
import { FounderGuard } from '@/components/founder/founder-guard'

type PageProps = {
  params: Promise<{ packId: string }>
}

export default async function EvidencePackPage({ params }: PageProps) {
  const { packId } = await params
  if (!packId || packId.length < 3) notFound()

  return (
    <FounderGuard>
      <FounderEvidenceDetailPage packId={packId} />
    </FounderGuard>
  )
}
