import { RecordHub } from '@/components/indicare/record/record-hub'
import { getChildJourneyData } from '@/lib/child-journey/data'
import { resolveRecordChildId } from '@/lib/record/recording-hub'

export default async function RecordPage({
  searchParams
}: {
  searchParams: Promise<{
    child_id?: string
    young_person_id?: string
    child_name?: string
    type?: string
  }>
}) {
  const query = await searchParams
  const childId = resolveRecordChildId(query)
  const highlightType = query.type?.trim() || undefined

  let childDisplayName = query.child_name?.trim()
  if (childId && !childDisplayName) {
    const journey = await getChildJourneyData(childId)
    const child = journey.child
    childDisplayName = child?.preferredName || child?.displayName || child?.firstName
  }

  return <RecordHub childId={childId} childDisplayName={childDisplayName} highlightType={highlightType} />
}
