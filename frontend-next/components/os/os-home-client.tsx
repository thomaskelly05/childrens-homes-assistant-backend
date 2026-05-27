'use client'

import Link from 'next/link'
import { Building2, MessageCircle, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ChildCard, type OsChildCardPerson } from '@/components/os/child-card'
import { OsCard } from '@/components/os/os-card'
import { OsEmptyState } from '@/components/os/empty-state'
import { Section } from '@/components/os/section'
import { StatusChip } from '@/components/os/status-chip'
import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { useAuth } from '@/contexts/auth-context'
import { displayName } from '@/lib/auth/permissions'
import { childWorkspaceHref } from '@/lib/navigation/child-workspace-routes'
import { OS_HOME_SUPPORT_LINKS } from '@/lib/oneJourneyOs'
import { fetchConnectUnreadCount, getOperationalNotificationFeed } from '@/lib/osNotifications'
import { summariseSchemaReadiness, getOsCommandSchemaStatus } from '@/lib/childWorkspaceApi'
import { fetchScopeOptions } from '@/lib/os-scope'
import type { OsPersonSummary } from '@/lib/os-api/workspaces'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  ''
).replace(/\/+$/, '')

function photoUrl(path: unknown) {
  const raw = String(path || '').trim()
  if (!raw || raw === 'null') return ''
  if (raw.startsWith('http') || raw.startsWith('data:')) return raw
  if (raw.startsWith('/') && API_BASE) return `${API_BASE}${raw}`
  return raw.startsWith('/') ? raw : ''
}

function mapServerPerson(person: OsPersonSummary, homeName?: string): OsChildCardPerson {
  return {
    id: String(person.id),
    displayName: String(person.displayName || 'Young person'),
    preferredName: person.preferredName ? String(person.preferredName) : undefined,
    riskLevel: person.riskLevel ? String(person.riskLevel) : undefined,
    placementStatus: person.placementStatus ? String(person.placementStatus) : undefined,
    currentState: person.status ? String(person.status) : person.carePlanning ? String(person.carePlanning) : undefined,
    photoUrl: photoUrl(person.photoUrl || person.profilePhotoPath),
    homeName
  }
}

