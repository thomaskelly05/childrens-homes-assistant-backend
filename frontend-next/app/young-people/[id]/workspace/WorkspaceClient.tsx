'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { MobileSafeLink } from '@/components/indicare/mobile/mobile-safe-link'
import { ItemDrawer } from '@/components/os/item-drawer'
import { ManagerActionButtons } from '@/components/os/manager-action-buttons'
import { OpenableItemCard } from '@/components/os/openable-item-card'
import { OrbPanel } from '@/components/os/orb-panel'
import { OsEmptyState } from '@/components/os/empty-state'
import { RecordExtraFields } from '@/components/os/record-extra-fields'
import { Section } from '@/components/os/section'
import { StatusChip, riskTone } from '@/components/os/status-chip'
import { ChildAboutCard } from '@/components/young-people/workspace/child-about-card'
import { ChildPlansDocumentsCard } from '@/components/young-people/workspace/child-plans-documents-card'
import { ChildProfileHero } from '@/components/young-people/workspace/child-profile-hero'
import { ChildRecordingSelectorCard } from '@/components/young-people/workspace/child-recording-selector-card'
import { ChildSupportCard } from '@/components/young-people/workspace/child-support-card'
import { ChildTodayCard } from '@/components/young-people/workspace/child-today-card'
import { ChildVoiceCard } from '@/components/young-people/workspace/child-voice-card'
import { ChildWhatMattersCard } from '@/components/young-people/workspace/child-what-matters-card'
import { ChildWorkspaceAvatar } from '@/components/young-people/workspace/child-workspace-avatar'
import {
  loadChildWorkspaceConvergence,
  type SchemaReadinessSummary,
  type WorkspaceItemCard
} from '@/lib/childWorkspaceApi'
import { CHILD_JOURNEY_GROUPS, type ChildJourneyGroupId } from '@/lib/oneJourneyOs'
import type { OsApiResult } from '@/lib/os-api/types'
import type { ChildWorkspaceOverviewViewModel } from '@/lib/young-people/child-workspace-normaliser'
import { childCarePlanningHref, childDocumentsHref, childOrbHref, childRecordHref } from '@/lib/navigation/scope-routes'

type BundleMap = Record<string, WorkspaceItemCard[]>

function viewItemsToCards(
  rows: Array<{ id: string; title: string; status?: string; summary?: string; when?: string; priority?: string; href?: string }>,
  type: string
): WorkspaceItemCard[] {
  return rows.map((row) => ({
    id: row.id,
    type,
    title: row.title,
    summary: row.summary || '',
    status: row.status || '',
    date: row.when || '',
    priority: row.priority || '',
    href: row.href
  }))
}

