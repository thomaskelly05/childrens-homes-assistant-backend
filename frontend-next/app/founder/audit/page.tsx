import { FounderAuditPage } from '@/components/founder/founder-audit-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function Page() {
  return (
    <FounderGuard>
      <FounderAuditPage />
    </FounderGuard>
  )
}
