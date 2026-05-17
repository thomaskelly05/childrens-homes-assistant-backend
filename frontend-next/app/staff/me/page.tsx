import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader } from '@/components/indicare/ui'
import { LiveStaffOperationalWorkspace } from '@/components/operations/live-staff-workspace'
import { getCommandCentre, getStaff } from '@/lib/os-api/platform'

export default function MyStaffWorkspacePage() {
export default async function MyStaffWorkspacePage() {
  const [staffResult, command] = await Promise.all([getStaff(), getCommandCentre()])
  const currentStaff = staffResult.data.currentUser

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My shift workspace"
        title="My operational workspace"
        description="Signed-in adult context, visible children, live actions and operational attention for this shift."
        action={<Link href="/staff/me/recording" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Quick recording</Link>}
      />
      <StaffOperationalWorkspace />
      <LiveDataStatus result={staffResult} />
      <LiveDataStatus result={command} />
      <LiveStaffOperationalWorkspace staff={currentStaff} visibleChildren={command.data.children} actions={command.data.actions} attention={command.data.attention} />
    </div>
  )
}
