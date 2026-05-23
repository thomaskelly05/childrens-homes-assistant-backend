import type { RecordCardId } from '@/lib/record/recording-hub'
import { childWorkflowHref } from '@/lib/record/recording-hub'
import { RECORDING_CATALOGUE_EXTRA_FORMS } from '@/lib/record/recording-form-catalogue-entries'
import type { RecordingWorkflowStatus } from '@/lib/record/recording-form-catalogue-helpers'

export type { RecordingWorkflowStatus } from '@/lib/record/recording-form-catalogue-helpers'
export {
  workflowStatusBadgeClass,
  workflowStatusLabel,
  workflowStatusMicrocopy
} from '@/lib/record/recording-form-catalogue-helpers'

export type RecordingWorkspaceType =
  | 'daily-note'
  | 'incident'
  | 'child-voice'
  | 'keywork'
  | 'missing'
  | 'family-time'
  | 'health-medication'
  | 'handover'
  | 'evidence-document'
  | 'staff-reflection'
  | 'safeguarding-concern'
  | 'return-conversation'
  | 'physical-intervention'
  | 'injury-body-map'
  | 'medication-note-error'
  | 'manager-review'
  | 'education-note'
  | 'health-appointment'
  | 'behaviour-support'
  | 'complaint-concern'
  | 'room-search'
  | 'damage-repair'
  | 'professional-visit'
  | 'staff-debrief'
  | 'reg44-evidence'
  | 'reg45-evidence'
  | 'general-draft'

export type RecordingFormCategory =
  | 'daily_life'
  | 'voice_direct_work'
  | 'safeguarding_incident'
  | 'missing_return'
  | 'health_medication'
  | 'education_family'
  | 'planning_review'
  | 'manager_governance'
  | 'workforce'
  | 'environment'
  | 'documents_evidence'

export type RecordingFormStatus = 'built' | 'partial' | 'planned'
export type RecordingFormPriority = 'P0' | 'P1' | 'P2'
export type RecordingFormRouteKind = 'ready' | 'existing_workflow' | 'draft_workspace' | 'legacy' | 'ui_card_only'

export type RecordingFormDefinition = {
  id: string
  title: string
  category: RecordingFormCategory
  description: string
  /** Primary navigation route (may be workspace draft). */
  route: string
  workspaceType?: RecordingWorkspaceType
  cardId?: RecordCardId
  workflowSegment?: string
  requiresChild: boolean
  requiresManagerReview: boolean
  safeguardingSensitive: boolean
  privacySensitive: boolean
  suggestedOrbMode?: 'record_quality_review' | 'care-hub' | 'child_journey_summary'
  therapeuticPrompt: string
  qualityChecklist: string[]
  orbSuggestedPrompts: string[]
  tags: string[]
  status: RecordingFormStatus
  priority: RecordingFormPriority
  routeKind: RecordingFormRouteKind
  workflowStatus: RecordingWorkflowStatus
  relatedQualityStandards: string[]
  relatedEvidenceAreas: string[]
  gap?: string
  recommendedNextAction?: string
}

export const RECORDING_FORM_CATEGORIES: Array<{ id: RecordingFormCategory; label: string }> = [
  { id: 'daily_life', label: 'Child daily life' },
  { id: 'voice_direct_work', label: 'Voice, wishes and feelings' },
  { id: 'safeguarding_incident', label: 'Safeguarding and protection' },
  { id: 'missing_return', label: 'Missing and return home' },
  { id: 'health_medication', label: 'Health and medication' },
  { id: 'education_family', label: 'Education and family' },
  { id: 'planning_review', label: 'Plans and reviews' },
  { id: 'manager_governance', label: 'Manager oversight and governance' },
  { id: 'workforce', label: 'Workforce and staff support' },
  { id: 'environment', label: 'Environment and maintenance' },
  { id: 'documents_evidence', label: 'Documents and evidence' }
]

