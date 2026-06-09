import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderTeamPage } from '@/components/founder/founder-team-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderTeamPage />
    </FounderGuard>
  )
}
