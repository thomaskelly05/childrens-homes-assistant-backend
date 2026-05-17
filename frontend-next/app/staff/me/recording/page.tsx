import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader } from '@/components/indicare/ui'
import { RapidRecordingDrawer } from '@/components/operations/rapid-recording'
import { LiveStaffOperationalWorkspace } from '@/components/operations/live-staff-workspace'
import { getCommandCentre, getStaff } from '@/lib/os-api/platform'

export default async function MyRecordingPage() {
  const [staffResult, command] = await Promise.all([getStaff(), getCommandCentre()])
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My recording" title="My rapid recording workspace" description="Complete overdue recording and open quick-add tools for this shift." />
      <LiveDataStatus result={staffResult} />
      <LiveStaffOperationalWorkspace staff={staffResult.data.currentUser} children={command.data.children} actions={command.data.actions} attention={command.data.attention} />
      <RapidRecordingDrawer />
    </div>
  )
}
