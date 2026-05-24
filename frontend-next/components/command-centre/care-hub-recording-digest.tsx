'use client'

import { RecordingManagerDigest } from '@/components/indicare/record/recording-manager-digest'

export function CareHubRecordingDigest({ selectedYoungPersonId }: { selectedYoungPersonId?: string }) {
  const childId = selectedYoungPersonId ? Number.parseInt(selectedYoungPersonId, 10) : undefined
  const childFilter = Number.isFinite(childId) ? childId : undefined

  return (
    <section data-testid="care-hub-recording-digest" className="min-w-0">
      <RecordingManagerDigest compact childId={childFilter} />
    </section>
  )
}
