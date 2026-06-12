import { FounderFinancePage } from '@/components/founder/founder-finance-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function FounderFinanceRoute() {
  return (
    <FounderGuard>
      <FounderFinancePage />
    </FounderGuard>
  )
}