export function WorkspaceClient({
  view,
  workspaceResult,
  profileResult,
  homeId
}: {
  view: ChildWorkspaceOverviewViewModel
  workspaceResult?: OsApiResult<unknown>
  profileResult?: OsApiResult<unknown>
  homeId?: number | null
}) {
  const childId = view.child.id
  const childName = view.child.preferredName || view.child.displayName
  const [activeGroup, setActiveGroup] = useState<ChildJourneyGroupId>('today')
  const [selectedItem, setSelectedItem] = useState<WorkspaceItemCard | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bundles, setBundles] = useState<BundleMap>({})
  const [schemaStatus, setSchemaStatus] = useState<SchemaReadinessSummary | null>(null)
  const [convergenceLoading, setConvergenceLoading] = useState(true)
  const [sourcesOpen, setSourcesOpen] = useState(false)

  const loadConvergence = useCallback(async () => {
    setConvergenceLoading(true)
    try {
      const result = await loadChildWorkspaceConvergence(childId, homeId ?? undefined)
      setBundles({
        records: result.bundles.records,
        reviews: result.bundles.reviews,
        plans: result.bundles.plans,
        alerts: result.bundles.alerts,
        appointments: result.bundles.appointments,
        documents: result.bundles.documents,
        compliance: result.bundles.compliance,
        standards: result.bundles.standards,
        reports: result.bundles.reports,
        calendar: result.bundles.calendar,
        lifeEcho: result.bundles.lifeEcho,
        handover: result.bundles.handover,
        childVoice: viewItemsToCards(
          view.childVoice.map((v) => ({ id: v.id, title: v.label, summary: v.excerpt, when: v.when })),
          'Child voice'
        ),
        schemaStatus: []
      })
      setSchemaStatus(result.bundles.schemaStatus)
    } catch {
      setBundles({
        records: viewItemsToCards(view.today.recentItems, 'Record'),
        plans: view.plans.map((p) => ({
          id: p.id,
          type: p.type,
          title: p.title,
          summary: '',
          status: p.status,
          date: '',
          priority: '',
          href: p.href
        })),
        alerts: viewItemsToCards(
          view.actions.map((a) => ({ id: a.id, title: a.title, status: a.status, when: a.dueDate, priority: a.priority })),
          'Action'
        ),
        documents: view.documents.map((d) => ({
          id: d.id,
          type: d.type,
          title: d.title,
          summary: '',
          status: d.status,
          date: '',
          priority: '',
          href: d.href
        })),
        childVoice: viewItemsToCards(
          view.childVoice.map((v) => ({ id: v.id, title: v.label, summary: v.excerpt, when: v.when })),
          'Child voice'
        )
      })
    } finally {
      setConvergenceLoading(false)
    }
  }, [childId, homeId, view])

  useEffect(() => {
    void loadConvergence()
  }, [loadConvergence])

  const groupItems = useMemo(() => {
    const group = CHILD_JOURNEY_GROUPS.find((g) => g.id === activeGroup)
    if (!group) return [] as WorkspaceItemCard[]
    const items: WorkspaceItemCard[] = []
    for (const key of group.dataKeys) {
      const rows = bundles[key]
      if (rows?.length) items.push(...rows)
    }
    if (activeGroup === 'today') {
      items.push(
        ...viewItemsToCards(
          view.actions.map((a) => ({ id: a.id, title: a.title, status: a.status, when: a.dueDate, priority: a.priority })),
          'Action'
        )
      )
    }
    if (activeGroup === 'documents' && view.documents.length) {
      for (const doc of view.documents) {
        if (!items.some((i) => i.id === doc.id)) {
          items.push({
            id: doc.id,
            type: doc.type,
            title: doc.title,
            summary: '',
            status: doc.status,
            date: '',
            priority: '',
            href: doc.href
          })
        }
      }
    }
    const seen = new Set<string>()
    return items.filter((item) => {
      const key = `${item.type}:${item.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [activeGroup, bundles, view])

  function openItem(item: WorkspaceItemCard) {
    setSelectedItem(item)
    setDrawerOpen(true)
  }

  const schema = schemaStatus

  return (
    <div data-testid="child-workspace-client" className="mobile-child-workspace space-y-5 md:space-y-6">
      {workspaceResult ? <LiveDataStatus result={workspaceResult as OsApiResult<Record<string, unknown>>} /> : null}
      {profileResult && profileResult !== workspaceResult ? (
        <LiveDataStatus result={profileResult as OsApiResult<Record<string, unknown>>} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5 md:space-y-6">
          <ChildProfileHero view={view} />

          <section
            data-testid="child-workspace-primary-actions"
            className="flex flex-wrap gap-2 rounded-[24px] border border-slate-100 bg-white/90 p-4"
          >
            <MobileSafeLink
              href={childRecordHref(childId)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white sm:flex-none"
            >
              Add record
            </MobileSafeLink>
            <MobileSafeLink
              href={childOrbHref(childId)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-black text-sky-800 sm:flex-none"
            >
              Ask ORB
            </MobileSafeLink>
            <MobileSafeLink
              href={childCarePlanningHref(childId)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800 sm:flex-none"
            >
              View plan
            </MobileSafeLink>
            <MobileSafeLink
              href={childDocumentsHref(childId)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800 sm:flex-none"
            >
              View documents
            </MobileSafeLink>
          </section>

          <Section
            eyebrow="Today around this child"
            title="What needs attention now"
            description="Urgent actions, compliance, voice and the next meaningful step — without overwhelming detail."
            testId="child-workspace-today-band"
          >
            <ChildTodayCard view={view} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ChildVoiceCard view={view} />
              <article className="rounded-[24px] border border-slate-100 bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Current state</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusChip label={view.child.placementStatus || 'Placement not recorded'} tone="blue" />
                  <StatusChip label={`Risk: ${view.child.riskLevel}`} tone={riskTone(view.child.riskLevel)} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{view.safeguarding.summary}</p>
              </article>
            </div>
          </Section>

          <Section
            eyebrow="What helps me"
            title="Communication and support"
            description="Keep the child’s voice and preferences visible before recording."
            testId="child-workspace-support-band"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ChildWhatMattersCard view={view} />
              <ChildSupportCard view={view} />
              <ChildAboutCard view={view} />
            </div>
          </Section>

          <section data-testid="child-workspace-journey-nav" className="space-y-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">Child journey</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 md:text-2xl">Explore their journey</h2>
              <p className="mt-2 text-sm text-slate-600">Grouped areas — open any item for source detail and manager actions.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Child journey groups">
              {CHILD_JOURNEY_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={activeGroup === group.id}
                  data-testid={`child-journey-group-${group.id}`}
                  onClick={() => setActiveGroup(group.id)}
                  className={`min-h-10 rounded-2xl px-3 py-2 text-xs font-black transition ${
                    activeGroup === group.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-200'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>

            {activeGroup === 'record' ? (
              <div className="mt-2">
                <ChildRecordingSelectorCard childId={childId} />
              </div>
            ) : null}

            {activeGroup === 'plans-risk' ? (
              <div className="mt-2">
                <ChildPlansDocumentsCard view={view} />
              </div>
            ) : null}

            {activeGroup === 'database' && schema ? (
              <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">System readiness</p>
                <p className="mt-2 text-lg font-black text-slate-950">{schema.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{schema.detail}</p>
                <Link href={schema.href} className="mt-4 inline-flex text-sm font-black text-sky-700">
                  Open schema status →
                </Link>
              </article>
            ) : null}

            {convergenceLoading && activeGroup !== 'record' && activeGroup !== 'database' ? (
              <p className="text-sm font-semibold text-slate-500">Loading live items…</p>
            ) : null}

            {!convergenceLoading && groupItems.length ? (
              <div className="grid gap-3">
                {groupItems.slice(0, 12).map((item) => (
                  <OpenableItemCard key={`${item.type}-${item.id}`} item={item} onOpen={openItem} />
                ))}
              </div>
            ) : null}

            {!convergenceLoading && !groupItems.length && activeGroup !== 'record' && activeGroup !== 'database' ? (
              <OsEmptyState
                title="Nothing to show in this area yet"
                description="When records exist for this child, they will appear here with clear source information."
              />
            ) : null}
          </section>

          <button
            type="button"
            onClick={() => setSourcesOpen((v) => !v)}
            className="w-full rounded-[24px] border border-dashed border-slate-200 bg-white/70 px-5 py-4 text-left text-sm font-black text-slate-700"
            data-testid="child-workspace-apps-toggle"
          >
            {sourcesOpen ? 'Hide' : 'Show'} connected apps & sources
          </button>
          {sourcesOpen ? (
            <div className="flex flex-wrap gap-2">
              {[
                'Documents',
                'Plans',
                'Risk',
                'Daily Notes',
                'Incidents',
                'Safeguarding',
                'Keywork',
                'Health',
                'Education',
                'Family',
                'Appointments',
                'Handover',
                'Calendar',
                'Reports',
                'Compliance',
                'Standards',
                'Chronology',
                'Connect',
                'ORB',
                'Schema'
              ].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="hidden space-y-4 xl:block">
          <div className="sticky top-4 space-y-4">
            <OrbPanel childId={childId} childName={childName} />
            <article className="rounded-[24px] border border-slate-100 bg-white p-4 text-center">
              <ChildWorkspaceAvatar
                photo=""
                displayName={childName}
                initials={(childName.slice(0, 2) || 'YP').toUpperCase()}
              />
              <p className="mt-3 text-sm font-bold text-slate-700">ORB stays beside the record — ask when you need inspector or manager support.</p>
            </article>
          </div>
        </aside>
      </div>

      <div className="xl:hidden">
        <OrbPanel childId={childId} childName={childName} />
      </div>

      <ItemDrawer
        item={selectedItem}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        footer={
          selectedItem ? (
            <div className="space-y-4">
              <RecordExtraFields item={selectedItem} />
              <ManagerActionButtons childId={childId} recordId={selectedItem.id} />
              {selectedItem.href ? (
                <Link href={selectedItem.href} className="inline-flex min-h-10 items-center text-sm font-black text-sky-700">
                  Open full record →
                </Link>
              ) : null}
            </div>
          ) : null
        }
      />
    </div>
  )
}
