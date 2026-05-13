import Link from 'next/link'

import { PageHeader } from '@/components/indicare/ui'
import { StaffOperationalWorkspace } from '@/components/operations/staff-workspace'

export default function MyStaffWorkspacePage() {
  const currentStaffId = 'staff-abi'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My shift workspace"
        title="My operational workspace"
        description="Assigned children, active risks, outstanding tasks, overdue recording, handover actions, notifications and QA feedback for this shift."
        action={<Link href="/staff/me/recording" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Quick recording</Link>}
      />
      <StaffOperationalWorkspace staffId={currentStaffId} />
    </div>
  )
}
