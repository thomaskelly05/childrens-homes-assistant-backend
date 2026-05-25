'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { getOperationalNotificationFeed, type OsNotificationFeed, type OsNotificationItem } from '@/lib/os-api/notifications'

const e2eUiMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production'

function severityClass(severity: OsNotificationItem['severity']) {
  if (severity === 'urgent' || severity === 'high') return 'bg-red-50 text-red-800 border-red-100'
  if (severity === 'medium') return 'bg-amber-50 text-amber-900 border-amber-100'
  return 'bg-slate-50 text-slate-700 border-slate-100'
}

export function NotificationBell() {
  const [connectCount, setConnectCount] = useState(0)
  const [feed, setFeed] = useState<OsNotificationFeed | null>(null)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (e2eUiMode) {
      setConnectCount(0)
      setFeed(null)
      return
    }
    let active = true
    async function load() {
      try {
        const [connectResponse, schemaResponse, operational] = await Promise.all([
          fetch('/api/connect/unread', { credentials: 'include' }),
          fetch('/api/notifications?unread_only=true&limit=20', { credentials: 'include' }),
          getOperationalNotificationFeed({ unread_only: true, limit: 20 })
        ])
        const connect = connectResponse.ok ? await connectResponse.json() : { count: 0 }
        const notifications = schemaResponse.ok ? await schemaResponse.json() : { unread: 0 }
        const operationalUnread = operational.data.unread || 0
        if (active) {
          setFeed(operational.data)
          setConnectCount(
            Number(connect.count || 0) + Number(notifications.unread || 0) + operationalUnread
          )
        }
      } catch {
        if (active) {
          setConnectCount(0)
          setFeed(null)
        }
      }
    }
    void load()
    const interval = setInterval(() => void load(), 60000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const totalCount = connectCount
  const urgentCount = feed?.urgent || 0
  const items = feed?.items?.slice(0, 8) || []

  return (
    <div ref={rootRef} className="relative" data-testid="notification-bell">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm"
        aria-label="Notifications"
        aria-expanded={open}
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
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/15"
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notifications</p>
            <Link
              href="/notifications"
              className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700"
              onClick={() => setOpen(false)}
            >
              Centre
            </Link>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.route}
                  data-testid={`notification-bell-item-${item.type}`}
                  className={`block rounded-2xl border px-3 py-2.5 transition hover:shadow-md ${severityClass(item.severity)}`}
                  onClick={() => setOpen(false)}
                >
                  <p className="text-xs font-black">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 opacity-90" data-testid="notification-bell-safe-summary">
                    {item.safe_summary}
                  </p>
                  {item.action_label ? (
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">{item.action_label}</p>
                  ) : null}
                </Link>
              ))
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
              Recording alerts
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
