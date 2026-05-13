import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'
import { getEntityRoute } from '@/lib/navigation/entity-resolver'

const operationalTypes = [
  'safeguarding escalation',
  'overdue action',
  'recording overdue',
  'manager review required',
  'incident assigned',
  'medication alert',
  'welfare check due',
  'handover ready',
  'shift started',
  'missing evidence',
  'inspection readiness concern'
]

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notifications" title="Notification centre" description="Alerts and reminders linked back to risks, incidents, medication, documents, reports and appointments." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unread" value={indicareData.notifications.filter((item) => !item.read).length} detail="Requires acknowledgement" href="/notifications" entity={{ entity_type: 'notification' }} />
        <StatCard label="Operational types" value={operationalTypes.length} detail="Shift-safe alert categories" href="/shifts/current" entity={{ entity_type: 'shift' }} />
        <StatCard label="Snooze foundation" value="Ready" detail="UI/state contract in place" href="/notifications" entity={{ entity_type: 'notification' }} />
        <StatCard label="Deep links" value="Contextual" detail="Open workflow and chronology context" href="/chronology" entity={{ entity_type: 'chronology_event' }} />
      </section>
      <Card>
        <SectionHeader eyebrow="Types" title="Operational notification categories" />
        <div className="flex flex-wrap gap-2">
          {operationalTypes.map((type) => <StatusBadge key={type} value={type} />)}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Queue" title="Notifications" />
        <DataTable
          headers={['Created', 'Priority', 'Title', 'Message', 'Workflow', 'Actions']}
          rows={indicareData.notifications.map((notification) => [
            new Date(notification.createdAt).toLocaleString('en-GB'),
            notification.priority,
            notification.title,
            notification.message,
            <Link key={notification.id} href={getEntityRoute({ entity_type: notification.linkedRecordType || 'notification', entity_id: notification.id })} className="font-bold text-blue-700">{notification.linkedRecordType}</Link>,
            <div key="actions" className="flex flex-wrap gap-2">
              <StatusBadge value={notification.read ? 'acknowledged' : 'unread'} />
              <StatusBadge value="quick open" />
              <StatusBadge value="snooze ready" />
            </div>
          ])}
          empty={<EmptyState title="No notifications" description="There are no notifications right now." />}
        />
      </Card>
    </div>
  )
}
