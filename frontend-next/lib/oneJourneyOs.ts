/** Grouped child journey navigation — maps UI sections to workspace data keys. */

export type ChildJourneyGroupId =
  | 'today'
  | 'record'
  | 'journey'
  | 'plans-risk'
  | 'health-education'
  | 'people-contact'
  | 'documents'
  | 'reviews-compliance'
  | 'standards-inspection'
  | 'lifeecho'
  | 'database'

export type ChildJourneyGroup = {
  id: ChildJourneyGroupId
  label: string
  description: string
  dataKeys: string[]
}

export const CHILD_JOURNEY_GROUPS: ChildJourneyGroup[] = [
  {
    id: 'today',
    label: 'Today',
    description: 'Urgent actions, notifications, compliance due, appointments and child voice.',
    dataKeys: ['alerts', 'appointments', 'childVoice', 'compliance', 'handover']
  },
  {
    id: 'record',
    label: 'Record',
    description: 'Daily notes, incidents, safeguarding and recording surfaces.',
    dataKeys: ['records', 'reviews']
  },
  {
    id: 'journey',
    label: 'Journey',
    description: 'Chronology, story, archive and journey picture.',
    dataKeys: ['records', 'reports', 'calendar']
  },
  {
    id: 'plans-risk',
    label: 'Plans & Risk',
    description: 'Care plans, risk assessments and plan impacts.',
    dataKeys: ['plans', 'alerts']
  },
  {
    id: 'health-education',
    label: 'Health & Education',
    description: 'Health, medication, education and family time.',
    dataKeys: ['appointments', 'records']
  },
  {
    id: 'people-contact',
    label: 'People & Contact',
    description: 'Keywork, handover, family and professional contacts.',
    dataKeys: ['handover', 'appointments']
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Statutory documents, plans on file and generated reports.',
    dataKeys: ['documents', 'plans']
  },
  {
    id: 'reviews-compliance',
    label: 'Reviews & Compliance',
    description: 'Reviews, compliance due dates and manager actions.',
    dataKeys: ['compliance', 'reviews', 'alerts']
  },
  {
    id: 'standards-inspection',
    label: 'Standards & Inspection',
    description: 'Quality Standards evidence and inspection readiness.',
    dataKeys: ['standards', 'reports']
  },
  {
    id: 'lifeecho',
    label: 'LifeEcho',
    description: 'Memories, voice and what matters over time.',
    dataKeys: ['lifeEcho', 'childVoice']
  },
  {
    id: 'database',
    label: 'Database',
    description: 'System readiness and connected data sources.',
    dataKeys: ['schemaStatus']
  }
]

export const OS_HOME_SUPPORT_LINKS = [
  { label: 'Notifications', href: '/notifications', testId: 'os-home-notifications' },
  { label: 'Connect', href: '/connect', testId: 'os-home-connect' },
  { label: 'Manager brief', href: '/command-centre/briefing', testId: 'os-home-manager-brief' },
  { label: 'Inspection readiness', href: '/intelligence/inspection-readiness', testId: 'os-home-inspection' },
  { label: 'Schema status', href: '/schema-live', testId: 'os-home-schema' }
] as const
