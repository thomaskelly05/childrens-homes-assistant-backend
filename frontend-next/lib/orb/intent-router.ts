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
const currentTerms = ['weather', 'forecast', 'sport', 'sports', 'score', 'fixture', 'played last week', 'newcastle', 'news', 'latest', 'price', 'schedule', 'today']
const productivityTerms = ['email', 'write an email', 'draft an email', 'plan my day', 'to-do', 'todo', 'agenda', 'summarise this', 'rewrite', 'professional', 'calculate']
const careTerms = ['young person', 'child', 'resident', 'chronology', 'daily note', 'daily log', 'incident', 'safeguarding', 'missing episode', 'restraint', 'keywork', 'family time', 'placement', 'risk assessment', 'care plan', 'lac review', 'handover', 'last 7 days', 'last seven days', 'records', 'recording']
const voiceTerms = ['dictate', 'voice note', 'record this', 'create a daily note', 'create daily note', 'create an incident', 'create incident', 'create safeguarding', 'write a record', 'start recording', 'transcribe']
const reportTerms = ['report', 'reg 45 section', 'reg45 section', 'lac review draft', 'handover summary', 'quality of care']

function normalise(value?: string | null) {
  return (value || '').trim().toLowerCase().replaceAll('-', '_')
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function hasChildContext(context?: OrbContext) {
  return Boolean(context?.selected_young_person_id || context?.selected_record_id || context?.selected_record_type || Object.keys(context?.current_child || {}).length)
}

function assistantModeFor(brain: OrbBrain, message: string, context?: OrbContext): string {
  const workspace = normalise(context?.workspace || context?.route)
  if (brain === 'inspector_brain') {
    if (message.includes('reg 44') || message.includes('reg44')) return 'reg44_action_plan'
    if (message.includes('reg 45') || message.includes('reg45')) return 'reg45_writer'
    if (message.includes('safeguarding')) return 'safeguarding_review'
    if (message.includes('ofsted') || message.includes('sccif') || message.includes('inspection')) return 'ofsted_evidence_pack'
    return 'regulatory_readiness'
  }
  if (brain === 'report_writer_brain') return message.includes('lac') ? 'lac_review_writer' : 'report_writer'
  if (brain === 'voice_recording_brain') return message.includes('handover') ? 'handover' : 'shift_operations'
  if (brain === 'web_research_brain') return 'web_research'
  if (brain === 'productivity_brain') return 'productivity'
  if (brain === 'general_assistant_brain') return 'general'
  if (message.includes('handover') || workspace.includes('handover')) return 'handover'
  if (message.includes('shift') || workspace.includes('shift')) return 'shift_operations'
  if (message.includes('chronology') || workspace.includes('chronology')) return 'chronology_qna'
  if (message.includes('report') || message.includes('summary')) return 'report_writer'
  if (message.includes('safeguarding')) return 'safeguarding_review'
  return workspace.includes('assistant') ? 'standalone' : 'embedded'
}

function toolCategoriesFor(brain: OrbBrain) {
  if (brain === 'web_research_brain') return ['web_search', 'weather', 'sports', 'news']
  if (brain === 'productivity_brain') return ['writing', 'planning', 'summarising', 'calculations']
  if (brain === 'general_assistant_brain') return ['general_qna']
  if (brain === 'inspector_brain') return ['care_records', 'citations', 'sccif', 'quality_standards', 'inspection_challenge']
  if (brain === 'report_writer_brain') return ['care_records', 'citations', 'report_writer', 'pending_draft']
  if (brain === 'voice_recording_brain') return ['care_records', 'voice_recording', 'pending_draft', 'citations']
  return ['care_records', 'citations', 'evidence_gaps']
}

export function routeOrbIntent(options: {
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

  const asksCare = hasChildContext(options.context) || includesAny(message, careTerms) || ['shift_operations', 'chronology', 'young_person', 'handover', 'safeguarding'].includes(workspace)
  const asksInspection = includesAny(message, inspectionTerms)
  const asksCurrent = includesAny(message, currentTerms)
  const asksProductivity = includesAny(message, productivityTerms)
  const asksVoice = includesAny(message, voiceTerms)
  const asksReport = includesAny(message, reportTerms)

  let brain: OrbBrain = 'general_assistant_brain'
  let reason = 'The turn is an everyday assistant question and does not need IndiCare record retrieval.'

  if (selectedMode === 'inspector') {
    brain = 'inspector_brain'
    reason = 'Inspector mode was selected.'
  } else if (selectedMode === 'care') {
    brain = 'care_brain'
    reason = 'Care mode was selected.'
  } else if (selectedMode === 'general') {
    brain = 'general_assistant_brain'
    reason = 'General assistant mode was selected.'
  } else if (asksInspection && inspectorRoles.has(role)) {
    brain = 'inspector_brain'
    reason = 'The question asks for regulatory or oversight challenge and the role can access that view.'
  } else if (asksInspection) {
    brain = 'care_brain'
    reason = 'Inspection access is permission-limited, so Orb will answer through care-safe guidance.'
    safetyFlags.push('inspector_permission_limited')
  } else if (asksVoice) {
    brain = 'voice_recording_brain'
    reason = 'The turn asks Orb to capture or draft a care record by voice.'
  } else if (asksReport && asksCare) {
    brain = 'report_writer_brain'
    reason = 'The turn asks for a care/report draft and must use citable IndiCare evidence.'
  } else if (asksCurrent) {
    brain = 'web_research_brain'
    reason = 'The turn asks for current/live facts and needs configured tools/search.'
  } else if (asksProductivity) {
    brain = 'productivity_brain'
    reason = 'The turn asks for writing, planning, summarising or calculation support.'
  } else if (asksCare) {
    brain = 'care_brain'
    reason = 'The turn is operational care support or asks about permitted IndiCare records.'
  }

  const careScopeRequired = ['care_brain', 'inspector_brain', 'report_writer_brain', 'voice_recording_brain'].includes(brain)
  return {
    brain,
    assistant_mode: assistantModeFor(brain, message, options.context),
    reason,
    tone: brain === 'inspector_brain'
      ? 'respectful, evidence-led, regulatory, clear and constructively challenging'
      : brain === 'web_research_brain'
        ? 'careful, current-facts-first, transparent about tool availability'
        : brain === 'productivity_brain'
          ? 'practical, organised, concise and helpful'
          : brain === 'general_assistant_brain'
            ? 'warm, concise, capable and everyday-useful'
            : 'warm, calm, supportive, professional and operational',
    safety_flags: safetyFlags,
    requires_citations: careScopeRequired,
    requires_confirmation_before_write: careScopeRequired,
    requires_external_tool: brain === 'web_research_brain',
    allow_general_knowledge: ['general_assistant_brain', 'web_research_brain', 'productivity_brain'].includes(brain),
    care_scope_required: careScopeRequired,
    tool_categories: toolCategoriesFor(brain),
    memory_updates: {},
    selected_mode: selectedMode
  }
}

