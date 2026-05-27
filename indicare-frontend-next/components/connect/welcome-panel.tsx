'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { MeToday } from '@/lib/os-api/connect'

const e2eUiMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1' && process.env.NODE_ENV !== 'production'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function WelcomePanel() {
  const [today, setToday] = useState<MeToday | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const key = `indicare-welcome-dismissed-${new Date().toISOString().slice(0, 10)}`
    if (window.localStorage.getItem(key) === '1') return
    if (e2eUiMode) {
      setToday({
        adult: { id: 0, name: 'there', preferred_name: 'there' },
        home: null,
        provider: null,
        handover: { items: [], summary: { total: 0, urgent: 0, children_needing_attention: 0, unacknowledged: 0 } },
        connect: { count: 0, threads: [] },
        notifications: { unread: 0, items: [] },
        tasks_due_today: [],
        key_children: [],
        recent_activity: [],
        dashboard_preferences: {}
      })
      setVisible(true)
      return
    }
    let active = true
    async function load() {
      try {
        const response = await fetch('/api/me/today', { credentials: 'include' })
        if (!response.ok) return
        const payload = await response.json()
        if (active) {
          setToday(payload)
          setVisible(true)
        }
      } catch {
        setVisible(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  if (!visible || !today) return null

  function dismiss() {
    const key = `indicare-welcome-dismissed-${new Date().toISOString().slice(0, 10)}`
    window.localStorage.setItem(key, '1')
    setVisible(false)
  }

  const name = today.adult.preferred_name || today.adult.name || 'there'
  const homeName = today.home?.name || 'your home'
  const handoverCount = today.handover?.summary?.total || 0
  const connectCount = today.connect?.count || 0
  const notificationCount = today.notifications?.unread || 0

  return (
    <section className="mb-6 rounded-[34px] border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-white p-5 shadow-2xl shadow-blue-950/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Welcome back</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">{greeting()}, {name}. Here&apos;s what matters at {homeName} today.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">This panel only shows live data returned by the backend. Empty counts mean nothing has been returned for your current scope.</p>
        </div>
        <button type="button" onClick={dismiss} className="rounded-2xl border border-blue-100 bg-white p-3 text-slate-500" aria-label="Dismiss welcome">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Link href="/handover/current" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-white">
          <strong className="block text-2xl font-black text-slate-950">{handoverCount}</strong>
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Handover items</span>
        </Link>
        <Link href="/connect" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-white">
          <strong className="block text-2xl font-black text-slate-950">{connectCount}</strong>
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Unread Connect</span>
        </Link>
        <Link href="/notifications" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-white">
          <strong className="block text-2xl font-black text-slate-950">{notificationCount}</strong>
          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notifications</span>
        </Link>
        <Link href="/profile" className="rounded-2xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/20">
          <strong className="block text-sm font-black">Open my profile</strong>
          <span className="mt-1 block text-xs font-bold text-white/70">Preferences, strengths and profile photo</span>
        </Link>
      </div>
    </section>
  )
}
