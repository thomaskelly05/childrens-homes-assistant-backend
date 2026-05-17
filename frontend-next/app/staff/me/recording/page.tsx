import { PageHeader } from '@/components/indicare/ui'
import { RapidRecordingDrawer } from '@/components/operations/rapid-recording'
import { StaffOperationalWorkspace } from '@/components/operations/staff-workspace'

export default function MyRecordingPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My recording" title="My rapid recording workspace" description="Complete overdue recording and open quick-add tools for this shift." />
      <StaffOperationalWorkspace />
      <RapidRecordingDrawer />
    </div>
  )
}
