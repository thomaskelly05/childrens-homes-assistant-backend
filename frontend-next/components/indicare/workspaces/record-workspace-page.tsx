import { Card, SectionHeader } from '@/components/indicare/ui'
import { getLifecycleState, lifecycleTabsFor } from '@/lib/lifecycle/selectors'
import type { LifecycleEntityType } from '@/lib/lifecycle/types'

import { FullScreenWorkspace } from './full-screen-workspace'
import { WorkspaceActionsPanel } from './workspace-actions-panel'
import { WorkspaceCitationsPanel } from './workspace-citations-panel'
import { WorkspaceEvidencePanel } from './workspace-evidence-panel'
import { WorkspaceHeader } from './workspace-header'
import { WorkspaceLifecyclePanel } from './workspace-lifecycle-panel'
import { WorkspaceSidePanel } from './workspace-side-panel'
import { WorkspaceTabs } from './workspace-tabs'
import { WorkspaceTimeline } from './workspace-timeline'

type WorkspaceRecord = {
  id: string
  title: string
  description?: string
  status?: string
  sourceType?: string
  sourceId?: string
  [key: string]: unknown
}

export function RecordWorkspacePage({
  entityType,
  record,
  backHref,
  chronology = [],
  actions = [],
  evidence = []
}: {
  entityType: LifecycleEntityType
  record: WorkspaceRecord
  backHref: string
  chronology?: Parameters<typeof WorkspaceTimeline>[0]['events']
  actions?: Parameters<typeof WorkspaceActionsPanel>[0]['actions']
  evidence?: Parameters<typeof WorkspaceEvidencePanel>[0]['evidence']
}) {
  const lifecycle = getLifecycleState(entityType, record.id, record)
  const tabs = lifecycleTabsFor(entityType)

  return (
    <FullScreenWorkspace
      eyebrow={`${entityType.replaceAll('_', ' ')} workspace`}
      title={record.title}
      description={record.description || 'Schema-backed workspace showing source record context, lifecycle, evidence, actions and citations.'}
      backHref={backHref}
      sidePanel={
        <>
          <WorkspaceSidePanel title="Lifecycle">
            <WorkspaceLifecyclePanel state={lifecycle} />
          </WorkspaceSidePanel>
          <WorkspaceSidePanel title="Actions">
            <WorkspaceActionsPanel actions={actions} />
          </WorkspaceSidePanel>
          <WorkspaceSidePanel title="Evidence">
            <WorkspaceEvidencePanel evidence={evidence} />
          </WorkspaceSidePanel>
          <WorkspaceSidePanel title="Citations">
            <WorkspaceCitationsPanel events={chronology} />
          </WorkspaceSidePanel>
        </>
      }
    >
      <div className="space-y-5">
        <WorkspaceHeader title={record.title} status={lifecycle.status} context={record.description} />
        <WorkspaceTabs tabs={tabs} />
        <Card>
          <SectionHeader eyebrow="Source record" title="Record details" description="This workspace uses the live source record where available and keeps original source type/source id visible for traceability." />
          <dl className="grid gap-3 md:grid-cols-2">
            {Object.entries(record).filter(([, value]) => value !== undefined && typeof value !== 'object').slice(0, 16).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{key.replaceAll(/[_-]/g, ' ')}</dt>
                <dd className="mt-2 text-sm font-bold leading-6 text-slate-700">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <SectionHeader eyebrow="Chronology" title="Linked chronology" />
          <WorkspaceTimeline events={chronology} />
        </Card>
      </div>
    </FullScreenWorkspace>
  )
}

