import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Card, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { fullName, getStaffById } from '@/lib/indicare/selectors'
import { staffOperationalWorkspace } from '@/lib/operations/shift-data'

export default async function StaffHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const staff = getStaffById(id)
  if (!staff) notFound()
  const workspace = staffOperationalWorkspace(id)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff handover" title={`${fullName(staff)} · handover actions`} description="Handover actions assigned to or relevant for this staff member." />
      <Card>
        <SectionHeader eyebrow="Actions" title="Handover queue" />
        {workspace.handoverActions.length ? (
          <div className="space-y-3">
            {workspace.handoverActions.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-sm font-black text-slate-950">{item.title}</strong>
                  <StatusBadge value={item.priority} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.details}</p>
              </Link>
            ))}
          </div>
        ) : <EmptyState title="No handover actions" description="No handover actions are currently assigned." />}
      </Card>
    </div>
  )
}
