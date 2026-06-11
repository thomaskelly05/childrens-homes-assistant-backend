import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderOrbPilotPage } from '@/components/founder/founder-orb-pilot-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderOrbPilotPage />
    </FounderGuard>
  )
}
