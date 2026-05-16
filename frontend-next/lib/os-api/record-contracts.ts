export type RecordContract = {
  type: string
  apiEndpoint: string
  createEndpoint: string
  updateEndpoint: (id: string) => string
  primaryDateField: string
  displayLabel: string
  pluralLabel: string
  icon: string
  chronologyRelevant: boolean
  safeguardingRelevant: boolean
  metadataExtraction: boolean
  inspectionRelevant: boolean
  workflowState: boolean
  allowedActions: string[]
  requiredFields: string[]
  requiresYoungPersonId: boolean
  requiresHomeId: boolean
  emptyState: string
  refreshEvents: string[]
}

const workspaceEndpoint = (recordType: string) => `/workspace-records/${recordType}`

export const recordContracts: Record<string, RecordContract> = {
  daily_note: {
    type: 'daily_note',
    apiEndpoint: workspaceEndpoint('daily'),
    createEndpoint: workspaceEndpoint('daily'),
    updateEndpoint: (id) => `${workspaceEndpoint('daily')}/${encodeURIComponent(id)}`,
    primaryDateField: 'note_date',
    displayLabel: 'Daily note',
    pluralLabel: 'Daily notes',
    icon: 'clipboard',
    chronologyRelevant: true,
    safeguardingRelevant: false,
    metadataExtraction: true,
    inspectionRelevant: true,
    workflowState: true,
    allowedActions: ['create', 'update', 'submit', 'review'],
    requiredFields: ['young_person_id', 'home_id', 'content'],
    requiresYoungPersonId: true,
    requiresHomeId: true,
    emptyState: 'No daily notes are recorded for this child yet.',
    refreshEvents: ['record:saved', 'chronology:refresh', 'assistant-context:refresh', 'command-centre:refresh']
  },
  incident: {
    type: 'incident',
    apiEndpoint: workspaceEndpoint('incident'),
    createEndpoint: workspaceEndpoint('incident'),
    updateEndpoint: (id) => `${workspaceEndpoint('incident')}/${encodeURIComponent(id)}`,
    primaryDateField: 'occurred_at',
    displayLabel: 'Incident',
    pluralLabel: 'Incidents',
    icon: 'shield',
    chronologyRelevant: true,
    safeguardingRelevant: true,
    metadataExtraction: true,
    inspectionRelevant: true,
    workflowState: true,
    allowedActions: ['create', 'update', 'submit', 'review', 'archive'],
    requiredFields: ['young_person_id', 'home_id', 'occurred_at', 'summary'],
    requiresYoungPersonId: true,
    requiresHomeId: true,
    emptyState: 'No incidents are recorded for this child yet.',
    refreshEvents: ['record:saved', 'chronology:refresh', 'safeguarding:refresh', 'inspection:refresh', 'assistant-context:refresh', 'command-centre:refresh']
  },
  safeguarding: {
    type: 'safeguarding',
    apiEndpoint: workspaceEndpoint('safeguarding'),
    createEndpoint: workspaceEndpoint('safeguarding'),
    updateEndpoint: (id) => `${workspaceEndpoint('safeguarding')}/${encodeURIComponent(id)}`,
    primaryDateField: 'reported_at',
    displayLabel: 'Safeguarding concern',
    pluralLabel: 'Safeguarding concerns',
    icon: 'shield-check',
    chronologyRelevant: true,
    safeguardingRelevant: true,
    metadataExtraction: true,
    inspectionRelevant: true,
    workflowState: true,
    allowedActions: ['create', 'update', 'submit', 'review', 'escalate'],
    requiredFields: ['young_person_id', 'home_id', 'concern', 'immediate_action'],
    requiresYoungPersonId: true,
    requiresHomeId: true,
    emptyState: 'No safeguarding concerns are recorded for this child yet.',
    refreshEvents: ['record:saved', 'chronology:refresh', 'safeguarding:refresh', 'inspection:refresh', 'assistant-context:refresh', 'command-centre:refresh']
  },
  missing_episode: {
    type: 'missing_episode',
    apiEndpoint: workspaceEndpoint('missing'),
    createEndpoint: workspaceEndpoint('missing'),
    updateEndpoint: (id) => `${workspaceEndpoint('missing')}/${encodeURIComponent(id)}`,
    primaryDateField: 'missing_from',
    displayLabel: 'Missing episode',
    pluralLabel: 'Missing episodes',
    icon: 'map',
    chronologyRelevant: true,
    safeguardingRelevant: true,
    metadataExtraction: true,
    inspectionRelevant: true,
    workflowState: true,
    allowedActions: ['create', 'update', 'submit', 'review'],
    requiredFields: ['young_person_id', 'home_id', 'missing_from', 'actions_taken'],
    requiresYoungPersonId: true,
    requiresHomeId: true,
    emptyState: 'No missing episodes are recorded for this child yet.',
    refreshEvents: ['record:saved', 'chronology:refresh', 'safeguarding:refresh', 'assistant-context:refresh', 'command-centre:refresh']
  },
  document: {
    type: 'document',
    apiEndpoint: '/os/documents',
    createEndpoint: '/os/documents/upload',
    updateEndpoint: (id) => `/os/documents/${encodeURIComponent(id)}`,
    primaryDateField: 'uploaded_at',
    displayLabel: 'Document',
    pluralLabel: 'Documents',
    icon: 'file-text',
    chronologyRelevant: true,
    safeguardingRelevant: false,
    metadataExtraction: true,
    inspectionRelevant: true,
    workflowState: true,
    allowedActions: ['upload', 'review', 'sign_off', 'archive'],
    requiredFields: ['home_id', 'document_type'],
    requiresYoungPersonId: false,
    requiresHomeId: true,
    emptyState: 'No documents match this scope yet.',
    refreshEvents: ['record:saved', 'documents:refresh', 'evidence:refresh', 'inspection:refresh', 'command-centre:refresh']
  },
  action: {
    type: 'action',
    apiEndpoint: '/os/actions',
    createEndpoint: '/os/actions',
    updateEndpoint: (id) => `/os/actions/${encodeURIComponent(id)}`,
    primaryDateField: 'due_date',
    displayLabel: 'Action',
    pluralLabel: 'Actions',
    icon: 'check-circle',
    chronologyRelevant: true,
    safeguardingRelevant: false,
    metadataExtraction: false,
    inspectionRelevant: true,
    workflowState: true,
    allowedActions: ['create', 'update', 'complete', 'review'],
    requiredFields: ['title', 'home_id'],
    requiresYoungPersonId: false,
    requiresHomeId: true,
    emptyState: 'No actions match this scope yet.',
    refreshEvents: ['record:saved', 'actions:refresh', 'chronology:refresh', 'inspection:refresh', 'command-centre:refresh']
  },
  evidence: {
    type: 'evidence',
    apiEndpoint: '/os/evidence',
    createEndpoint: '/os/evidence/attach',
    updateEndpoint: (id) => `/os/evidence/${encodeURIComponent(id)}`,
    primaryDateField: 'created_at',
    displayLabel: 'Evidence item',
    pluralLabel: 'Evidence items',
    icon: 'link',
    chronologyRelevant: true,
    safeguardingRelevant: false,
    metadataExtraction: false,
    inspectionRelevant: true,
    workflowState: false,
    allowedActions: ['attach', 'review'],
    requiredFields: ['source_type', 'source_id'],
    requiresYoungPersonId: false,
    requiresHomeId: false,
    emptyState: 'No evidence links have been created yet.',
    refreshEvents: ['record:saved', 'evidence:refresh', 'inspection:refresh', 'command-centre:refresh']
  }
}

export function getRecordContract(type: string) {
  return recordContracts[type] || recordContracts[type.replace('-', '_')]
}

export function requireRecordContract(type: string) {
  const contract = getRecordContract(type)
  if (!contract) throw new Error(`No record contract registered for ${type}`)
  return contract
}
