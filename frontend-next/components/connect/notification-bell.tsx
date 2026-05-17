'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'

export function NotificationBell() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [connectResponse, notificationResponse] = await Promise.all([
          fetch('/api/connect/unread', { credentials: 'include' }),
          fetch('/api/notifications?unread_only=true&limit=20', { credentials: 'include' })
        ])
        const connect = connectResponse.ok ? await connectResponse.json() : { count: 0 }
        const notifications = notificationResponse.ok ? await notificationResponse.json() : { unread: 0 }
        if (active) setCount(Number(connect.count || 0) + Number(notifications.unread || 0))
      } catch {
        if (active) setCount(0)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  return (
    <Link href="/notifications" className="relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-sm" aria-label="Notifications">
      <Bell className="h-5 w-5" aria-hidden />
      {count ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-blue-600 px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-lg shadow-blue-500/30">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}
