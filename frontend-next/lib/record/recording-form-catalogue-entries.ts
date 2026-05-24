import { buildCatalogueForm } from '@/lib/record/recording-form-catalogue-helpers'
import type { RecordingFormDefinition } from '@/lib/record/recording-form-registry'

/** Additional catalogue forms beyond the core wired workspace set. */
export const RECORDING_CATALOGUE_EXTRA_FORMS: RecordingFormDefinition[] = [
  // —— Child daily life ——
  buildCatalogueForm({
    id: 'night-check-sleep',
    title: 'Night check / sleep note',
    category: 'daily_life',
    description: 'Sleep, night checks and overnight observations.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'How did the young person settle? Any night checks or disturbances? What support was offered? What should the next adults know?',
    qualityChecklist: [
      'Sleep pattern or disturbance described',
      'Night checks recorded where relevant',
      'Child presentation noted',
      'Support offered described',
      'Handover points for next shift'
    ],
    orbSuggestedPrompts: ['What should a night check note include?', 'How do I record sleep without blame language?'],
    tags: ['sleep', 'night', 'Reg 10'],
    priority: 'P1',
    requiresChild: true
  }),
  buildCatalogueForm({
    id: 'meals-food-routine',
    title: 'Meals / food routine note',
    category: 'daily_life',
    description: 'Meals, nutrition and food-related routines.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What food or drink was offered? How did the young person respond? Any worries or preferences to note?',
    qualityChecklist: [
      'What was offered and eaten',
      'Child response or preferences',
      'Any health or allergy considerations',
      'Adult support offered',
      'Follow-up if needed'
    ],
    tags: ['meals', 'nutrition'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'activity-note',
    title: 'Activity note',
    category: 'daily_life',
    description: 'Activities, leisure and lived experience.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What activity took place? How did the young person experience it? What strengths or enjoyment were visible?',
    qualityChecklist: [
      'Activity described',
      'Child experience or voice',
      'Engagement and strengths',
      'Barriers if any',
      'Next steps for continuity'
    ],
    tags: ['activity', 'QS progress'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'independence-life-skills',
    title: 'Independence / life skills note',
    category: 'daily_life',
    description: 'Life skills, independence and preparation for adulthood.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What life skill was practised? What did the young person do? What support was offered? What progress was observed?',
    qualityChecklist: [
      'Skill or goal named',
      'What the child did',
      'Adult scaffolding',
      'Progress or barriers',
      'Link to pathway plan if relevant'
    ],
    tags: ['independence', 'pathway'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'cultural-identity-religion',
    title: 'Cultural identity / religion note',
    category: 'daily_life',
    description: 'Identity, culture, faith and belonging.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What mattered to the young person about identity, culture or faith today? How were their wishes respected?',
    qualityChecklist: [
      'Child voice on identity',
      'What adults did to support',
      'Any barriers or advocacy needed',
      'Link to care plan',
      'Respectful, specific language'
    ],
    tags: ['identity', 'culture', 'Reg 7'],
    priority: 'P2'
  }),
  // —— Voice / direct work ——
  buildCatalogueForm({
    id: 'wishes-and-feelings',
    title: 'Wishes and feelings',
    category: 'voice_direct_work',
    description: 'Structured capture of wishes and feelings.',
    workflowStatus: 'opens_existing_workflow',
    workspaceType: 'child-voice',
    workflowSegment: 'child-voice',
    therapeuticPrompt:
      'What did the child communicate about their wishes and feelings? How was this understood? What will adults do next?',
    qualityChecklist: [
      'Wishes described in accessible language',
      'Feelings understood without judgement',
      'Adult response recorded',
      'Participation supported',
      'Follow-up actions clear'
    ],
    status: 'partial',
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'keywork-direct-work',
    title: 'Keywork / direct work (session)',
    category: 'voice_direct_work',
    description: 'Planned direct work session — alias to keywork workflow.',
    workflowStatus: 'formal_submit_supported',
    workspaceType: 'keywork',
    workflowSegment: 'keywork',
    route: '/keywork',
    routeKind: 'existing_workflow',
    status: 'built',
    priority: 'P1',
    therapeuticPrompt: 'What direct work took place? Goals, child voice, progress and next steps.',
    qualityChecklist: [
      'Session purpose clear',
      'Child voice included',
      'Goals linked',
      'Progress noted',
      'Next session or actions'
    ]
  }),
  buildCatalogueForm({
    id: 'advocate-visit',
    title: 'Advocacy / advocate visit',
    category: 'voice_direct_work',
    description: 'Independent advocate visit or contact.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'Who visited? What did the child want the advocate to know? What was agreed? What follow-up is needed?',
    qualityChecklist: [
      'Visit facts',
      'Child voice to advocate',
      'Issues raised',
      'Actions agreed',
      'Follow-up owner'
    ],
    tags: ['advocacy', 'Reg 7'],
    priority: 'P1',
    privacySensitive: true
  }),
  // —— Safeguarding ——
  buildCatalogueForm({
    id: 'disclosure',
    title: 'Disclosure',
    category: 'safeguarding_incident',
    description: 'Child disclosure — safeguarding sensitive.',
    workflowStatus: 'safeguarding_sensitive',
    requiresManagerReview: true,
    therapeuticPrompt:
      'What was disclosed (only what is necessary)? Who was present? What immediate safety action was taken? Who was informed?',
    qualityChecklist: [
      'Facts only — no unnecessary detail',
      'Child words respected',
      'Immediate safety actions',
      'Manager/safeguarding lead informed',
      'Follow local safeguarding procedures',
      'No unnecessary third-party identifiers'
    ],
    orbSuggestedPrompts: [
      'What must be recorded after a disclosure?',
      'Help me avoid unnecessary detail.',
      'What must be escalated immediately?'
    ],
    tags: ['disclosure', 'Reg 12'],
    priority: 'P0',
    status: 'partial'
  }),
  buildCatalogueForm({
    id: 'allegation',
    title: 'Allegation',
    category: 'safeguarding_incident',
    description: 'Allegation against staff or others — high risk.',
    workflowStatus: 'safeguarding_sensitive',
    requiresManagerReview: true,
    therapeuticPrompt:
      'What allegation was made? Who reported it? What immediate action was taken? Who has been informed per local procedure?',
    qualityChecklist: [
      'Allegation described factually',
      'Reporter and time noted',
      'Immediate safety actions',
      'Manager and safeguarding lead informed',
      'No investigation conclusions in this note',
      'Follow local allegations procedure'
    ],
    tags: ['allegation', 'Reg 12', 'Reg 13'],
    priority: 'P0',
    status: 'partial'
  }),
  buildCatalogueForm({
    id: 'child-on-child-concern',
    title: 'Child-on-child concern',
    category: 'safeguarding_incident',
    description: 'Peer harm or child-on-child safeguarding concern.',
    workflowStatus: 'safeguarding_sensitive',
    therapeuticPrompt:
      'What happened? Who was involved? How were all children kept safe? What support and follow-up is needed?',
    qualityChecklist: [
      'Facts without blame',
      'Safety of all children',
      'Support to those harmed and those who harmed',
      'Manager informed',
      'Follow-up plan'
    ],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'bullying-peer-conflict',
    title: 'Bullying / peer conflict',
    category: 'safeguarding_incident',
    description: 'Peer conflict, bullying or relational harm.',
    workflowStatus: 'manager_review_required',
    therapeuticPrompt:
      'What was observed? How were children supported? What restorative or safeguarding action was taken?',
    qualityChecklist: [
      'Observable facts',
      'All children supported',
      'Child voice',
      'Adult response',
      'Follow-up and monitoring'
    ],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'exploitation-concern',
    title: 'Exploitation concern',
    category: 'safeguarding_incident',
    description: 'CCE/CSE or exploitation indicators.',
    workflowStatus: 'safeguarding_sensitive',
    therapeuticPrompt:
      'What indicators were noticed? What did the child say? Who was informed? What immediate safety planning was done?',
    qualityChecklist: [
      'Indicators described factually',
      'Child voice',
      'Multi-agency escalation considered',
      'Safety plan actions',
      'Manager/safeguarding lead informed'
    ],
    tags: ['CCE', 'CSE', 'Reg 12'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'police-involvement',
    title: 'Police involvement',
    category: 'safeguarding_incident',
    description: 'Police attendance or contact related to a child.',
    workflowStatus: 'safeguarding_sensitive',
    therapeuticPrompt:
      'Why were police involved? What happened? Who was present? How was the child supported? What follow-up is agreed?',
    qualityChecklist: [
      'Reason for police contact',
      'Times and locations factual',
      'Child support recorded',
      'Manager informed',
      'Multi-agency follow-up'
    ],
    tags: ['police', 'Reg 12'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'hospital-emergency',
    title: 'Hospital / emergency services',
    category: 'safeguarding_incident',
    description: 'Emergency services or hospital attendance.',
    workflowStatus: 'safeguarding_sensitive',
    therapeuticPrompt:
      'What emergency occurred? What action was taken? Who accompanied the child? What was the outcome and follow-up?',
    qualityChecklist: [
      'Emergency facts',
      'Child welfare during transport',
      'Who was informed',
      'Hospital outcome if known',
      'Follow-up health and safeguarding'
    ],
    tags: ['hospital', 'emergency', 'Reg 10'],
    priority: 'P1'
  }),
  // —— Incidents ——
  buildCatalogueForm({
    id: 'compliment',
    title: 'Compliment / positive feedback',
    category: 'safeguarding_incident',
    description: 'Positive feedback about the child or service.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What positive feedback was received? Who said it? How was this shared with the child? What should be celebrated?',
    qualityChecklist: [
      'Feedback source',
      'Content of compliment',
      'Child informed if appropriate',
      'Shared with team',
      'Linked to strengths evidence'
    ],
    tags: ['compliment', 'strengths'],
    priority: 'P2',
    requiresChild: false
  }),
  // —— Missing ——
  buildCatalogueForm({
    id: 'unauthorised-absence',
    title: 'Unauthorised absence',
    category: 'missing_return',
    description: 'Away from placement without agreed absence — may escalate to missing.',
    workflowStatus: 'manager_review_required',
    workspaceType: 'missing',
    workflowSegment: 'missing',
    therapeuticPrompt:
      'When was absence first noticed? What checks were made? Who was informed? Did the child return safely?',
    qualityChecklist: [
      'Time noticed',
      'Actions taken',
      'Contacts made',
      'Return welfare if returned',
      'Escalation to missing protocol if needed'
    ],
    tags: ['absence', 'missing'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'missing-follow-up-plan',
    title: 'Missing follow-up safety plan',
    category: 'missing_return',
    description: 'Follow-up actions after missing or absence.',
    workflowStatus: 'manager_review_required',
    therapeuticPrompt:
      'What risks were identified? What safety plan actions were agreed? Who owns each action? When will it be reviewed?',
    qualityChecklist: [
      'Risks named',
      'Actions with owners',
      'Child voice on plan',
      'Review date',
      'Manager oversight'
    ],
    tags: ['missing', 'safety plan'],
    priority: 'P1'
  }),
  // —— Health ——
  buildCatalogueForm({
    id: 'health-note',
    title: 'Health note',
    category: 'health_medication',
    description: 'General health observation or nursing note.',
    workflowStatus: 'draft_workspace',
    workspaceType: 'health-medication',
    therapeuticPrompt:
      'What health observation or care was provided? What did the child say? What follow-up with health services is needed?',
    qualityChecklist: [
      'Observation factual',
      'Child voice',
      'Actions taken',
      'Who was informed',
      'Follow-up clear'
    ],
    tags: ['health', 'Reg 10'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'medication-administration',
    title: 'Medication administration note',
    category: 'health_medication',
    description: 'Routine medication administration — not a substitute for MAR chart.',
    workflowStatus: 'opens_existing_workflow',
    workspaceType: 'medication-note-error',
    route: '/medication',
    routeKind: 'existing_workflow',
    therapeuticPrompt:
      'What medication activity took place? Any refusal or concern? Do not rely on AI for medication decisions.',
    qualityChecklist: [
      'Medication facts only',
      'Time and route if relevant',
      'Refusal or concern noted',
      'Who was informed',
      'MAR chart completed per policy'
    ],
    tags: ['medication', 'Reg 10'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'medication-error',
    title: 'Medication error',
    category: 'health_medication',
    description: 'Medication error or near miss — manager review required.',
    workflowStatus: 'manager_review_required',
    workspaceType: 'medication-note-error',
    route: '/medication',
    requiresManagerReview: true,
    therapeuticPrompt:
      'What happened? What medication was involved? Who was informed? What immediate action was taken? What monitoring/follow-up is needed? Do not rely on AI for medication decisions.',
    qualityChecklist: [
      'What happened — facts only',
      'Medication involved',
      'Who was informed',
      'Immediate action',
      'Monitoring and follow-up',
      'Manager review triggered'
    ],
    tags: ['medication error', 'Reg 10'],
    priority: 'P0',
    status: 'partial'
  }),
  buildCatalogueForm({
    id: 'body-map',
    title: 'Body map / injury chart',
    category: 'health_medication',
    description: 'Body map linked to injury observation.',
    workflowStatus: 'manager_review_required',
    workspaceType: 'injury-body-map',
    workflowSegment: 'body-map',
    routeKind: 'existing_workflow',
    therapeuticPrompt:
      'What was observed on the body? What did the child say? Map or describe location factually. What health follow-up?',
    qualityChecklist: [
      'Observation factual',
      'Child explanation',
      'Body map or location described',
      'Medical advice',
      'Manager review considered'
    ],
    tags: ['body map', 'injury'],
    priority: 'P0',
    status: 'built'
  }),
  buildCatalogueForm({
    id: 'sleep-wellbeing',
    title: 'Sleep / wellbeing note',
    category: 'health_medication',
    description: 'Sleep, mood and wellbeing across the day.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'How was mood and wellbeing today? Sleep last night? What support helped? What should be monitored?',
    qualityChecklist: [
      'Presentation described',
      'Sleep if relevant',
      'Triggers or protectors',
      'Support offered',
      'Follow-up'
    ],
    tags: ['wellbeing', 'sleep'],
    priority: 'P2'
  }),
  // —— Education / family ——
  buildCatalogueForm({
    id: 'school-contact',
    title: 'School contact',
    category: 'education_family',
    description: 'Contact with school or education provider.',
    workflowStatus: 'draft_workspace',
    workspaceType: 'education-note',
    therapeuticPrompt:
      'Who was contacted? What was discussed? What does this mean for the child’s learning? What actions were agreed?',
    qualityChecklist: [
      'Contact facts',
      'Child impact',
      'Barriers or strengths',
      'Actions agreed',
      'Shared with care team'
    ],
    tags: ['education', 'Reg 8'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'social-worker-visit',
    title: 'Social worker visit',
    category: 'education_family',
    description: 'Social worker visit note.',
    workflowStatus: 'draft_workspace',
    workspaceType: 'professional-visit',
    workflowSegment: 'appointment-outcome',
    therapeuticPrompt:
      'What was discussed? What did the child say? What decisions or actions were agreed? Who will follow up?',
    qualityChecklist: [
      'Visit facts',
      'Child voice',
      'Decisions recorded',
      'Actions with owners',
      'Chronology updated'
    ],
    tags: ['social worker', 'Reg 11'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'iro-visit',
    title: 'IRO visit',
    category: 'education_family',
    description: 'Independent reviewing officer visit.',
    workflowStatus: 'draft_workspace',
    workspaceType: 'professional-visit',
    therapeuticPrompt:
      'What was the purpose of the visit? What did the child say? What scrutiny or actions were agreed?',
    qualityChecklist: [
      'Purpose of visit',
      'Child participation',
      'Issues raised',
      'Actions agreed',
      'Plan updates noted'
    ],
    tags: ['IRO', 'review'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'lac-review-meeting',
    title: 'LAC / review meeting note',
    category: 'education_family',
    description: 'Looked-after child review or statutory review meeting.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What meeting took place? Who attended? What did the child say? What decisions and actions were recorded?',
    qualityChecklist: [
      'Meeting type and date',
      'Attendees',
      'Child voice',
      'Decisions',
      'Actions and owners'
    ],
    tags: ['LAC', 'review', 'Reg 7'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'multi-agency-meeting',
    title: 'Multi-agency meeting note',
    category: 'education_family',
    description: 'Team around the child or multi-agency meeting.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What was the purpose? What information was shared? What did the child say? What actions were agreed?',
    qualityChecklist: [
      'Purpose and attendees',
      'Information shared proportionately',
      'Child voice',
      'Risk and safety themes',
      'Actions with timescales'
    ],
    tags: ['multi-agency', 'TAC'],
    priority: 'P1'
  }),
  // —— Plans / reviews ——
  buildCatalogueForm({
    id: 'care-plan-update',
    title: 'Care plan update note',
    category: 'planning_review',
    description: 'Updates linked to the child’s care plan.',
    workflowStatus: 'opens_existing_workflow',
    route: '/plans',
    routeKind: 'existing_workflow',
    requiresChild: true,
    therapeuticPrompt:
      'What part of the care plan is this update about? What changed? What does the child think? What actions follow?',
    qualityChecklist: [
      'Plan section identified',
      'Changes described',
      'Child voice',
      'Actions and owners',
      'Review date'
    ],
    tags: ['care plan', 'Reg 7'],
    priority: 'P1',
    status: 'partial'
  }),
  buildCatalogueForm({
    id: 'placement-plan-update',
    title: 'Placement plan update',
    category: 'planning_review',
    description: 'Placement plan or placement agreement update.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What placement issue or progress is being recorded? What does the child say? What needs to change in the plan?',
    qualityChecklist: [
      'Placement theme clear',
      'Child voice',
      'Risks or strengths',
      'Actions',
      'Notification if required'
    ],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'risk-assessment-update',
    title: 'Risk assessment update',
    category: 'planning_review',
    description: 'Risk assessment review or update note.',
    workflowStatus: 'manager_review_required',
    therapeuticPrompt:
      'What risks were reviewed? What is new? What controls or support reduce risk? What does the child say?',
    qualityChecklist: [
      'Risks named clearly',
      'Controls and support',
      'Child voice',
      'Manager review if significant change',
      'Review date'
    ],
    tags: ['risk', 'Reg 12'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'behaviour-support-plan-update',
    title: 'Behaviour support plan update',
    category: 'planning_review',
    description: 'BSP or positive behaviour support plan update.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What behaviours are we understanding? What strategies work? What does the child need adults to do differently?',
    qualityChecklist: [
      'Triggers and patterns',
      'Strategies that help',
      'Child voice',
      'Adult consistency',
      'Review date'
    ],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'pathway-independence-plan',
    title: 'Pathway / independence plan note',
    category: 'planning_review',
    description: 'Pathway plan or independence preparation.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What independence goal was worked on? What did the young person do? What support is needed next?',
    qualityChecklist: [
      'Goal linked',
      'Young person actions',
      'Adult support',
      'Barriers',
      'Next steps'
    ],
    tags: ['pathway', 'independence'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'review-meeting-note',
    title: 'Review meeting note',
    category: 'planning_review',
    description: 'Internal or placement review meeting.',
    workflowStatus: 'draft_workspace',
    therapeuticPrompt:
      'What was reviewed? What progress for the child? What actions and accountability were agreed?',
    qualityChecklist: [
      'Scope of review',
      'Progress evidence',
      'Child voice',
      'Actions',
      'Oversight'
    ],
    priority: 'P1'
  }),
  // —— Governance ——
  buildCatalogueForm({
    id: 'management-oversight',
    title: 'Management oversight note',
    category: 'manager_governance',
    description: 'Leadership oversight of practice or incidents.',
    workflowStatus: 'manager_review_required',
    requiresChild: false,
    therapeuticPrompt:
      'What was overseen? What evidence was considered? What assurance or improvement is needed?',
    qualityChecklist: [
      'Scope of oversight',
      'Evidence considered',
      'Findings',
      'Actions and owners',
      'Reg 35 leadership'
    ],
    tags: ['leadership', 'Reg 35'],
    priority: 'P1'
  }),
  buildCatalogueForm({
    id: 'action-plan-note',
    title: 'Action plan note',
    category: 'manager_governance',
    description: 'Actions arising from reviews or inspections.',
    workflowStatus: 'opens_existing_workflow',
    route: '/actions',
    routeKind: 'existing_workflow',
    requiresChild: false,
    therapeuticPrompt:
      'What action is required? Who owns it? What is the timescale? How will impact for children be checked?',
    qualityChecklist: [
      'Action specific',
      'Owner named',
      'Timescale',
      'Success criteria',
      'Child impact considered'
    ],
    tags: ['actions', 'QS leadership'],
    priority: 'P1',
    status: 'built'
  }),
  buildCatalogueForm({
    id: 'ofsted-evidence',
    title: 'Ofsted / inspection evidence note',
    category: 'manager_governance',
    description: 'Evidence supporting inspection or SCCIF themes.',
    workflowStatus: 'draft_workspace',
    requiresChild: false,
    therapeuticPrompt:
      'What evidence does this provide? Which SCCIF / quality theme? What impact for children? What improvement is needed?',
    qualityChecklist: [
      'Evidence described',
      'Theme/standard linked',
      'Impact for children',
      'Gap or strength',
      'Improvement action'
    ],
    tags: ['Ofsted', 'SCCIF'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'policy-acknowledgement',
    title: 'Policy acknowledgement',
    category: 'manager_governance',
    description: 'Staff acknowledgement of policy or procedure.',
    workflowStatus: 'opens_existing_workflow',
    route: '/documents',
    routeKind: 'existing_workflow',
    requiresChild: false,
    therapeuticPrompt:
      'Which policy was acknowledged? By whom? Any learning or clarification needed?',
    qualityChecklist: [
      'Policy named',
      'Staff member',
      'Date',
      'Understanding checked',
      'Follow-up training if needed'
    ],
    priority: 'P2'
  }),
  // —— Workforce / environment ——
  buildCatalogueForm({
    id: 'staff-supervision',
    title: 'Staff supervision note',
    category: 'workforce',
    description: '1:1 or group supervision record.',
    workflowStatus: 'opens_existing_workflow',
    route: '/staff/supervision',
    routeKind: 'existing_workflow',
    requiresChild: false,
    therapeuticPrompt:
      'What was discussed in supervision? What learning? What actions for the practitioner or manager?',
    qualityChecklist: [
      'Focus of supervision',
      'Reflection supported',
      'Actions agreed',
      'Wellbeing considered',
      'Reg 35 workforce'
    ],
    tags: ['supervision', 'Reg 35'],
    priority: 'P1',
    status: 'built'
  }),
  buildCatalogueForm({
    id: 'staff-wellbeing-check-in',
    title: 'Staff wellbeing check-in',
    category: 'workforce',
    description: 'Workforce wellbeing and support note.',
    workflowStatus: 'draft_workspace',
    requiresChild: false,
    therapeuticPrompt:
      'How is the staff member? What support was offered? What follow-up is needed? No clinical diagnosis in this note.',
    qualityChecklist: [
      'Check-in context',
      'Support offered',
      'Confidentiality considered',
      'Follow-up',
      'Escalation if required'
    ],
    tags: ['wellbeing', 'workforce'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'team-meeting',
    title: 'Team meeting note',
    category: 'workforce',
    description: 'Team meeting, reflection or practice discussion.',
    workflowStatus: 'draft_workspace',
    requiresChild: false,
    therapeuticPrompt:
      'What was the purpose of the meeting? Key points for children’s care? Actions agreed?',
    qualityChecklist: [
      'Purpose',
      'Children’s care themes',
      'Actions',
      'Learning',
      'Chair or minute owner'
    ],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'shift-leadership',
    title: 'Shift leadership note',
    category: 'workforce',
    description: 'Shift leader oversight and direction.',
    workflowStatus: 'draft_workspace',
    requiresChild: false,
    therapeuticPrompt:
      'What did shift leadership oversee? Risks, staffing, child needs? What handover points?',
    qualityChecklist: [
      'Shift overview',
      'Risks',
      'Staffing',
      'Child-specific points',
      'Handover'
    ],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'safer-recruitment-note',
    title: 'Safer recruitment document note',
    category: 'workforce',
    description: 'Safer recruitment or workforce compliance evidence.',
    workflowStatus: 'draft_workspace',
    requiresChild: false,
    therapeuticPrompt:
      'What recruitment or workforce document is being noted? Stage in process? Any concerns raised?',
    qualityChecklist: [
      'Document type',
      'Stage in process',
      'Checks completed',
      'Concerns if any',
      'HR follow-up'
    ],
    tags: ['safer recruitment', 'Reg 35'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'medication-audit',
    title: 'Medication audit note',
    category: 'workforce',
    description: 'Medication storage or administration audit.',
    workflowStatus: 'manager_review_required',
    requiresChild: false,
    therapeuticPrompt:
      'What was audited? What was found? What immediate action? What follow-up for compliance?',
    qualityChecklist: [
      'Scope of audit',
      'Findings factual',
      'Immediate actions',
      'Manager informed',
      'Follow-up date'
    ],
    tags: ['medication audit', 'Reg 10'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'health-safety-check',
    title: 'Health and safety check',
    category: 'environment',
    description: 'Health and safety walkaround or check.',
    workflowStatus: 'draft_workspace',
    requiresChild: false,
    therapeuticPrompt:
      'What area was checked? What was safe? Any hazards? What action was taken?',
    qualityChecklist: [
      'Area checked',
      'Hazards identified',
      'Actions taken',
      'Who notified',
      'Review date'
    ],
    tags: ['H&S', 'Reg 35'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'fire-drill-evacuation',
    title: 'Fire drill / evacuation',
    category: 'environment',
    description: 'Fire drill or evacuation exercise record.',
    workflowStatus: 'draft_workspace',
    requiresChild: false,
    therapeuticPrompt:
      'What drill took place? How did children and staff respond? Any issues? What improvement actions?',
    qualityChecklist: [
      'Date and type',
      'Evacuation timing',
      'Children supported',
      'Issues found',
      'Improvement actions'
    ],
    tags: ['fire', 'evacuation', 'Reg 35'],
    priority: 'P2'
  }),
  buildCatalogueForm({
    id: 'maintenance-environment',
    title: 'Maintenance / environment check',
    category: 'environment',
    description: 'Maintenance, repairs or environment safety.',
    workflowStatus: 'draft_workspace',
    requiresChild: false,
    therapeuticPrompt:
      'What maintenance or environment issue was found? Risk to children? What repair or action was requested?',
    qualityChecklist: [
      'Issue described',
      'Risk to children',
      'Action requested',
      'Temporary controls',
      'Completion follow-up'
    ],
    tags: ['maintenance', 'environment'],
    priority: 'P2'
  })
]
