import { FounderRelationshipsPage } from '@/components/founder/founder-relationships-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function RelationshipsPage() {
  return (
    <FounderGuard>
      <FounderRelationshipsPage />
    </FounderGuard>
  )
}
