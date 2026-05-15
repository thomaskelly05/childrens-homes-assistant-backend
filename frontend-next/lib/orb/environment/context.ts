export type OrbEnvironmentMode =
  | 'general'
  | 'recording'
  | 'handover'
  | 'night_shift'
  | 'safeguarding'
  | 'inspection'
  | 'manager_review'
  | 'document_writing'
  | 'crisis_escalation'
  | 'child_present'
  | 'quiet_hours'
  | 'mobile'

export type OrbEnvironmentSettings = {
  tone: string
  responseLength: 'very_short' | 'short' | 'concise'
  voicePacing: 'slow' | 'steady' | 'measured'
  captionPrivacy: 'standard' | 'sensitive'
  motionIntensity: 'minimal' | 'soft' | 'ambient' | 'amber_edge'
  retrievalPriority: string
  evidencePosture: 'balanced' | 'review_required'
}

export function orbEnvironmentSettings(mode: OrbEnvironmentMode = 'general'): OrbEnvironmentSettings {
  const sensitive = ['safeguarding', 'crisis_escalation', 'child_present'].includes(mode)
  if (mode === 'crisis_escalation') {
    return { tone: 'clear', responseLength: 'very_short', voicePacing: 'measured', captionPrivacy: 'sensitive', motionIntensity: 'minimal', retrievalPriority: 'safeguarding', evidencePosture: 'review_required' }
  }
  if (mode === 'night_shift' || mode === 'quiet_hours' || mode === 'child_present') {
    return { tone: 'low stimulation', responseLength: 'short', voicePacing: 'slow', captionPrivacy: sensitive ? 'sensitive' : 'standard', motionIntensity: 'soft', retrievalPriority: 'handover', evidencePosture: sensitive ? 'review_required' : 'balanced' }
  }
  if (mode === 'safeguarding' || mode === 'inspection' || mode === 'manager_review') {
    return { tone: 'evidence-led', responseLength: 'concise', voicePacing: 'measured', captionPrivacy: sensitive ? 'sensitive' : 'standard', motionIntensity: mode === 'safeguarding' ? 'amber_edge' : 'ambient', retrievalPriority: 'citations', evidencePosture: 'review_required' }
  }
  return { tone: 'calm', responseLength: 'concise', voicePacing: 'steady', captionPrivacy: 'standard', motionIntensity: 'ambient', retrievalPriority: 'balanced', evidencePosture: 'balanced' }
}

