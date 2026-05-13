export type EntityRouteInput = {
  entity_type?: string
  entity_id?: string | number | null
  linked_child_id?: string | number | null
  source_type?: string
  source_id?: string | number | null
  route?: string | null
}

export type EntityType = string
export type ResolvableEntity = EntityRouteInput

export type EntityAction = {
  id: string
  label: string
  route: string
}

export type EntityLinkSummary = {
  title: string
  description: string
  link: {
    label: string
    route: string
  }
}

export type EntityPathContext = {
  selected_record_type?: string
  selected_record_id?: string
}

const routeByType: Record<string, string> = {
  young_person: '/young-people',
  child: '/young-people',
  daily_log: '/daily-logs',
  daily_record: '/daily-logs',
  daily_note: '/daily-logs',
  incident: '/incidents',
  safeguarding: '/safeguarding',
  safeguarding_concern: '/safeguarding',
  risk: '/risk-assessments',
  risk_assessment: '/risk-assessments',
  medication: '/medication',
  medication_record: '/medication',
  keywork: '/keywork',
  appointment: '/appointments',
  report: '/reports',
  lac_review: '/reports',
  document: '/documents',
  evidence: '/evidence',
  action: '/actions',
  qa_review: '/management',
  notification: '/notifications',
  chronology: '/chronology',
  handover: '/handover/current',
  shift: '/shifts/current',
  staff: '/staff',
  staff_record: '/staff',
  regulatory_reference: '/regulatory'
}

function normalise(value?: string | null) {
  return (value || '').trim().toLowerCase().replaceAll('-', '_')
}

export function normalizeEntityType(value?: string | null): EntityType {
  const type = normalise(value)
  if (type === 'child') return 'young_person'
  if (type === 'daily_note') return 'daily_log'
  if (type === 'chronology_event') return 'chronology'
  if (type === 'safeguarding_record') return 'safeguarding_concern'
  return type || 'record'
}

function entityType(entity: EntityRouteInput) {
  return normalizeEntityType(entity.entity_type || entity.source_type || 'record')
}

function entityId(entity: EntityRouteInput) {
  const value = entity.entity_id ?? entity.source_id
  return value === undefined || value === null || value === '' ? undefined : String(value)
}

export function getEntityRoute(entity: EntityRouteInput, view?: 'workspace' | 'chronology' | 'evidence' | 'actions' | string): string {
  if (view === 'chronology') return entity.linked_child_id ? `/young-people/${encodeURIComponent(String(entity.linked_child_id))}/chronology` : '/chronology'
  if (view === 'evidence') return '/evidence'
  if (view === 'actions') return '/actions'
  if (entity.route) return entity.route
  const type = entityType(entity)
  const id = entityId(entity)
  const base = routeByType[type] || `/${type.replaceAll('_', '-')}`
  if (!id) return base
  if (type === 'handover' || type === 'shift' || type === 'regulatory_reference') return base
  return `${base}/${encodeURIComponent(id)}`
}

export function resolveCitationRoute(citation: { source_type?: string; source_id?: string | number; route?: string | null }) {
  return getEntityRoute({
    entity_type: citation.source_type,
    entity_id: citation.source_id,
    route: citation.route
  })
}

export function getEntityActions(entity: EntityRouteInput): EntityAction[] {
  const type = entityType(entity)
  const route = getEntityRoute(entity)
  const actions: EntityAction[] = [
    { id: 'workspace', label: 'Open workspace', route },
    { id: 'chronology', label: 'Linked chronology', route: '/chronology' },
    { id: 'evidence', label: 'Evidence', route: '/evidence' },
    { id: 'actions', label: 'Actions', route: '/actions' }
  ]
  if (['incident', 'safeguarding', 'safeguarding_concern', 'risk', 'risk_assessment'].includes(type)) {
    actions.push({ id: 'management', label: 'Manager review', route: '/management' })
  }
  if (['report', 'lac_review', 'regulatory_reference', 'evidence'].includes(type)) {
    actions.push({ id: 'regulatory', label: 'Regulatory view', route: '/regulatory' })
  }
  return actions
}

export function entityLinkSummary(entity: EntityRouteInput): EntityLinkSummary {
  const type = entityType(entity).replaceAll('_', ' ')
  const route = getEntityRoute(entity)
  return {
    title: `${type.charAt(0).toUpperCase()}${type.slice(1)} context`,
    description: 'Linked operational context, chronology, evidence and actions are available for this record.',
    link: {
      label: type,
      route
    }
  }
}

export function parseEntityFromPath(pathname: string): ResolvableEntity | null {
  const parts = pathname.split('/').filter(Boolean)
  if (!parts.length) return null
  const [section, id] = parts
  const typeBySection: Record<string, string> = {
    'young-people': 'young_person',
    'daily-logs': 'daily_log',
    incidents: 'incident',
    safeguarding: 'safeguarding_concern',
    'risk-assessments': 'risk_assessment',
    medication: 'medication_record',
    keywork: 'keywork',
    appointments: 'appointment',
    reports: 'report',
    documents: 'document',
    evidence: 'evidence',
    actions: 'action',
    chronology: 'chronology',
    handover: 'handover',
    shifts: 'shift',
    staff: 'staff_record',
    regulatory: 'regulatory_reference',
    management: 'qa_review'
  }
  const entity_type = typeBySection[section] || section.replaceAll('-', '_')
  return { entity_type, entity_id: id }
}

export function entityContextFromPath(pathname: string): EntityPathContext | null {
  const entity = parseEntityFromPath(pathname)
  if (!entity) return null
  return {
    selected_record_type: entity.entity_type,
    selected_record_id: entity.entity_id === undefined || entity.entity_id === null ? undefined : String(entity.entity_id)
  }
}

