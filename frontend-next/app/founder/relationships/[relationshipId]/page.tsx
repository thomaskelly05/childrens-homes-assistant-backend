import { FounderRelationshipDetailPage } from '@/components/founder/founder-relationship-detail-page'
import { FounderGuard } from '@/components/founder/founder-guard'

type PageProps = {
  params: Promise<{ relationshipId: string }>
}

export default async function RelationshipDetailPage({ params }: PageProps) {
  const { relationshipId } = await params
  return (
    <FounderGuard>
      <FounderRelationshipDetailPage relationshipId={relationshipId} />
    </FounderGuard>
  )
}
