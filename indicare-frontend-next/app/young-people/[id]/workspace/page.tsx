import { notFound } from 'next/navigation'

import { SyncChildScope } from '@/components/indicare/scope/sync-child-scope'
import { WorkspaceClient } from '@/app/young-people/[id]/workspace/WorkspaceClient'
import { getServerChildProfileBundle } from '@/lib/os-api/server-bundles'
import { getServerOsYoungPersonWorkspace } from '@/lib/os-api/server-workspaces'
import { normaliseChildWorkspaceOverview } from '@/lib/young-people/child-workspace-normaliser'

function DegradedWorkspacePanel({ childId, message }: { childId: string; message?: string }) {
  return (
    <div
      data-testid="child-workspace-degraded"
      className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-sm leading-7 text-amber-950"
    >
      <p className="font-black">Some live data could not be loaded</p>
      <p className="mt-2">{message || 'You can still use recording and navigation — try refreshing in a moment.'}</p>
      <p className="mt-2 text-xs text-amber-800">Child ID: {childId}</p>
    </div>
  )
}

export default async function YoungPersonWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [workspaceResult, profileResult] = await Promise.all([
    getServerOsYoungPersonWorkspace(id),
    getServerChildProfileBundle(id)
  ])

  const person = workspaceResult.data.youngPerson
  if (!person && workspaceResult.source === 'live' && !profileResult.data.identity?.id) {
    notFound()
  }

  const view = normaliseChildWorkspaceOverview({
    childId: id,
    workspace: workspaceResult.data,
    profileBundle: profileResult.data
  })

  const dataDegraded = workspaceResult.source === 'unavailable' && profileResult.source === 'unavailable'

  return (
    <>
      <SyncChildScope
        childId={id}
        childName={view.child.displayName}
        homeId={person?.homeId || profileResult.data.identity?.home_id}
      />
      {dataDegraded ? (
        <DegradedWorkspacePanel childId={id} message={workspaceResult.warning || profileResult.warning} />
      ) : null}
      <WorkspaceClient
        view={view}
        workspaceResult={workspaceResult}
        profileResult={profileResult}
        homeId={person?.homeId != null ? Number(person.homeId) : profileResult.data.identity?.home_id ?? null}
      />
    </>
  )
}
