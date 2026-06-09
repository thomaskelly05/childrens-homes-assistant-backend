import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderBuildBriefsPage } from '@/components/founder/founder-build-briefs-page'

export default function Page() {
  return (
    <FounderGuard>
      <FounderBuildBriefsPage />
    </FounderGuard>
  )
}
