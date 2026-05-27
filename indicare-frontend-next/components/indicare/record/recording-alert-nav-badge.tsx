'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { getRecordingAlertBadgeSummary, type RecordingAlertBadgeSummary } from '@/lib/os-api/recording-alerts'
import {
  APPSHELL_RECORDING_BADGE_DEDUPE,
  badgeFromShellCounts,
  getOperationalShellCounts
} from '@/lib/os-operational-counts'
import { fetchWithOsCache, osRequestCacheKey } from '@/lib/os-request-cache'

const MANAGER_ROLES = new Set([
  'manager',
  'registered_manager',
  'deputy',
  'deputy_manager',
  'senior',
  'senior_practitioner',
  'senior_worker',
  'responsible_individual',
  'admin',
  'provider'
])

function isManagerRole(role?: string) {
  if (!role) return false
  const normalised = role.toLowerCase()
  return MANAGER_ROLES.has(normalised) || normalised.includes('manager') || normalised.includes('senior')
}

function badgeToneClass(tone: RecordingAlertBadgeSummary['tone']) {
  if (tone === 'urgent') return 'bg-rose-500 text-white'
  if (tone === 'attention') return 'bg-amber-400 text-slate-950'
  return 'bg-slate-500/80 text-white'
}

export function RecordingAlertNavBadge({ role }: { role?: string }) {
  const [badge, setBadge] = useState<RecordingAlertBadgeSummary | null>(null)

  useEffect(() => {
    if (!isManagerRole(role)) return
    let cancelled = false
    const shellBadge = badgeFromShellCounts(role)
    if (shellBadge && Date.now() - getOperationalShellCounts().updatedAt < 20000) {
      setBadge(shellBadge)
      return
    }
    if (APPSHELL_RECORDING_BADGE_DEDUPE && getOperationalShellCounts().updatedAt > 0) {
      return
    }
    const key = osRequestCacheKey({ badge: 'recording', role })
    void fetchWithOsCache(key, () => getRecordingAlertBadgeSummary(), 20000).then((result) => {
      if (cancelled) return
      if (result.ok && (result.data.total_open > 0 || result.data.urgent > 0)) {
        setBadge(result.data)
      }
    })
    return () => {
      cancelled = true
    }
  }, [role])

  if (!isManagerRole(role) || !badge) return null

  const count = badge.urgent > 0 ? badge.urgent : badge.total_open
  if (count <= 0) return null

  return (
    <Link
      href={badge.route}
      data-testid="recording-alert-nav-badge"
      aria-label={badge.label}
      title={badge.label}
      className={`ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${badgeToneClass(badge.tone)}`}
    >
      {count}
    </Link>
  )
}

export function RecordingAlertTopPill({ role }: { role?: string }) {
  const [badge, setBadge] = useState<RecordingAlertBadgeSummary | null>(null)

  useEffect(() => {
    if (!isManagerRole(role)) return
    let cancelled = false
    const shellBadge = badgeFromShellCounts(role)
    if (shellBadge && shellBadge.total_open > 0 && Date.now() - getOperationalShellCounts().updatedAt < 20000) {
      setBadge(shellBadge)
      return
    }
    if (APPSHELL_RECORDING_BADGE_DEDUPE && getOperationalShellCounts().updatedAt > 0) {
      return
    }
    const key = osRequestCacheKey({ badge: 'recording-top', role })
    void fetchWithOsCache(key, () => getRecordingAlertBadgeSummary(), 20000).then((result) => {
      if (cancelled) return
      if (result.ok && result.data.total_open > 0) setBadge(result.data)
    })
    return () => {
      cancelled = true
    }
  }, [role])

  if (!isManagerRole(role) || !badge || badge.total_open <= 0) return null

  return (
    <Link
      href={badge.route}
      data-testid="recording-alert-top-pill"
      className="hidden rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-950 shadow-sm transition hover:bg-rose-100 md:inline-flex"
    >
      {badge.urgent > 0 ? `${badge.urgent} urgent` : `${badge.total_open} alerts`}
    </Link>
  )
}
