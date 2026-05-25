import { notFound } from 'next/navigation'

import { SyncChildScope } from '@/components/indicare/scope/sync-child-scope'
import { RecordWorkspacePage } from '@/components/indicare/workspaces/record-workspace-page'
import { getOsYoungPersonWorkspace } from '@/lib/os-api/workspaces'

export default async function YoungPersonWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workspace = await getOsYoungPersonWorkspace(id)
  const person = workspace.data.youngPerson
  if (!person && workspace.source === 'live') notFound()

  return (
    <>
      <SyncChildScope
        childId={id}
        childName={person?.displayName}
        homeId={person?.homeId}
      />
      <RecordWorkspacePage
      entityType="young_person"
      backHref="/young-people"
      record={{
        id,
        title: person?.displayName || `Young person ${id}`,
        description: `${person?.legalStatus || 'Care record'} · ${person?.carePlanning || 'Review linked records, actions and evidence.'}`,
        status: person?.placementStatus || person?.status || 'active',
        ...person
      }}
      chronology={workspace.data.chronology || []}
      actions={workspace.data.actions || []}
      evidence={workspace.data.evidence || []}
    />
    </>
  )
}

