'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { SectionHeader, StatusBadge } from '@/components/indicare/ui'
import {
  applyOperationalNotificationAction,
  categoryLabel,
  markAllOperationalNotificationsRead,
  type OsNotificationItem
} from '@/lib/os-api/notifications'

type Props = {
  items: OsNotificationItem[]
  privacyNotice?: string
}

function itemKey(item: OsNotificationItem) {
  return item.notification_key || item.id
}

export function OperationalNotificationsSection({ items, privacyNotice }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function runAction(item: OsNotificationItem, action: 'mark_read' | 'acknowledge' | 'resolve' | 'archive') {
    setBusy(itemKey(item))
    try {
      await applyOperationalNotificationAction(itemKey(item), {
        action,
        metadata: { item_type: item.type, category: item.category }
      })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function markAll() {
    setBusy('all')
    try {
      await markAllOperationalNotificationsRead()
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (!items.length) return null

  return (
    <section data-testid="operational-notifications-section" className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          eyebrow="Operational"
          title="Operational notifications"
          description="Recording alerts, safeguarding network, daily brief, reviews and governance — metadata summaries only."
        />
        <button
          type="button"
          data-testid="notifications-mark-all-read"
          disabled={busy === 'all'}
          onClick={() => void markAll()}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600 hover:bg-slate-50"
        >
          Mark all read
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500" data-testid="operational-notifications-safety-note">
        Operational notifications use safe summaries and do not show full care record or safeguarding narratives.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article
            key={itemKey(item)}
            data-testid={`operational-notification-${item.type}`}
            className="rounded-[24px] border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={categoryLabel(item.category)} />
                  <StatusBadge value={item.severity} />
                  <StatusBadge value={item.unread ? 'unread' : 'read'} />
                </div>
                <h2 className="mt-3 text-lg font-black tracking-[-0.03em] text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600" data-testid="operational-notification-safe-summary">
                  {item.safe_summary}
                </p>
              </div>
              <Link
                href={item.route}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
              >
                Open
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.unread ? (
                <button
                  type="button"
                  data-testid="operational-notification-mark-read"
                  disabled={busy === itemKey(item)}
                  onClick={() => void runAction(item, 'mark_read')}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase text-slate-600"
                >
                  Mark read
                </button>
              ) : null}
              <button
                type="button"
                data-testid="operational-notification-acknowledge"
                disabled={busy === itemKey(item)}
                onClick={() => void runAction(item, 'acknowledge')}
                className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase text-slate-600"
              >
                Acknowledge
              </button>
              <button
                type="button"
                data-testid="operational-notification-resolve"
                disabled={busy === itemKey(item)}
                onClick={() => void runAction(item, 'resolve')}
                className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase text-slate-600"
              >
                Resolve
              </button>
              <button
                type="button"
                data-testid="operational-notification-archive"
                disabled={busy === itemKey(item)}
                onClick={() => void runAction(item, 'archive')}
                className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase text-slate-600"
              >
                Archive
              </button>
            </div>
          </article>
        ))}
      </div>
      {privacyNotice ? <p className="mt-4 text-xs text-slate-400">{privacyNotice}</p> : null}
    </section>
  )
}