/** UI filter chips for workflow / sensitivity (cross-cutting). */
export const RECORDING_STATUS_FILTERS: Array<{ id: string; label: string; match: (form: RecordingFormDefinition) => boolean }> = [
  {
    id: 'formal_submit',
    label: 'Formal submit supported',
    match: (form) => form.workflowStatus === 'formal_submit_supported'
  },
  {
    id: 'draft_workspace',
    label: 'Draft workspace',
    match: (form) => form.workflowStatus === 'draft_workspace' || form.routeKind === 'draft_workspace'
  },
  {
    id: 'manager_review',
    label: 'Manager review required',
    match: (form) => form.requiresManagerReview || form.workflowStatus === 'manager_review_required'
  },
  {
    id: 'safeguarding_sensitive',
    label: 'Safeguarding sensitive',
    match: (form) => form.safeguardingSensitive || form.workflowStatus === 'safeguarding_sensitive'
  }
]

const FORMAL_SUBMIT_FORM_IDS = new Set([
  'daily-note',
  'incident',
  'keywork',
  'keywork-direct-work',
  'family-time',
  'education-note',
  'health-appointment',
  'missing-episode'
])

function inferWorkflowStatus(form: Omit<RecordingFormDefinition, 'workflowStatus'>): RecordingWorkflowStatus {
  if (form.safeguardingSensitive && (form.requiresManagerReview || form.id.includes('disclosure') || form.id.includes('allegation'))) {
    return 'safeguarding_sensitive'
  }
  if (FORMAL_SUBMIT_FORM_IDS.has(form.id)) {
    return 'formal_submit_supported'
  }
  if (form.requiresManagerReview && form.safeguardingSensitive) {
    return 'safeguarding_sensitive'
  }
  if (form.requiresManagerReview) {
    return 'manager_review_required'
  }
  if (form.routeKind === 'existing_workflow' && form.status === 'built') {
    return 'opens_existing_workflow'
  }
  if (form.routeKind === 'draft_workspace' || form.status === 'planned') {
    return 'draft_workspace'
  }
  if (form.routeKind === 'existing_workflow') {
    return 'opens_existing_workflow'
  }
  return 'draft_workspace'
}

function enrichRecordingForm(form: Omit<RecordingFormDefinition, 'workflowStatus'>): RecordingFormDefinition {
  const workflowStatus = 'workflowStatus' in form && form.workflowStatus ? form.workflowStatus : inferWorkflowStatus(form)
  const qualityChecklist =
    form.qualityChecklist.length >= 5
      ? form.qualityChecklist
      : [
          ...form.qualityChecklist,
          'Facts described clearly',
          'Adult response and follow-up recorded',
          'Child voice included where appropriate',
          'Next steps clear',
          'Adult remains responsible for the record'
        ].slice(0, 5)
  return { ...form, workflowStatus, qualityChecklist } as RecordingFormDefinition
}

function recordWorkspaceRoute(type: RecordingWorkspaceType, childId?: string, formId?: string) {
  const params = new URLSearchParams({ type })
  if (formId) params.set('form', formId)
  if (childId) {
    params.set('child_id', childId)
    params.set('about', 'child')
  }
  return `/record?${params.toString()}`
}

