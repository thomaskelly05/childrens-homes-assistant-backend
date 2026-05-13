import type { OrbBrain, OrbContext, OrbModeDecision, OrbSelectedMode } from './types'

const inspectorRoles = new Set([
  'admin',
  'administrator',
  'super_admin',
  'superadmin',
  'provider_admin',
  'provider',
  'responsible_individual',
  'ri',
  'registered_manager',
  'manager',
  'deputy_manager'
])

const inspectionTerms = ['ofsted', 'sccif', 'reg 44', 'reg44', 'reg 45', 'reg45', 'quality standards', 'inspection', 'evidence gap', 'challenge', 'readiness']
const safeguardingTerms = ['safeguarding', 'incident', 'allegation', 'missing', 'self-harm', 'self harm', 'restraint', 'risk']

function normalise(value?: string | null) {
  return (value || '').trim().toLowerCase().replaceAll('-', '_')
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function assistantModeFor(brain: OrbBrain, message: string, context?: OrbContext): string {
  const workspace = normalise(context?.workspace || context?.route)
  if (brain === 'inspector') {
    if (message.includes('reg 44') || message.includes('reg44')) return 'reg44_action_plan'
    if (message.includes('reg 45') || message.includes('reg45')) return 'reg45_writer'
    if (message.includes('safeguarding')) return 'safeguarding_review'
    if (message.includes('ofsted') || message.includes('sccif') || message.includes('inspection')) return 'ofsted_evidence_pack'
    return 'regulatory_readiness'
  }
  if (message.includes('handover') || workspace.includes('handover')) return 'handover'
  if (message.includes('shift') || workspace.includes('shift')) return 'shift_operations'
  if (message.includes('chronology') || workspace.includes('chronology')) return 'chronology_qna'
  if (message.includes('report') || message.includes('summary')) return 'report_writer'
  if (message.includes('safeguarding')) return 'safeguarding_review'
  return workspace.includes('assistant') ? 'standalone' : 'embedded'
}

export function routeOrbMode(options: {
  message?: string | null
  role?: string | null
  selectedMode?: OrbSelectedMode
  context?: OrbContext
}): OrbModeDecision {
  const message = normalise(options.message)
  const role = normalise(options.role)
  const workspace = normalise(options.context?.workspace || options.context?.route)
  const selectedMode = options.selectedMode || 'auto'
  const safetyFlags: string[] = []
  if (includesAny(message, safeguardingTerms)) safetyFlags.push('safeguarding_sensitive')
  if (workspace.includes('regulatory') || workspace.includes('inspection') || workspace.includes('ofsted')) safetyFlags.push('inspection_context')

  let brain: OrbBrain = 'care_assistant'
  let reason = 'The turn is operational care support or practical recording guidance.'

  if (selectedMode === 'inspector') {
    brain = 'inspector'
    reason = 'Inspector mode was selected.'
  } else if (selectedMode === 'care') {
    brain = 'care_assistant'
    reason = 'Care mode was selected.'
  } else if (includesAny(message, inspectionTerms) && inspectorRoles.has(role)) {
    brain = 'inspector'
    reason = 'The question asks for regulatory or oversight challenge and the role can access that view.'
  } else if ((workspace.includes('regulatory') || workspace.includes('management') || workspace.includes('ofsted')) && inspectorRoles.has(role)) {
    brain = 'inspector'
    reason = 'The current workspace is inspection or management focused.'
  }

  return {
    brain,
    assistant_mode: assistantModeFor(brain, message, options.context),
    reason,
    tone: brain === 'inspector'
      ? 'respectful, evidence-led, regulatory, clear and constructively challenging'
      : 'warm, calm, supportive, professional and operational',
    safety_flags: safetyFlags,
    requires_citations: true,
    requires_confirmation_before_write: true,
    selected_mode: selectedMode
  }
}

