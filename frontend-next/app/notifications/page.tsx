import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getNotifications } from '@/lib/os-api/connect'
import { getOperationalNotificationFeed } from '@/lib/os-api/notifications'

export default async function NotificationsPage() {
  const [result, operational] = await Promise.all([
    getNotifications(),
    getOperationalNotificationFeed({ limit: 30 })
  ])
  const notifications = result.data.items || []
  const operationalItems = operational.data.items || []
  const unread = notifications.filter((item) => !item.read_at).length + (operational.data.unread || 0)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notifications" title="Notification centre" description="Schema-backed alerts and Connect notifications for your current provider/home scope." />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unread" value={unread} detail="Unread notifications returned by the backend" href="/notifications" entity={{ entity_type: 'notification' }} />
        <StatCard label="Total" value={notifications.length} detail="Visible to this user" href="/notifications" entity={{ entity_type: 'notification' }} />
        <StatCard label="Connect" value={notifications.filter((item) => item.notification_type === 'connect_message').length} detail="Message notifications" href="/connect" entity={{ entity_type: 'notification' }} />
        <StatCard label="Handover" value={notifications.filter((item) => item.notification_type.includes('handover')).length} detail="Acknowledgement or shift continuity" href="/handover/current" entity={{ entity_type: 'handover' }} />
      </section>
      <Card>
        <SectionHeader eyebrow="Queue" title="Notifications" />
        <div className="space-y-3">
          {notifications.map((item) => (
            <Link key={item.id} href={item.linked_thread_id ? `/connect/${item.linked_thread_id}` : '/notifications'} className="block rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <StatusBadge value={item.notification_type.replaceAll('_', ' ')} />
                  <h2 className="mt-3 text-lg font-black tracking-[-0.03em] text-slate-950">{item.title}</h2>
                  {item.body ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p> : null}
                </div>
                <StatusBadge value={item.read_at ? 'read' : 'unread'} />
              </div>
            </Link>
          ))}
          {!notifications.length ? <EmptyState title="No notifications returned" description="There are no schema-backed notifications for your user at the moment." /> : null}
        </div>
      </Card>
      {operationalItems.length ? (
        <Card>
          <SectionHeader eyebrow="Recording & brief" title="Operational notifications" description="Recording alerts and manager daily brief from metadata-only adapters." />
          <div className="space-y-3">
            {operationalItems.map((item) => (
              <Link key={item.id} href={item.route} className="block rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <StatusBadge value={String(item.type).replaceAll('_', ' ')} />
                    <h2 className="mt-3 text-lg font-black tracking-[-0.03em] text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.safe_summary}</p>
                  </div>
                  <StatusBadge value={item.unread ? 'unread' : 'read'} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
