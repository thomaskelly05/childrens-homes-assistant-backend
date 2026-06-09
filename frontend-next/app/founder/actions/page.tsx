import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderActionsPage } from '@/components/founder/founder-actions-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderActionsPage />
    </FounderGuard>
  )
}
