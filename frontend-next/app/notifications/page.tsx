import { Card, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'

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
        <StatCard label="Unread" value="-" detail="Live notification queue not connected" href="/notifications" entity={{ entity_type: 'notification' }} />
        <StatCard label="Operational types" value={operationalTypes.length} detail="Shift-safe alert categories" href="/shifts/current" entity={{ entity_type: 'shift' }} />
        <StatCard label="Snooze foundation" value="-" detail="Awaiting live notification storage" href="/notifications" entity={{ entity_type: 'notification' }} />
        <StatCard label="Deep links" value="Chronology" detail="Open live workflow context" href="/chronology" entity={{ entity_type: 'chronology_event' }} />
      </section>
      <Card>
        <SectionHeader eyebrow="Types" title="Operational notification categories" />
        <div className="flex flex-wrap gap-2">
          {operationalTypes.map((type) => <StatusBadge key={type} value={type} />)}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Queue" title="Notifications" />
        <EmptyState title="Live notification queue not connected" description="No notification records are shown until the queue is backed by live OS storage." />
      </Card>
    </div>
  )
}
