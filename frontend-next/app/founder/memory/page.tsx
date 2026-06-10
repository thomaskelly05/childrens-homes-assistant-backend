import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderMemoryPage } from '@/components/founder/founder-memory-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderMemoryPage />
    </FounderGuard>
  )
}
