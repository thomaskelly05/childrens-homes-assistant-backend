/** ORB Residential privacy, retention and data classification contracts. */

export type OrbDataClassificationLevel = 'green' | 'amber' | 'red'

export type OrbPrivacyRiskLevel = 'low' | 'medium' | 'high'

export type OrbPrivacyRequestType =
  | 'delete-my-orb-data'
  | 'export-my-orb-data'
  | 'privacy-question'
  | 'privacy-concern'

export type OrbPrivacyRequestStatus = 'submitted' | 'reviewing' | 'completed' | 'rejected'

export type OrbPrivacySurface =
  | 'chat'
  | 'voice'
  | 'dictate'
  | 'write'
  | 'export'
  | 'privacy-page'

export type OrbRetentionStatusLabel =
  | 'Active'
  | 'Not stored'
  | 'Stored while session active'
  | 'Retention controls being finalised'
  | 'Available on request'
  | 'Not yet self-service'
  | 'Manual review'

export type OrbDataCategory = {
  id: string
  name: string
  description: string
  examples: string[]
  stored: boolean
  storageLocation: string
  mayContainChildData: boolean
  retentionPeriod: string
  deletionAvailable: boolean
  exportAvailable: boolean
  riskLevel: OrbPrivacyRiskLevel
  classification: OrbDataClassificationLevel
  userGuidance: string
}

export type OrbPrivacyNoticeSection = {
  id: string
  title: string
  body: string[]
}

export type OrbPrivacyNotice = {
  id: string
  title: string
  summary: string
  sections: OrbPrivacyNoticeSection[]
  lastUpdated: string
  version: string
}

export type OrbRetentionPolicySummary = {
  audioRetention: string
  transcriptRetention: string
  draftRetention: string
  savedOutputRetention: string
  telemetryRetention: string
  billingRetention: string
  deletionRequestProcess: string
  exportRequestProcess: string
  limitations: string[]
}

export type OrbPrivacyRequest = {
  id: string
  userId?: number
  requestType: OrbPrivacyRequestType
  summary: string
  status: OrbPrivacyRequestStatus
  createdAt: string
  updatedAt: string
  reviewedBy?: string
  reviewNotes?: string
}

export type OrbRetentionStatusItem = {
  id: string
  label: string
  status: OrbRetentionStatusLabel
  detail: string
}

export type OrbDataClassificationGuidance = {
  green: { label: string; summary: string; examples: string[] }
  amber: { label: string; summary: string; examples: string[] }
  red: { label: string; summary: string; examples: string[] }
  behaviourIsCommunication: string
  childVoiceCentral: string
  professionalJudgement: string
}

export type OrbClassificationAssessment = {
  level: OrbDataClassificationLevel
  warnings: string[]
  guidance: string
  shouldWarn: boolean
}
