export const DATA_CLASSIFICATIONS = [
  'public_system',
  'internal_operational',
  'confidential_staff',
  'confidential_child',
  'safeguarding_sensitive',
  'health_sensitive',
  'education_sensitive',
  'legal_regulatory',
  'highly_sensitive',
  'ai_restricted',
  'export_restricted'
] as const

export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number]

const documentTypeClassifications: Record<string, DataClassification> = {
  reg44_report: 'legal_regulatory',
  reg45_report: 'legal_regulatory',
  care_plan: 'confidential_child',
  placement_plan: 'confidential_child',
  risk_assessment: 'safeguarding_sensitive',
  health_plan: 'health_sensitive',
  medication: 'health_sensitive',
  education_plan: 'education_sensitive',
  staff_supervision: 'confidential_staff',
  assistant_transcript: 'ai_restricted'
}

const recordTypeClassifications: Record<string, DataClassification> = {
  young_person_profile: 'confidential_child',
  daily_note: 'confidential_child',
  daily_notes: 'confidential_child',
  safeguarding: 'safeguarding_sensitive',
  incident: 'safeguarding_sensitive',
  health: 'health_sensitive',
  medication: 'health_sensitive',
  education: 'education_sensitive',
  staff_record: 'confidential_staff',
  reg44: 'legal_regulatory',
  reg45: 'legal_regulatory',
  document: 'export_restricted',
  assistant_transcript: 'ai_restricted'
}

function normaliseKey(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

export function classifyDocumentType(documentType: string | null | undefined): DataClassification {
  return documentTypeClassifications[normaliseKey(documentType)] || 'confidential_child'
}

export function classifyRecordType(recordType: string | null | undefined): DataClassification {
  return recordTypeClassifications[normaliseKey(recordType)] || 'internal_operational'
}

export function isSensitiveClassification(classification: DataClassification) {
  return !['public_system', 'internal_operational'].includes(classification)
}

export function requiresAIGuardrails(classification: DataClassification) {
  return ['safeguarding_sensitive', 'health_sensitive', 'highly_sensitive', 'ai_restricted'].includes(classification)
}

export function requiresExportControls(classification: DataClassification) {
  return ['safeguarding_sensitive', 'health_sensitive', 'legal_regulatory', 'highly_sensitive', 'export_restricted'].includes(classification)
}
