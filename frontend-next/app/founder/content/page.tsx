import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderContentPage } from '@/components/founder/founder-content-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderContentPage />
    </FounderGuard>
  )
}