export function OsHomeClient({ initialPeople }: { initialPeople: OsPersonSummary[] }) {
  const { user } = useAuth()
  const { scope } = useOsScope()
  const [people, setPeople] = useState(initialPeople)
  const [homeName, setHomeName] = useState(scope.selected_home_name || '')
  const [connectUnread, setConnectUnread] = useState(0)
  const [feedUnread, setFeedUnread] = useState(0)
  const [feedUrgent, setFeedUrgent] = useState(0)
  const [schemaLabel, setSchemaLabel] = useState('System readiness')
  const [loadingSupport, setLoadingSupport] = useState(true)

  const activeHomeId = scope.selected_home_id

  const loadHomeChildren = useCallback(async () => {
    try {
      const options = await fetchScopeOptions(activeHomeId ?? undefined)
      const home = options.available_homes.find((h) => h.id === activeHomeId) || options.available_homes[0]
      setHomeName(home?.name || options.selected_home_name || '')
      const children = options.available_children.length
        ? options.available_children
        : options.available_children_for_home || []
      if (children.length) {
        setPeople(
          children.map((child) => ({
            id: String(child.id),
            displayName: child.name,
            preferredName: child.name,
            placementStatus: child.placement_status || undefined,
            riskLevel: undefined,
            status: child.placement_status || undefined
          }))
        )
      }
    } catch {
      // Keep server-provided list on failure.
    }
  }, [activeHomeId])

  const loadSupport = useCallback(async () => {
    setLoadingSupport(true)
    try {
      const [connect, feed, schema] = await Promise.all([
        fetchConnectUnreadCount(),
        getOperationalNotificationFeed({ unread_only: true, limit: 5 }),
        getOsCommandSchemaStatus()
      ])
      setConnectUnread(connect)
      setFeedUnread(feed.data.unread_count ?? feed.data.unread ?? 0)
      setFeedUrgent(feed.data.urgent_count ?? feed.data.urgent ?? 0)
      setSchemaLabel(summariseSchemaReadiness(schema.data).label)
    } catch {
      setConnectUnread(0)
      setFeedUnread(0)
      setFeedUrgent(0)
    } finally {
      setLoadingSupport(false)
    }
  }, [])

  useEffect(() => {
    void loadSupport()
    const interval = setInterval(() => void loadSupport(), 60000)
    return () => clearInterval(interval)
  }, [loadSupport])

  useEffect(() => {
    if (activeHomeId) void loadHomeChildren()
  }, [activeHomeId, loadHomeChildren])

  const adultName = user ? displayName(user) : null
  const mapped = people.map((p) => mapServerPerson(p, homeName || undefined))

  return (
    <main
      data-testid="os-home-page"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_28rem),linear-gradient(180deg,#f8fafc,#eef4ff)] px-4 py-6 md:px-8 md:py-10"
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">IndiCare OS</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950 md:text-5xl">Start with the child</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
            Choose a child in your home to open their profile — their story, plans, voice and records stay at the centre.
            Operational tools support that journey; they do not replace it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {homeName ? <StatusChip label={`Home: ${homeName}`} tone="blue" /> : null}
            {adultName ? <StatusChip label={adultName} tone="slate" /> : null}
            {!homeName ? (
              <Link
                href="/select-scope"
                className="inline-flex min-h-10 items-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-black text-sky-900"
              >
                Choose home
              </Link>
            ) : null}
          </div>
        </header>

        <Section
          eyebrow="Children in this home"
          title="Who are you supporting right now?"
          description="Open a child profile to record, review and understand their journey."
          testId="os-home-children-section"
        >
          {mapped.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {mapped.map((person) => (
                <ChildCard key={person.id} person={person} href={childWorkspaceHref(person.id)} />
              ))}
            </div>
          ) : (
            <OsEmptyState
              title="No children visible yet"
              description="Confirm your home scope or ask an administrator to link you to a home with active placements."
            />
          )}
        </Section>

        <Section
          eyebrow="Adult support"
          title="Connected while you work"
          description="Notifications, Connect and readiness tools stay available without taking over the child journey."
          testId="os-home-support-section"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <OsCard testId="os-home-support-notifications">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Notifications</p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {loadingSupport ? '…' : feedUnread}
                {feedUrgent ? <span className="ml-2 text-sm font-black text-red-600">{feedUrgent} urgent</span> : null}
              </p>
              <Link href="/notifications" className="mt-3 inline-flex text-sm font-black text-sky-700">
                Open feed →
              </Link>
            </OsCard>
            <OsCard testId="os-home-support-connect">
              <div className="flex items-center gap-2 text-slate-700">
                <MessageCircle className="h-4 w-4" aria-hidden />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Connect</p>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-950">{loadingSupport ? '…' : connectUnread} unread</p>
              <Link href="/connect" className="mt-3 inline-flex text-sm font-black text-sky-700">
                Open Connect →
              </Link>
            </OsCard>
            <OsCard testId="os-home-support-schema">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">System readiness</p>
              </div>
              <p className="mt-2 text-lg font-black text-slate-950">{loadingSupport ? '…' : schemaLabel}</p>
              <Link href="/schema-live" className="mt-3 inline-flex text-sm font-black text-sky-700">
                View schema →
              </Link>
            </OsCard>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {OS_HOME_SUPPORT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-testid={link.testId}
                className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800 hover:border-sky-200 hover:text-sky-800"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/select-scope"
              data-testid="os-home-change-scope"
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800"
            >
              <Building2 className="h-4 w-4" aria-hidden />
              Change home
            </Link>
          </div>
        </Section>
      </div>
    </main>
  )
}
