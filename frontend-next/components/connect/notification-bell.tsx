'use client'

import Link from 'next/link'
import { Bell, MoreHorizontal } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  applyOperationalNotificationAction,
  categoryLabel,
  getOperationalNotificationFeed,
  markAllOperationalNotificationsRead,
  type OsNotificationFeed,
  type OsNotificationItem
} from '@/lib/os-api/notifications'
import { setOperationalShellCounts } from '@/lib/os-operational-counts'
import { fetchWithOsCache, invalidateOsRequestCache, osRequestCacheKey } from '@/lib/os-request-cache'

const e2eUiMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production'

function severityClass(severity: OsNotificationItem['severity']) {
  if (severity === 'urgent' || severity === 'high') return 'bg-red-50 text-red-800 border-red-100'
  if (severity === 'medium') return 'bg-amber-50 text-amber-900 border-amber-100'
  return 'bg-slate-50 text-slate-700 border-slate-100'
}

function itemKey(item: OsNotificationItem) {
  return item.notification_key || item.id
}

export function NotificationBell() {
  const [connectCount, setConnectCount] = useState(0)
  const [feed, setFeed] = useState<OsNotificationFeed | null>(null)
  const [open, setOpen] = useState(false)
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const loadFeed = useCallback(async () => {
    if (e2eUiMode) {
      setConnectCount(0)
      setFeed(null)
      return
    }
    try {
      const feedKey = osRequestCacheKey({ feed: 'operational', unread: true, limit: 20 })
      const [connectResponse, schemaResponse, operational] = await Promise.all([
        fetchWithOsCache('connect:unread', async () => {
          const response = await fetch('/api/connect/unread', { credentials: 'include' })
          return response.ok ? response.json() : { count: 0 }
        }, 20000),
        fetchWithOsCache('notifications:schema-unread', async () => {
          const response = await fetch('/api/notifications?unread_only=true&limit=20', { credentials: 'include' })
          return response.ok ? response.json() : { unread: 0 }
        }, 20000),
        fetchWithOsCache(feedKey, () => getOperationalNotificationFeed({ unread_only: true, limit: 20 }), 15000)
      ])
      const connect = connectResponse ?? { count: 0 }
      const notifications = schemaResponse ?? { unread: 0 }
      const operationalUnread = operational.data.unread_count ?? operational.data.unread ?? 0
      setFeed(operational.data)
      setOperationalShellCounts({
        recordingOpen: operational.data.recording_count ?? operational.data.recording_alert_count ?? 0,
        recordingUrgent: operational.data.urgent_count ?? operational.data.urgent ?? 0,
        feedUnread: operationalUnread
      })
      setConnectCount(Number(connect.count || 0) + Number(notifications.unread || 0) + operationalUnread)
    } catch {
      setConnectCount(0)
      setFeed(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      if (!active) return
      await loadFeed()
    }
    void load()
    const interval = setInterval(() => void load(), 60000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadFeed])

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setMenuKey(null)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  async function runAction(item: OsNotificationItem, action: 'mark_read' | 'acknowledge' | 'resolve' | 'archive') {
    const key = itemKey(item)
    setBusyKey(key)
    try {
      await applyOperationalNotificationAction(key, {
        action,
        metadata: { item_type: item.type, category: item.category }
      })
      invalidateOsRequestCache('feed:operational')
      invalidateOsRequestCache('notification:')
      await loadFeed()
    } finally {
      setBusyKey(null)
      setMenuKey(null)
    }
  }

  async function markAllRead() {
    setBusyKey('all')
    try {
      await markAllOperationalNotificationsRead()
      await loadFeed()
    } finally {
      setBusyKey(null)
    }
  }

  const totalCount = connectCount
  const urgentCount = feed?.urgent_count ?? feed?.urgent ?? 0
  const items = feed?.items?.slice(0, 8) || []

  return (
    <div ref={rootRef} className="relative" data-testid="notification-bell">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative min-h-11 min-w-11 rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        aria-label={totalCount ? `Notifications, ${totalCount} unread${urgentCount ? `, ${urgentCount} urgent` : ''}` : 'Notifications, none unread'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {totalCount ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-lg shadow-blue-500/30">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        ) : null}
        {urgentCount ? (
          <span
            data-testid="notification-bell-urgent-count"
            className="absolute -bottom-1 -right-1 rounded-full bg-red-600 px-1 text-[9px] font-black text-white"
          >
            {urgentCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          data-testid="notification-bell-panel"
          className="absolute right-0 z-50 mt-2 max-h-[min(80vh,32rem)] w-[min(100vw-2rem,22rem)] overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/15 sm:right-0"
          role="dialog"
          aria-label="Notifications panel"
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notifications</p>
            <div className="flex items-center gap-2">
              {items.some((i) => i.unread) ? (
                <button
                  type="button"
                  data-testid="notification-bell-mark-all-read"
                  disabled={busyKey === 'all'}
                  onClick={() => void markAllRead()}
                  className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 hover:text-blue-700"
                >
                  Mark all read
                </button>
              ) : null}
              <Link
                href="/notifications"
                className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700"
                onClick={() => setOpen(false)}
              >
                Centre
              </Link>
            </div>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {items.length ? (
              items.map((item) => {
                const key = itemKey(item)
                const showMenu = menuKey === key
                return (
                  <div
                    key={key}
                    className={`relative rounded-2xl border px-3 py-2.5 ${severityClass(item.severity)} ${item.unread ? '' : 'opacity-80'}`}
                    data-testid={`notification-bell-item-${item.type}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link href={item.route} className="min-w-0 flex-1" onClick={() => setOpen(false)}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]">
                            {categoryLabel(item.category)}
                          </span>
                          {item.unread ? (
                            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                              Unread
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs font-black">{item.title}</p>
                        <p
                          className="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 opacity-90"
                          data-testid="notification-bell-safe-summary"
                        >
                          {item.safe_summary}
                        </p>
                        {item.action_label ? (
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                            {item.action_label}
                          </p>
                        ) : null}
                      </Link>
                      <button
                        type="button"
                        aria-label="Notification actions"
                        className="rounded-lg p-1 opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setMenuKey(showMenu ? null : key)
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    {showMenu ? (
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-black/5 pt-2">
                        {item.unread ? (
                          <button
                            type="button"
                            data-testid="notification-bell-mark-read"
                            disabled={busyKey === key}
                            className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-black uppercase"
                            onClick={() => void runAction(item, 'mark_read')}
                          >
                            Mark read
                          </button>
                        ) : null}
                        <button
                          type="button"
                          data-testid="notification-bell-acknowledge"
                          disabled={busyKey === key}
                          className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-black uppercase"
                          onClick={() => void runAction(item, 'acknowledge')}
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          data-testid="notification-bell-resolve"
                          disabled={busyKey === key}
                          className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-black uppercase"
                          onClick={() => void runAction(item, 'resolve')}
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          data-testid="notification-bell-archive"
                          disabled={busyKey === key}
                          className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-black uppercase"
                          onClick={() => void runAction(item, 'archive')}
                        >
                          Archive
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-xs font-semibold text-slate-500">
                No operational notifications in scope.
              </p>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
            <Link
              href="/record/alerts"
              data-testid="notification-bell-recording-alerts-link"
              className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-800"
              onClick={() => setOpen(false)}
            >
              Recording
            </Link>
            <Link
              href="/command-centre/briefing"
              data-testid="notification-bell-daily-brief-link"
              className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-800"
              onClick={() => setOpen(false)}
            >
              Daily brief
            </Link>
            <Link
              href="/safeguarding"
              data-testid="notification-bell-isn-safeguarding-link"
              className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-800"
              onClick={() => setOpen(false)}
            >
              Safeguarding network
            </Link>
          </div>
          {feed?.privacy_notice ? (
            <p className="mt-2 px-1 text-[10px] font-semibold leading-4 text-slate-400">{feed.privacy_notice}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
