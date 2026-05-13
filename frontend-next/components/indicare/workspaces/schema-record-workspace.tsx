import { getOsAction } from '@/lib/os-api/actions'
import { getOsChronology } from '@/lib/os-api/chronology'
import { getOsDocument } from '@/lib/os-api/documents'
import { getOsEvidence, getOsEvidenceItem } from '@/lib/os-api/evidence'
import { getOsReport } from '@/lib/os-api/reports'
import { getOsActions } from '@/lib/os-api/actions'
import type { LifecycleEntityType } from '@/lib/lifecycle/types'

import { RecordWorkspacePage } from './record-workspace-page'

const SOURCE_BY_ENTITY: Partial<Record<LifecycleEntityType, string>> = {
  daily_record: 'daily_log',
  incident: 'incident',
  safeguarding: 'safeguarding',
  risk_assessment: 'risk_assessment',
  medication: 'medication',
  health: 'health',
  keywork: 'keywork',
  appointment: 'appointment'
}

export async function SchemaRecordWorkspace({
  entityType,
  id,
  backHref
}: {
  entityType: LifecycleEntityType
  id: string
  backHref: string
}) {
  const [chronologyResult, actionsResult, evidenceResult] = await Promise.all([
    getOsChronology({ sourceType: SOURCE_BY_ENTITY[entityType] as never }),
    getOsActions(),
    getOsEvidence()
  ])

  let record: Record<string, unknown> | undefined
  if (entityType === 'action') {
    record = (await getOsAction(id)).data
  } else if (entityType === 'evidence') {
    record = (await getOsEvidenceItem(id)).data
  } else if (entityType === 'document' || entityType === 'reg44') {
    record = (await getOsDocument(id)).data
  } else if (entityType === 'report' || entityType === 'reg45' || entityType === 'lac_review') {
    record = (await getOsReport(id)).data
  } else {
    record = chronologyResult.data.find((event) => event.sourceId === id || event.id === `${SOURCE_BY_ENTITY[entityType]}:${id}` || event.id === id)
  }

  const sourceType = SOURCE_BY_ENTITY[entityType] || entityType
  const chronology = chronologyResult.data.filter((event) => event.sourceId === id || event.id === id || event.sourceType === sourceType)
  const actions = actionsResult.data.filter((action) => action.sourceId === id || action.id === id)
  const evidence = evidenceResult.data.filter((item) => item.sourceId === id || item.id === id)
  const fallbackTitle = `${entityType.replaceAll('_', ' ')} ${id}`

  return (
    <RecordWorkspacePage
      entityType={entityType}
      backHref={backHref}
      record={{
        id,
        title: String(record?.title || record?.displayName || fallbackTitle),
        description: String(record?.description || record?.summary || record?.body || 'Live source record workspace.'),
        status: String(record?.status || 'draft'),
        sourceType,
        sourceId: id,
        ...record
      }}
      chronology={chronology}
      actions={actions}
      evidence={evidence}
    />
  )
}

