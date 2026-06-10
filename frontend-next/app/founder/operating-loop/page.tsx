import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderOperatingLoopPage } from '@/components/founder/founder-operating-loop-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderOperatingLoopPage />
    </FounderGuard>
  )
}
