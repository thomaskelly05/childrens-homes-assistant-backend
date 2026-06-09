import { FounderDashboardPage } from '@/components/founder/founder-dashboard-page'
import { FounderGuard } from '@/components/founder/founder-guard'

export default function FounderPage() {
  return (
    <FounderGuard>
      <FounderDashboardPage />
    </FounderGuard>
  )
}
