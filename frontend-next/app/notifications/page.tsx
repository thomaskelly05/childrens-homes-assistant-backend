import Link from 'next/link'

import { OperationalNotificationsSection } from '@/components/connect/operational-notifications-section'
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
  const opUnread = operational.data.unread_count ?? operational.data.unread ?? 0
  const unread = notifications.filter((item) => !item.read_at).length + opUnread

  const recordingItems = operationalItems.filter(
    (i) => i.category === 'recording' || String(i.source).includes('recording')
  )
  const isnItems = operationalItems.filter((i) => i.category === 'safeguarding_network' || i.source === 'isn')
  const briefItems = operationalItems.filter((i) => i.category === 'daily_brief' || i.type === 'manager_daily_brief_reminder')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notification centre"
        description="Connect notifications and operational OS attention items for your current scope."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/notifications/settings"
          data-testid="notifications-settings-link"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-50"
        >
          Notification settings
        </Link>
        <Link
          href="/notifications/settings#escalation"
          data-testid="notifications-escalation-check-link"
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-violet-800 hover:bg-violet-100"
        >
          Run escalation check
        </Link>
      </div>
      {Number(operational.data.metadata?.hidden_by_preferences || 0) > 0 ? (
        <p className="text-sm font-semibold text-slate-600" data-testid="notifications-hidden-by-preferences">
          {Number(operational.data.metadata?.hidden_by_preferences)} operational item(s) hidden by your notification
          preferences. Urgent safeguarding items remain visible.
        </p>
      ) : null}
      <p className="text-xs text-amber-800" data-testid="notifications-urgent-override-copy">
        Urgent safeguarding and high-risk ISN notifications always remain visible, even if categories are muted.
      </p>
      <LiveDataStatus result={result} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unread" value={unread} detail="Connect + operational unread" href="/notifications" entity={{ entity_type: 'notification' }} />
        <StatCard label="Operational" value={operationalItems.length} detail="Recording, ISN, brief, review, actions" href="/notifications" entity={{ entity_type: 'notification' }} />
        <StatCard label="Recording" value={recordingItems.length} detail="Recording alert notifications" href="/record/alerts" entity={{ entity_type: 'notification' }} />
        <StatCard label="Safeguarding network" value={isnItems.length} detail="ISN metadata notifications" href="/safeguarding" entity={{ entity_type: 'notification' }} />
      </section>

      <OperationalNotificationsSection items={operationalItems} privacyNotice={operational.data.privacy_notice} />

      {briefItems.length ? (
        <Card>
          <SectionHeader eyebrow="Briefing" title="Manager daily brief" description="Daily brief reminder in the operational feed." />
          <div className="space-y-2">
            {briefItems.map((item) => (
              <Link key={item.id} href={item.route} className="block rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-semibold text-blue-900">
                {item.title} — {item.safe_summary}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <SectionHeader eyebrow="Connect" title="Connect & schema notifications" />
        <div className="space-y-3">
          {notifications.map((item) => (
            <Link
              key={item.id}
              href={item.linked_thread_id ? `/connect/${item.linked_thread_id}` : '/notifications'}
              className="block rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg"
            >
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
          {!notifications.length ? (
            <EmptyState title="No Connect notifications" description="There are no schema-backed Connect notifications for your user at the moment." />
          ) : null}
        </div>
      </Card>
    </div>
  )
}
