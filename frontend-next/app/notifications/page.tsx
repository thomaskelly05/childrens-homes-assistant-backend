import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { indicareData } from '@/lib/indicare/demo-data'

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notifications" title="Notification centre" description="Alerts and reminders linked back to risks, incidents, medication, documents, reports and appointments." />
      <Card>
        <SectionHeader eyebrow="Queue" title="Notifications" />
        <DataTable
          headers={['Created', 'Priority', 'Title', 'Message', 'Linked record', 'Read']}
          rows={indicareData.notifications.map((notification) => [
            new Date(notification.createdAt).toLocaleString('en-GB'),
            notification.priority,
            notification.title,
            notification.message,
            <Link key={notification.id} href={`/${notification.linkedRecordType === 'document' ? 'documents' : notification.linkedRecordType === 'medication' ? 'medication' : notification.linkedRecordType === 'risk' ? 'risk-assessments' : 'dashboard'}`} className="font-bold text-blue-700">{notification.linkedRecordType}</Link>,
            <StatusBadge key="read" value={notification.read ? 'Read' : 'Unread'} />
          ])}
          empty={<EmptyState title="No notifications" description="There are no notifications right now." />}
        />
      </Card>
    </div>
  )
}
