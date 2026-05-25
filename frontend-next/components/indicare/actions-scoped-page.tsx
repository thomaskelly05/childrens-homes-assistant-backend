'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

import { ActionsPanel, EvidenceGapsPanel } from '@/components/indicare/action-evidence-panels'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { ManagementOversightPanel } from '@/components/indicare/workflows/management-oversight-panel'
import { NextBestActions } from '@/components/indicare/workflows/next-best-actions'
import type { CareAction } from '@/lib/evidence/types'
import type { ChronologyEvent } from '@/lib/chronology/types'
import type { OsApiResult } from '@/lib/os-api/types'

function matchesScope(action: CareAction, childId?: number, homeId?: number): boolean {
  if (childId != null) {
    const yp = action.youngPersonId != null ? Number(action.youngPersonId) : null
    return yp === childId
  }
  if (homeId != null) {
    const hid = action.homeId ? Number(action.homeId) : null
    return hid === homeId
  }
  return true
}

export function ActionsScopedPage({
  actionsResult,
  chronologyResult
}: {
  actionsResult: OsApiResult<CareAction[]>
  chronologyResult: OsApiResult<ChronologyEvent[]>
}) {
  const searchParams = useSearchParams()
  const childIdRaw = searchParams.get('child_id')
  const homeIdRaw = searchParams.get('home_id')
  const childId = childIdRaw ? Number(childIdRaw) : undefined
  const homeId = homeIdRaw ? Number(homeIdRaw) : undefined
  const childFilter = childId != null && Number.isFinite(childId) ? childId : undefined
  const homeFilter = homeId != null && Number.isFinite(homeId) ? homeId : undefined

  const allActions = actionsResult.data
  const actions = useMemo(
    () => allActions.filter((action) => matchesScope(action, childFilter, homeFilter)),
    [allActions, childFilter, homeFilter]
  )
  const events = chronologyResult.data

  const openActions = actions.filter((action) => action.status !== 'completed')
  const gaps = actions
    .filter((action) => action.evidenceRequired.length && !action.evidenceIds.length)
    .map((action) => ({
      id: `action-evidence:${action.id}`,
      title: action.title,
      description: `Evidence required: ${action.evidenceRequired.join(', ')}`,
      regulation: action.regulation,
      priority: action.priority,
      youngPersonId: action.youngPersonId,
      homeId: action.homeId,
      sourceEventIds: action.sourceId ? [action.sourceId] : [],
      suggestedAction: 'Attach evidence to the live action record.'
    }))

  const scopeLabel =
    childFilter != null
      ? `Scoped to child ID ${childFilter}`
      : homeFilter != null
        ? `Scoped to home ID ${homeFilter}`
        : 'All permitted actions (open leadership view deliberately)'

  return (
    <div className="space-y-6" data-testid="actions-scoped-page">
      <PageHeader
        eyebrow="Actions"
        title="Care actions and evidence gathering"
        description="Live action register for Reg 44 findings, safeguarding follow-up, LAC review evidence and management oversight."
      />
      <p className="text-sm font-semibold text-slate-600">{scopeLabel}</p>
      <LiveDataStatus result={actionsResult} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Actions" value={actions.length} />
        <StatCard label="Open" value={openActions.length} />
        <StatCard label="Overdue" value={actions.filter((action) => action.status === 'overdue').length} />
        <StatCard label="Evidence required" value={gaps.length} href="/evidence" />
      </section>
      <Card>
        <SectionHeader
          eyebrow="Workflow"
          title="Next best actions"
          description="Cards link to the action, evidence or chronology workflow that should be opened next."
        />
        <NextBestActions actions={actions} gaps={gaps} />
      </Card>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Action register" title="Open and recent actions" />
          <ActionsPanel actions={actions} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Evidence required" title="Gaps linked to actions" />
          <EvidenceGapsPanel gaps={gaps} />
        </Card>
      </section>
      <Card>
        <SectionHeader eyebrow="Management oversight" title="Manager review and sign-off readiness" />
        <ManagementOversightPanel events={events} actions={actions} />
      </Card>
    </div>
  )
}
