import { notFound } from 'next/navigation'

import { RecordWorkspacePage } from '@/components/indicare/workspaces/record-workspace-page'
import { getOsAdultWorkspace } from '@/lib/os-api/workspaces'

export default async function StaffWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workspace = await getOsAdultWorkspace(id)
  const adult = workspace.data.adult
  if (!adult && workspace.source === 'live') notFound()

  return (
    <RecordWorkspacePage
      entityType="staff"
      backHref="/staff"
      record={{
        id,
        title: adult?.displayName || `Staff member ${id}`,
        description: `${adult?.role || 'Staff profile'} · ${adult?.email || 'No email recorded'}`,
        status: adult?.status || 'active',
        ...adult
      }}
      chronology={workspace.data.recordsAuthored || []}
      actions={workspace.data.actions || []}
      evidence={[]}
    />
  )
}

