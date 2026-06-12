import { FounderGuard } from '@/components/founder/founder-guard'
import { FounderLearningLoopPage } from '@/components/founder/founder-learning-loop-page'

export default function LearningLoopRoute() {
  return (
    <FounderGuard>
      <FounderLearningLoopPage />
    </FounderGuard>
  )
}
