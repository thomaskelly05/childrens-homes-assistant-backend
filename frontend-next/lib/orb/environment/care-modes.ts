import { orbEnvironmentSettings, type OrbEnvironmentMode } from './context'

export type OrbCareEnvironmentMode =
  | 'child_nearby'
  | 'office'
  | 'staff_meeting'
  | 'safeguarding_discussion'
  | 'quiet_hours'
  | 'mobile_use'
  | 'crisis_escalation'
  | 'inspection_preparation'
  | 'handover'
  | 'recording'
  | 'document_writing'

const careModeMap: Record<OrbCareEnvironmentMode, OrbEnvironmentMode> = {
  child_nearby: 'child_present',
  office: 'general',
  staff_meeting: 'manager_review',
  safeguarding_discussion: 'safeguarding',
  quiet_hours: 'quiet_hours',
  mobile_use: 'mobile',
  crisis_escalation: 'crisis_escalation',
  inspection_preparation: 'inspection',
  handover: 'handover',
  recording: 'recording',
  document_writing: 'document_writing'
}

export function settingsForCareMode(mode: OrbCareEnvironmentMode) {
  return { careMode: mode, environmentMode: careModeMap[mode], ...orbEnvironmentSettings(careModeMap[mode]) }
}

