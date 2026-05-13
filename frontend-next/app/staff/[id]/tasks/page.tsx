import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Card, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getStaffById, fullName } from '@/lib/indicare/selectors'
import { staffOperationalWorkspace } from '@/lib/operations/shift-data'

export default async function StaffTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const staff = getStaffById(id)
  if (!staff) notFound()
  const workspace = staffOperationalWorkspace(id)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff tasks" title={`${fullName(staff)} · task queue`} description="Operational task queue, needs-attention items, awaiting review and overdue recording." />
      <section className="grid gap-6 xl:grid-cols-2">
        {Object.entries(workspace.queues).map(([queueName, items]) => (
          <Card key={queueName}>
            <SectionHeader eyebrow="Queue" title={queueName.replace(/([A-Z])/g, ' $1').toLowerCase()} />
            {items.length ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <Link key={item.id} href={'href' in item ? item.href : `/incidents/${item.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-sm font-black text-slate-950">{'title' in item ? item.title : item.type}</strong>
                      <StatusBadge value={'urgency' in item ? item.urgency : 'review'} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyState title="No items" description="This queue is clear." />}
          </Card>
        ))}
      </section>
    </div>
  )
}
