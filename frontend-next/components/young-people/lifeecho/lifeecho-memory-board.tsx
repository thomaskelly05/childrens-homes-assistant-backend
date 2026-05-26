import { LifeEchoMemoryCard } from '@/components/young-people/lifeecho/lifeecho-memory-card'
import { LifeEchoReviewPanel } from '@/components/young-people/lifeecho/lifeecho-review-panel'
import { LifeEchoUploadPhoto } from '@/components/young-people/lifeecho/lifeecho-upload-photo'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { fetchLifeEchoMemories } from '@/lib/os-api/child-lifecycle'

export async function LifeEchoMemoryBoard({ childId }: { childId: string }) {
  const result = await fetchLifeEchoMemories(childId)
  const memories = result.data?.memories || []

  return (
    <div data-testid="lifeecho-memory-board" className="space-y-6">
      <LiveDataStatus result={result} />
      <LifeEchoUploadPhoto childId={childId} />
      <LifeEchoReviewPanel childId={childId} suggestions={result.data?.suggestions || []} />
      <div className="grid gap-4 md:grid-cols-2">
        {memories.map((memory, index) => (
          <LifeEchoMemoryCard key={String(memory.id || index)} memory={memory} />
        ))}
      </div>
    </div>
  )
}
