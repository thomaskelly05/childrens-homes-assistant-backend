import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderQualityLabPage } from '@/components/founder/founder-quality-lab-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderQualityLabPage />
    </FounderGuard>
  )
}
