import { Suspense } from 'react'

import { RecordHub } from '@/components/indicare/record/record-hub'
import { getChildJourneyData } from '@/lib/child-journey/data'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'
import { resolveRecordAboutContext, resolveRecordChildId } from '@/lib/record/recording-hub'

export default async function RecordPage({
  searchParams
}: {
  searchParams: Promise<{
    child_id?: string
    young_person_id?: string
    home_id?: string
    child_name?: string
    type?: string
    about?: string
    draft_id?: string
  }>
}) {
  const query = await searchParams
  const childId = resolveRecordChildId(query)
  const homeId = query.home_id?.trim() || undefined
  const highlightType = query.type?.trim() || undefined
  const initialAbout = resolveRecordAboutContext(query.about, homeId)

  let childDisplayName = query.child_name?.trim()
  if (childId && !childDisplayName) {
    const journey = await getChildJourneyData(childId)
    const child = journey.child
    childDisplayName = child?.preferredName || child?.displayName || child?.firstName
  }

  const peopleResult = await getServerOsYoungPeople()

  return (
    <Suspense fallback={<div className="px-5 py-10 text-sm font-black text-slate-500">Loading record hub…</div>}>
      <RecordHub
        initialChildId={childId}
        initialChildDisplayName={childDisplayName}
        highlightType={highlightType}
        initialAbout={initialAbout}
        initialYoungPeople={peopleResult.source === 'live' ? peopleResult.data : undefined}
      />
    </Suspense>
  )
}