/** Canonical core entries aligned to children’s homes operational and inspection evidence practice. */
const RECORDING_FORM_REGISTRY_CORE: Array<Omit<RecordingFormDefinition, 'workflowStatus'>> = [
  // —— P0 daily life ——
  {
    id: 'daily-note',
    title: 'Daily note',
    category: 'daily_life',
    description: 'Calm record of the day — experience, support and change.',
    route: '/daily-logs',
    workspaceType: 'daily-note',
    cardId: 'daily-note',
    workflowSegment: 'daily-note',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: false,
    suggestedOrbMode: 'record_quality_review',
    therapeuticPrompt:
      'What happened today? What did the young person experience? What support did adults offer? What changed?',
    qualityChecklist: [
      'Child voice or presentation included where appropriate',
      'Adult support described',
      'Strengths or progress noted',
      'Next steps or continuity clear'
    ],
    orbSuggestedPrompts: [
      'How can I include the child’s voice?',
      'Make this daily note more child-centred.',
      'What strengths/progress should I include?'
    ],
    tags: ['daily', 'continuity', 'QS7'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 7', 'QS: Enjoy and achieve'],
    relatedEvidenceAreas: ['Daily care', 'Child voice', 'Chronology']
  },
  {
    id: 'handover',
    title: 'Shift handover',
    category: 'daily_life',
    description: 'What the next adults need to know.',
    route: '/handover/current',
    workspaceType: 'handover',
    cardId: 'shift-handover',
    workflowSegment: 'shift-handover',
    requiresChild: false,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: false,
    therapeuticPrompt: 'What should the next adults know — mood, risks, routines, unfinished follow-up?',
    qualityChecklist: ['Risks and routines clear', 'Unfinished actions named', 'Child-specific points where relevant'],
    orbSuggestedPrompts: ['Help me write a clear shift handover.', 'What should staff know before the next shift?'],
    tags: ['handover', 'continuity'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 35', 'QS: Leadership'],
    relatedEvidenceAreas: ['Workforce continuity']
  },
  {
    id: 'child-voice',
    title: 'Child voice',
    category: 'daily_life',
    description: 'Wishes, feelings and communication in the child’s words.',
    route: '/young-people',
    workspaceType: 'child-voice',
    cardId: 'child-voice',
    workflowSegment: 'child-voice',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: true,
    therapeuticPrompt:
      'What did the child say, show or communicate? How were their wishes and feelings understood? What did adults do in response?',
    qualityChecklist: [
      'Child communication described respectfully',
      'Adult response recorded',
      'Participation or advocacy considered'
    ],
    orbSuggestedPrompts: ['Help me record child voice clearly.', 'How were wishes and feelings understood?'],
    tags: ['child-voice', 'participation'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 7', 'QS: Enjoy and achieve'],
    relatedEvidenceAreas: ['Child voice', 'You said we did']
  },
  // —— P0 safeguarding ——
  {
    id: 'incident',
    title: 'Incident',
    category: 'safeguarding_incident',
    description: 'Facts, adult response, repair and follow-up.',
    route: '/incidents',
    workspaceType: 'incident',
    cardId: 'incidents',
    workflowSegment: 'incidents',
    requiresChild: true,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt:
      'What happened? What was seen/heard? How did adults respond? How was repair supported? What follow-up is needed?',
    qualityChecklist: [
      'Facts described clearly',
      'Adult response recorded',
      'Repair or follow-up noted',
      'Manager review considered'
    ],
    orbSuggestedPrompts: [
      'Help me structure this incident record.',
      'Check if this needs manager review.',
      'Make this wording factual and child-centred.'
    ],
    tags: ['incident', 'Reg 12', 'Reg 13'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 12', 'Reg 13', 'Reg 35'],
    relatedEvidenceAreas: ['SCCIF protection', 'Chronology']
  },
  {
    id: 'safeguarding-concern',
    title: 'Safeguarding concern',
    category: 'safeguarding_incident',
    description: 'Concern, safety action and threshold review.',
    route: '/safeguarding',
    workspaceType: 'safeguarding-concern',
    cardId: 'safeguarding',
    workflowSegment: 'safeguarding',
    requiresChild: true,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt:
      'What was noticed, said, seen or disclosed? Who was informed? What immediate action was taken? What follow-up is needed?',
    qualityChecklist: [
      'Concern described factually',
      'Child voice/presentation included where appropriate',
      'Immediate safety actions recorded',
      'Manager/safeguarding lead informed',
      'Follow-up actions clear',
      'No unnecessary third-party identifiers'
    ],
    orbSuggestedPrompts: [
      'What should be included in a safeguarding concern record?',
      'Help me avoid unnecessary third-party details.',
      'What must be escalated to a manager?'
    ],
    tags: ['safeguarding', 'Working Together'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 12', 'Reg 13'],
    relatedEvidenceAreas: ['SCCIF protection', 'Escalation']
  },
  {
    id: 'missing-episode',
    title: 'Missing episode',
    category: 'missing_return',
    description: 'Missing from care, actions, return and welfare.',
    route: '/chronology',
    workspaceType: 'missing',
    cardId: 'missing',
    workflowSegment: 'missing',
    requiresChild: true,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt:
      'When was the concern first noticed? What actions were taken? Who was informed? What happened on return? What was the young person’s voice?',
    qualityChecklist: [
      'Time/location clear',
      'Search/actions recorded',
      'Police/social worker/manager informed where needed',
      'Return conversation/RHI considered',
      'Follow-up and safety planning recorded'
    ],
    orbSuggestedPrompts: ['What should be recorded about a missing episode?', 'What follow-up after return?'],
    tags: ['missing', 'return'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 12', 'Missing from care protocol'],
    relatedEvidenceAreas: ['SCCIF protection', 'Return interview']
  },
  {
    id: 'return-conversation',
    title: 'Return conversation / RHI note',
    category: 'missing_return',
    description: 'Return interview or return conversation after missing.',
    route: recordWorkspaceRoute('return-conversation'),
    workspaceType: 'return-conversation',
    workflowSegment: 'missing',
    requiresChild: true,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt:
      'What was offered for return interview/conversation? What did the young person say about being away and returning? What support was agreed?',
    qualityChecklist: [
      'Offer of return conversation recorded',
      'Child voice on return',
      'Welfare check noted',
      'Follow-up actions clear'
    ],
    orbSuggestedPrompts: ['What should a return conversation record include?', 'How do I capture the child’s voice on return?'],
    tags: ['RHI', 'return', 'missing'],
    status: 'partial',
    priority: 'P0',
    routeKind: 'draft_workspace',
    relatedQualityStandards: ['Reg 12', 'Missing from care protocol'],
    relatedEvidenceAreas: ['Return interview', 'Child voice'],
    gap: 'Dedicated RHI workflow segment not split from missing episode form.',
    recommendedNextAction: 'Use missing episode workflow return fields or draft workspace until dedicated route.'
  },
  {
    id: 'physical-intervention',
    title: 'Physical intervention / restraint',
    category: 'safeguarding_incident',
    description: 'De-escalation, intervention, debrief and repair.',
    route: recordWorkspaceRoute('physical-intervention'),
    workspaceType: 'physical-intervention',
    workflowSegment: 'physical-intervention',
    requiresChild: true,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt:
      'What led up to the intervention? What de-escalation was attempted? What intervention was used? How long did it last? How was the young person supported afterwards? Was debrief offered?',
    qualityChecklist: [
      'Antecedents recorded',
      'De-escalation attempted',
      'Intervention described factually',
      'Duration / people involved recorded',
      'Injury check considered',
      'Debrief / repair recorded',
      'Manager review required'
    ],
    orbSuggestedPrompts: [
      'What should I include after a physical intervention?',
      'Help me record de-escalation and repair.',
      'What review actions should be considered?'
    ],
    tags: ['restraint', 'Reg 13', 'Reg 35'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 13', 'Reg 35'],
    relatedEvidenceAreas: ['SCCIF protection', 'Manager review']
  },
  {
    id: 'injury-body-map',
    title: 'Injury / body map note',
    category: 'safeguarding_incident',
    description: 'Injury observation, child explanation and health follow-up.',
    route: recordWorkspaceRoute('injury-body-map'),
    workspaceType: 'injury-body-map',
    workflowSegment: 'body-map',
    requiresChild: true,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt:
      'What was observed on the body? What did the child say? What health advice or action was taken? Was manager review needed?',
    qualityChecklist: [
      'Observation factual',
      'Child explanation included',
      'Medical advice/action recorded',
      'Manager review considered'
    ],
    orbSuggestedPrompts: ['Help me record an injury observation factually.', 'What follow-up health actions should I note?'],
    tags: ['injury', 'body map', 'Reg 10'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 10', 'Reg 12'],
    relatedEvidenceAreas: ['Health', 'Safeguarding']
  },
  {
    id: 'medication-note-error',
    title: 'Medication note / error',
    category: 'health_medication',
    description: 'Administration, refusal, missed dose or medication error.',
    route: '/medication',
    workspaceType: 'medication-note-error',
    cardId: 'medication-health',
    workflowSegment: 'medication-record',
    requiresChild: true,
    requiresManagerReview: true,
    safeguardingSensitive: false,
    privacySensitive: true,
    therapeuticPrompt:
      'What medication activity took place? Any refusal, missed dose or error? Who was informed? What follow-up is required? Do not rely on AI for medication decisions.',
    qualityChecklist: [
      'Medication facts recorded',
      'Error or refusal described if relevant',
      'Who was informed',
      'Follow-up clear',
      'Manager review if error'
    ],
    orbSuggestedPrompts: ['Help me record medication facts clearly.', 'What follow-up should be recorded after a medication concern?'],
    tags: ['medication', 'Reg 10'],
    status: 'built',
    priority: 'P0',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 10'],
    relatedEvidenceAreas: ['Health', 'Medication safety']
  },
  {
    id: 'manager-review',
    title: 'Manager review of record',
    category: 'manager_governance',
    description: 'Manager oversight, threshold or quality review of a record.',
    route: '/intelligence-actions',
    workspaceType: 'manager-review',
    requiresChild: false,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt:
      'What record or event was reviewed? What evidence was considered? What decision/support/action is needed?',
    qualityChecklist: [
      'Evidence basis described',
      'Decision or action clear',
      'Owner and timescale named',
      'Review date if needed'
    ],
    orbSuggestedPrompts: ['What should a manager review note include?', 'What evidence should I reference?'],
    tags: ['manager-review', 'governance'],
    status: 'partial',
    priority: 'P0',
    routeKind: 'draft_workspace',
    relatedQualityStandards: ['Reg 35', 'QS: Leadership'],
    relatedEvidenceAreas: ['Oversight', 'Review queue'],
    gap: 'No dedicated manager-review submit route; review queue and workspace draft.',
    recommendedNextAction: 'Link to intelligence-actions review queue; use workspace for narrative.'
  },
  // —— P1 ——
  {
    id: 'keywork',
    title: 'Keywork / direct work',
    category: 'daily_life',
    description: 'Planned direct work, goals and progress.',
    route: '/keywork',
    workspaceType: 'keywork',
    cardId: 'keywork',
    workflowSegment: 'keywork',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: false,
    therapeuticPrompt: 'What direct work took place? What were the goals? What progress or outcomes were observed?',
    qualityChecklist: ['Goals linked', 'Child voice', 'Progress noted', 'Next steps'],
    orbSuggestedPrompts: ['Help me record keywork outcomes.', 'How do I link this to care plan goals?'],
    tags: ['keywork', 'direct work'],
    status: 'built',
    priority: 'P1',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 7'],
    relatedEvidenceAreas: ['Progress', 'Child voice']
  },
  {
    id: 'family-time',
    title: 'Family time / contact',
    category: 'education_family',
    description: 'Contact, visits and relationship moments.',
    route: '/chronology',
    workspaceType: 'family-time',
    cardId: 'family-contact',
    workflowSegment: 'family-contact',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: true,
    therapeuticPrompt: 'What contact took place? How did the young person respond? What matters for continuity?',
    qualityChecklist: ['Contact type and response', 'Child voice', 'Follow-up support'],
    orbSuggestedPrompts: ['Help me record family time child-centredly.'],
    tags: ['family', 'contact', 'Reg 9'],
    status: 'built',
    priority: 'P1',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 9', 'Reg 11'],
    relatedEvidenceAreas: ['Relationships']
  },
  {
    id: 'education-note',
    title: 'Education note',
    category: 'education_family',
    description: 'Attendance, learning, barriers and adult actions.',
    route: '/education',
    workspaceType: 'education-note',
    cardId: 'education-update',
    workflowSegment: 'education-update',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: false,
    therapeuticPrompt: 'What learning or attendance happened? What barriers or worries? What did adults do next?',
    qualityChecklist: ['Attendance/engagement', 'Child experience', 'Actions taken'],
    orbSuggestedPrompts: ['Help me record an education update for inspection evidence.'],
    tags: ['education', 'Reg 8'],
    status: 'built',
    priority: 'P1',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 8'],
    relatedEvidenceAreas: ['SCCIF progress']
  },
  {
    id: 'health-appointment',
    title: 'Health appointment',
    category: 'health_medication',
    description: 'Appointment outcome and health follow-up.',
    route: '/appointments',
    workspaceType: 'health-appointment',
    workflowSegment: 'health',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: true,
    therapeuticPrompt: 'What appointment took place? What was decided? Who was informed? What follow-up is needed?',
    qualityChecklist: ['Appointment facts', 'Outcome recorded', 'Follow-up clear'],
    orbSuggestedPrompts: ['What should I record after a health appointment?'],
    tags: ['health', 'appointment'],
    status: 'partial',
    priority: 'P1',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 10'],
    relatedEvidenceAreas: ['Health']
  },
  {
    id: 'behaviour-support',
    title: 'Behaviour support / de-escalation',
    category: 'safeguarding_incident',
    description: 'De-escalation strategies used and support offered.',
    route: recordWorkspaceRoute('behaviour-support'),
    workspaceType: 'behaviour-support',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: false,
    therapeuticPrompt:
      'What behaviour was observed? What de-escalation or support was tried? How did the young person respond? What repair or plan update is needed?',
    qualityChecklist: ['Observable behaviour', 'De-escalation tried', 'Adult support', 'Follow-up'],
    orbSuggestedPrompts: ['Help me record de-escalation without blame language.'],
    tags: ['behaviour', 'de-escalation'],
    status: 'partial',
    priority: 'P1',
    routeKind: 'draft_workspace',
    relatedQualityStandards: ['Reg 7', 'Reg 13'],
    relatedEvidenceAreas: ['Support plans'],
    gap: 'Often captured within incident or daily note; dedicated route planned.',
    recommendedNextAction: 'Use workspace draft or incident antecedent fields.'
  },
  {
    id: 'complaint-concern',
    title: 'Complaint / concern',
    category: 'manager_governance',
    description: 'Complaint or concern raised by child, family or staff.',
    route: recordWorkspaceRoute('complaint-concern'),
    workspaceType: 'complaint-concern',
    requiresChild: false,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt: 'Who raised the concern? What was said? What immediate response? What investigation or follow-up?',
    qualityChecklist: ['Concern described', 'Response recorded', 'Manager informed', 'Timescales clear'],
    orbSuggestedPrompts: ['What should be recorded for a complaint at this stage?'],
    tags: ['complaint', 'advocacy'],
    status: 'partial',
    priority: 'P1',
    routeKind: 'draft_workspace',
    relatedQualityStandards: ['Reg 35', 'QS: Leadership'],
    relatedEvidenceAreas: ['Governance'],
    gap: 'Child voice workflow has advocacy/complaint link field only.',
    recommendedNextAction: 'Add formal complaints module or governance route next pass.'
  },
  {
    id: 'room-search',
    title: 'Room search / prohibited item',
    category: 'safeguarding_incident',
    description: 'Search, items found and safeguarding response.',
    route: recordWorkspaceRoute('room-search'),
    workspaceType: 'room-search',
    requiresChild: true,
    requiresManagerReview: true,
    safeguardingSensitive: true,
    privacySensitive: true,
    therapeuticPrompt:
      'Why was search needed? Who was present? What was found? How was the child supported? Who was informed?',
    qualityChecklist: ['Reason recorded', 'Proportionality', 'Child support', 'Manager informed'],
    orbSuggestedPrompts: ['Help me record a room search factually and respectfully.'],
    tags: ['search', 'safeguarding'],
    status: 'planned',
    priority: 'P1',
    routeKind: 'draft_workspace',
    relatedQualityStandards: ['Reg 12', 'Reg 13'],
    relatedEvidenceAreas: ['Safeguarding'],
    gap: 'No dedicated workflow segment.',
    recommendedNextAction: 'Workspace draft; formal route in next pass.'
  },
  {
    id: 'damage-repair',
    title: 'Damage / repair',
    category: 'safeguarding_incident',
    description: 'Damage to property and restorative follow-up.',
    route: recordWorkspaceRoute('damage-repair'),
    workspaceType: 'damage-repair',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: false,
    therapeuticPrompt: 'What damage occurred? How was the child supported? What repair or restorative work happened?',
    qualityChecklist: ['Facts recorded', 'Repair/restoration', 'Follow-up'],
    orbSuggestedPrompts: ['How do I record damage and repair child-centredly?'],
    tags: ['damage', 'repair'],
    status: 'partial',
    priority: 'P1',
    routeKind: 'draft_workspace',
    relatedQualityStandards: ['Reg 7'],
    relatedEvidenceAreas: ['Incidents'],
    gap: 'Often part of incident record injuries/damage field.',
    recommendedNextAction: 'Use incident workflow or workspace draft.'
  },
  {
    id: 'professional-visit',
    title: 'Social worker / professional visit',
    category: 'planning_review',
    description: 'Professional visit, decisions and actions.',
    route: recordWorkspaceRoute('professional-visit'),
    workspaceType: 'professional-visit',
    workflowSegment: 'appointment-outcome',
    requiresChild: true,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: true,
    therapeuticPrompt: 'Who visited? What was discussed? What did the child say? What actions were agreed?',
    qualityChecklist: ['Visit facts', 'Child voice', 'Actions agreed'],
    orbSuggestedPrompts: ['What should a professional visit record include for chronology?'],
    tags: ['professional', 'IRO', 'social worker'],
    status: 'partial',
    priority: 'P1',
    routeKind: 'draft_workspace',
    relatedQualityStandards: ['Reg 7', 'Reg 11'],
    relatedEvidenceAreas: ['Multi-agency']
  },
  {
    id: 'staff-debrief',
    title: 'Staff debrief',
    category: 'workforce',
    description: 'Debrief after incident, restraint or distress.',
    route: recordWorkspaceRoute('staff-debrief'),
    workspaceType: 'staff-debrief',
    requiresChild: false,
    requiresManagerReview: false,
    safeguardingSensitive: true,
    privacySensitive: false,
    therapeuticPrompt: 'What event was debriefed? What was learned? What support or actions for staff?',
    qualityChecklist: ['Event linked', 'Learning captured', 'Support/actions'],
    orbSuggestedPrompts: ['What should a staff debrief note include?'],
    tags: ['debrief', 'workforce'],
    status: 'partial',
    priority: 'P1',
    routeKind: 'draft_workspace',
    relatedQualityStandards: ['Reg 35'],
    relatedEvidenceAreas: ['Workforce wellbeing'],
    gap: 'Captured in physical intervention workflow staff_debrief field.',
    recommendedNextAction: 'Use restraint workflow or workspace for standalone debrief.'
  },
  {
    id: 'reg44-evidence',
    title: 'Reg 44 evidence note',
    category: 'manager_governance',
    description: 'Independent visitor findings and provider response.',
    route: recordWorkspaceRoute('reg44-evidence'),
    workspaceType: 'reg44-evidence',
    workflowSegment: 'reg44-action',
    requiresChild: false,
    requiresManagerReview: true,
    safeguardingSensitive: false,
    privacySensitive: false,
    therapeuticPrompt:
      'What evidence does this provide about the quality of care? Which theme/standard does it support? What improvement action is needed?',
    qualityChecklist: ['Finding/evidence clear', 'Impact for children', 'Owner and timescale'],
    orbSuggestedPrompts: ['What makes strong Reg 44 evidence?', 'Which quality standard does this support?'],
    tags: ['Reg 44', 'inspection'],
    status: 'built',
    priority: 'P1',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 44'],
    relatedEvidenceAreas: ['Leadership', 'Inspection']
  },
  {
    id: 'reg45-evidence',
    title: 'Reg 45 evidence note',
    category: 'manager_governance',
    description: 'Quality of care review evidence and improvement actions.',
    route: recordWorkspaceRoute('reg45-evidence'),
    workspaceType: 'reg45-evidence',
    cardId: 'reg45-evidence',
    workflowSegment: 'reg45-evidence',
    requiresChild: false,
    requiresManagerReview: true,
    safeguardingSensitive: false,
    privacySensitive: false,
    therapeuticPrompt:
      'What evidence does this provide about the quality of care? Which theme/standard does it support? What improvement action is needed?',
    qualityChecklist: ['Evidence reviewed listed', 'Gaps and actions', 'Child outcomes referenced'],
    orbSuggestedPrompts: ['What should Reg 45 evidence demonstrate?', 'What improvement action is needed?'],
    tags: ['Reg 45', 'inspection'],
    status: 'built',
    priority: 'P1',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 45'],
    relatedEvidenceAreas: ['Quality of care review']
  },
  {
    id: 'evidence-document',
    title: 'Document / evidence note',
    category: 'documents_evidence',
    description: 'Evidence, files and document-linked notes.',
    route: '/documents',
    workspaceType: 'evidence-document',
    cardId: 'documents',
    workflowSegment: 'documents',
    requiresChild: false,
    requiresManagerReview: false,
    safeguardingSensitive: false,
    privacySensitive: true,
    therapeuticPrompt: 'What evidence or document are you noting? Why does it matter for the child’s record?',
    qualityChecklist: ['Document identified', 'Purpose clear', 'Linkage to child/home'],
    orbSuggestedPrompts: ['What evidence should I attach?'],
    tags: ['evidence', 'documents'],
    status: 'built',
    priority: 'P1',
    routeKind: 'existing_workflow',
    relatedQualityStandards: ['Reg 35'],
    relatedEvidenceAreas: ['Inspection evidence']
  }
]

function mergeRecordingRegistry(): RecordingFormDefinition[] {
  const byId = new Map<string, RecordingFormDefinition>()
  for (const form of RECORDING_FORM_REGISTRY_CORE) {
    byId.set(form.id, enrichRecordingForm(form))
  }
  for (const form of RECORDING_CATALOGUE_EXTRA_FORMS) {
    if (!byId.has(form.id)) {
      byId.set(form.id, enrichRecordingForm(form))
    }
  }
  return Array.from(byId.values())
}

/** Full catalogue — core wired forms plus extended draft/workspace forms. */
export const RECORDING_FORM_REGISTRY: RecordingFormDefinition[] = mergeRecordingRegistry()

export function recordingFormById(id: string): RecordingFormDefinition | undefined {
  return RECORDING_FORM_REGISTRY.find((form) => form.id === id)
}

export function recordingFormByWorkspaceType(type: RecordingWorkspaceType): RecordingFormDefinition | undefined {
  return RECORDING_FORM_REGISTRY.find((form) => form.workspaceType === type)
}

export function recordingFormsByCategory(category: RecordingFormCategory): RecordingFormDefinition[] {
  return RECORDING_FORM_REGISTRY.filter((form) => form.category === category)
}

export function recordingFormsByPriority(priority: RecordingFormPriority): RecordingFormDefinition[] {
  return RECORDING_FORM_REGISTRY.filter((form) => form.priority === priority)
}

export function p0RecordingForms(): RecordingFormDefinition[] {
  return recordingFormsByPriority('P0')
}

export function workspaceRecordingForms(): RecordingFormDefinition[] {
  const seen = new Set<RecordingWorkspaceType>()
  const forms: RecordingFormDefinition[] = []
  const priorityOrder = { P0: 0, P1: 1, P2: 2 } as const
  const sorted = [...RECORDING_FORM_REGISTRY].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  )
  for (const form of sorted) {
    if (!form.workspaceType || seen.has(form.workspaceType)) continue
    seen.add(form.workspaceType)
    forms.push(form)
  }
  return forms
}

export function catalogueRecordingForms(): RecordingFormDefinition[] {
  const priorityOrder = { P0: 0, P1: 1, P2: 2 } as const
  return [...RECORDING_FORM_REGISTRY].sort((a, b) => {
    const p = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (p !== 0) return p
    return a.title.localeCompare(b.title)
  })
}

export function resolveActiveRecordingForm(
  workspaceType: RecordingWorkspaceType,
  formId?: string | null
): RecordingFormDefinition | undefined {
  if (formId) {
    const byId = recordingFormById(formId)
    if (byId) return byId
  }
  return recordingFormByWorkspaceType(workspaceType)
}

export function resolveFormRoute(form: RecordingFormDefinition, childId?: string): string {
  if (form.workflowSegment && childId) {
    const mode = form.workflowSegment === 'documents' ? 'upload' : 'new'
    return childWorkflowHref(childId, form.workflowSegment, mode)
  }
  if (form.workspaceType) {
    const formParam = form.workspaceType === 'general-draft' ? form.id : undefined
    return recordWorkspaceRoute(form.workspaceType, childId, formParam)
  }
  if (childId && form.requiresChild) {
    const params = new URLSearchParams({ child_id: childId, about: 'child' })
    return `/record?${params.toString()}`
  }
  return form.route
}

export function routeStatusLabel(kind: RecordingFormRouteKind): string {
  switch (kind) {
    case 'ready':
      return 'Ready'
    case 'existing_workflow':
      return 'Opens existing workflow'
    case 'draft_workspace':
      return 'Draft workspace'
    case 'legacy':
      return 'Legacy route'
    case 'ui_card_only':
      return 'Card only'
    default:
      return 'Draft workspace'
  }
}

export function routeStatusMicrocopy(kind: RecordingFormRouteKind): string | undefined {
  if (kind === 'draft_workspace') {
    return 'Draft workspace — submit to the correct record route when ready.'
  }
  if (kind === 'existing_workflow') {
    return 'Opens the formal child journey or module route when a child is selected.'
  }
  return undefined
}
