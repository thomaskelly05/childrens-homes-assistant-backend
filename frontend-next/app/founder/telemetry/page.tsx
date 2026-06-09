import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderTelemetryPage } from '@/components/founder/founder-telemetry-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderTelemetryPage />
    </FounderGuard>
  )
}
