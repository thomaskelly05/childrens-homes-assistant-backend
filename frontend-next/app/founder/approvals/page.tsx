import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderApprovalsPage } from '@/components/founder/founder-approvals-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderApprovalsPage />
    </FounderGuard>
  )
}
