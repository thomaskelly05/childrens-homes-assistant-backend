import { ArchiveFilterBar } from '@/components/young-people/archive/archive-filter-bar'
import { ArchiveRecordCard } from '@/components/young-people/archive/archive-record-card'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { EmptyState } from '@/components/indicare/ui'
import { fetchChildArchive } from '@/lib/os-api/child-lifecycle'

export async function ChildArchiveLibrary({
  childId,
  search,
  recordType
}: {
  childId: string
  search?: string
  recordType?: string
}) {
  const result = await fetchChildArchive(childId, search)
  let records = result.data?.records || []
  if (recordType) {
    records = records.filter((row) => row.record_type === recordType)
  }

  return (
    <div data-testid="child-archive-library" className="space-y-4">
      <LiveDataStatus result={result} />
      <ArchiveFilterBar childId={childId} />
      {records.length ? (
        <div className="space-y-3">
          {records.map((record) => (
            <ArchiveRecordCard key={record.id} record={record} childId={childId} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No signed-off archive records yet"
          description="Drafts are not shown here. Records appear after formal sign-off and manager review where required."
        />
      )}
    </div>
  )
}
