import { FounderGuard } from '@/components/founder/founder-guard'
import { IndiCareLabPage } from '@/components/indicare-lab/indicare-lab-page'

export default function Page() {
  return (
    <FounderGuard>
      <IndiCareLabPage />
    </FounderGuard>
  )
}
