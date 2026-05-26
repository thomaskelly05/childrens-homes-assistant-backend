import type { RecordingFormCategory } from '@/lib/record/recording-form-registry'
import { recordingFormById } from '@/lib/record/recording-form-registry'

export type RecordingGuidanceSection = {
  heading: string
  guidance: string
  goodRecordShouldInclude: string[]
  avoid: string[]
  examples?: string[]
  requiredForReview?: boolean
}

export type RecordingFormGuidance = {
  formId: string
  title: string
  tone: string
  purpose: string
  adultGuidanceSections: RecordingGuidanceSection[]
  childVoiceGuidance: string
  adultResponseGuidance: string
  followUpGuidance: string
  planImpactGuidance: string
  reviewGuidance: string
  orbLiveCoachPrompts: string[]
  grammarStyleRules: string[]
}

export const FACTUAL_ACCURACY_WARNING =
  'Only use suggested wording if it accurately reflects what happened.'

export const THERAPEUTIC_LANGUAGE_SUBSTITUTIONS: Array<{
  pattern: RegExp
  label: string
  suggestion: string
}> = [
  { pattern: /\bkicked off\b/i, label: 'kicked off', suggestion: 'became distressed / dysregulated' },
  {
    pattern: /\battention[\s-]?seeking\b/i,
    label: 'attention seeking',
    suggestion: 'appeared to be seeking connection/reassurance'
  },
  { pattern: /\brefused\b/i, label: 'refused', suggestion: 'declined / was not ready / found it difficult to' },
  {
    pattern: /\bmanipulative\b/i,
    label: 'manipulative',
    suggestion: 'the behaviour may have been an attempt to meet a need'
  },
  {
    pattern: /\bnon[\s-]?compliant\b/i,
    label: 'non-compliant',
    suggestion: 'did not follow the request at that time'
  }
]

const CATEGORY_GUIDANCE: Record<RecordingFormCategory, Omit<RecordingFormGuidance, 'formId' | 'title'>> = {
  daily_life: {
    tone: 'warm, balanced, ordinary life',
    purpose: 'Capture the child’s lived experience, routines, relationships and everyday moments.',
    adultGuidanceSections: [
      {
        heading: 'What happened today?',
        guidance:
          'Describe the child’s day in a balanced way. Include ordinary moments, positives, worries, routines, relationships and the child’s voice where known.',
        goodRecordShouldInclude: ['Child presentation', 'Routines and activities', 'Positives and worries', 'Child voice where known'],
        avoid: ['Judgemental labels', 'Only negative focus', 'Adult interpretation presented as fact'],
        requiredForReview: false
      },
      {
        heading: 'What did adults notice and do?',
        guidance: 'Record what adults observed and how they supported the child through the day.',
        goodRecordShouldInclude: ['Adult observations', 'Support offered', 'What helped'],
        avoid: ['Blame language', 'Vague “fine” with no detail'],
        requiredForReview: false
      }
    ],
    childVoiceGuidance: 'Include what the child said, showed or communicated about their day.',
    adultResponseGuidance: 'Describe how adults supported routines, regulation and connection.',
    followUpGuidance: 'Note anything the next shift or key adult should know.',
    planImpactGuidance: 'Consider whether this affects daily routines, contact or behaviour support plans.',
    reviewGuidance: 'Usually no manager review unless safeguarding or serious concern emerges.',
    orbLiveCoachPrompts: [
      'Help me write a balanced daily note.',
      'How can I include the child’s voice in this note?',
      'What ordinary positives should I mention?'
    ],
    grammarStyleRules: ['Use present or past tense consistently', 'Name observable behaviour', 'Keep tone warm and professional']
  },
  voice_direct_work: {
    tone: 'child-centred, relational, reflective',
    purpose: 'Capture the child’s wishes, feelings, direct work and relational progress.',
    adultGuidanceSections: [
      {
        heading: 'What did the child share?',
        guidance:
          'Capture the child’s wishes, feelings and views. Include what adults explored, what helped and agreed next steps.',
        goodRecordShouldInclude: ['Child words where possible', 'Wishes and feelings', 'What was explored'],
        avoid: ['Speaking for the child without basis', 'Therapeutic jargon without child voice'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Prioritise the child’s own words, wishes and feelings.',
    adultResponseGuidance: 'Record how adults listened, validated and responded therapeutically.',
    followUpGuidance: 'Agree and record next direct-work or keywork steps.',
    planImpactGuidance: 'Link to care plan, pathway plan or wishes-and-feelings documentation.',
    reviewGuidance: 'Keywork and child voice records should show child-centred practice.',
    orbLiveCoachPrompts: ['How do I record child voice respectfully?', 'What follow-up should keywork include?'],
    grammarStyleRules: ['Use “the child said/shared” where quoting', 'Avoid adult interpretation as child fact']
  },
  safeguarding_incident: {
    tone: 'factual, sequence-focused, escalation-aware',
    purpose: 'Record what was noticed with clarity, immediate actions and who was informed.',
    adultGuidanceSections: [
      {
        heading: 'What was noticed, said or disclosed?',
        guidance:
          'Use clear factual wording. Record exact words where important. Do not investigate or interpret beyond what is known. Include who was informed and immediate safety actions.',
        goodRecordShouldInclude: ['Who, when, where', 'Exact words if relevant', 'Immediate safety actions', 'Who was informed'],
        avoid: ['Investigation conclusions', 'Opinion presented as fact', 'Unnecessary third-party detail'],
        requiredForReview: true
      },
      {
        heading: 'What happened before, during and after?',
        guidance:
          'Record the sequence clearly. Separate facts from interpretation. Include adult responses, de-escalation, injury checks, child debrief and follow-up.',
        goodRecordShouldInclude: ['Sequence/timeline', 'Adult response', 'De-escalation', 'Follow-up'],
        avoid: ['Blame', 'Speculation about intent'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record the child’s words where disclosed; do not paraphrase sensitive disclosures inaccurately.',
    adultResponseGuidance: 'Record immediate safety actions, who was informed and procedures followed.',
    followUpGuidance: 'Record safeguarding escalation, manager notification and agreed next steps.',
    planImpactGuidance: 'Flag impact on risk assessment, contact plans and safeguarding plans.',
    reviewGuidance: 'Manager/safeguarding review required. Do not treat as complete until reviewed.',
    orbLiveCoachPrompts: [
      'Help me separate facts from interpretation.',
      'What immediate actions should I record?',
      'Who needs to be informed for safeguarding?'
    ],
    grammarStyleRules: ['Factual sequence language', 'Exact quotes where critical', 'No speculative intent']
  },
  missing_return: {
    tone: 'factual, timeline-focused, return-centred',
    purpose: 'Document absence, notifications, return and child voice on return.',
    adultGuidanceSections: [
      {
        heading: 'When was absence noticed and who was informed?',
        guidance: 'Record timeline, searches, notifications to manager/police/social worker as per procedure.',
        goodRecordShouldInclude: ['Time noticed', 'Notifications', 'Return time and presentation'],
        avoid: ['Blame', 'Missing return interview offer'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Include the young person’s voice on return where possible.',
    adultResponseGuidance: 'Record return support, welfare check and procedures followed.',
    followUpGuidance: 'Record return interview offer, missing plan review and notifications.',
    planImpactGuidance: 'Update missing/RHI plan and risk assessment impacts.',
    reviewGuidance: 'Manager review required for missing episodes.',
    orbLiveCoachPrompts: ['What should a missing episode record include?', 'How do I record return safely?'],
    grammarStyleRules: ['Timeline clarity', 'Procedure language without blame']
  },
  health_medication: {
    tone: 'clinical-factual, procedure-aware',
    purpose: 'Record health events, appointments, medication activity and follow-up.',
    adultGuidanceSections: [
      {
        heading: 'What health or medication activity took place?',
        guidance:
          'Record appointment reason, outcome, medication/advice, follow-up and plan impact. Do not rely on AI for medication decisions.',
        goodRecordShouldInclude: ['Reason for appointment/activity', 'Outcome', 'Advice given', 'Follow-up'],
        avoid: ['Medical diagnosis by staff', 'Missing error escalation'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Include how the child experienced the appointment or health activity.',
    adultResponseGuidance: 'Record advocacy, consent and support offered.',
    followUpGuidance: 'Record GP/NHS follow-up, notifications and monitoring.',
    planImpactGuidance: 'Flag health plan, MAR chart and risk assessment updates.',
    reviewGuidance: 'Medication errors require manager review and follow policy.',
    orbLiveCoachPrompts: ['What should a health appointment note include?', 'How do I record a medication concern factually?'],
    grammarStyleRules: ['Precise medication names/doses if policy allows', 'Outcome-focused wording']
  },
  education_family: {
    tone: 'relational, progress-focused',
    purpose: 'Record education engagement, family contact and relational impact.',
    adultGuidanceSections: [
      {
        heading: 'What happened during contact or education?',
        guidance:
          'For family time: relationships, child presentation before/during/after, positives, worries, risk, contact plan impact. For education: attendance, engagement, progress, barriers, PEP/targets impact.',
        goodRecordShouldInclude: ['Presentation before/during/after', 'Engagement', 'Positives and worries'],
        avoid: ['Contact judgement without evidence', 'Missing plan impact'],
        requiredForReview: false
      }
    ],
    childVoiceGuidance: 'Include the child’s experience of contact or school.',
    adultResponseGuidance: 'Record supervision, preparation and de-brief support.',
    followUpGuidance: 'Record contact/education follow-up and notifications.',
    planImpactGuidance: 'Consider contact plan, PEP, EHCP and education plan impacts.',
    reviewGuidance: 'Escalate safeguarding or serious contact concerns.',
    orbLiveCoachPrompts: ['How do I record family time balance?', 'What education progress should I capture?'],
    grammarStyleRules: ['Balanced contact language', 'Separate fact from worry']
  },
  planning_review: {
    tone: 'structured, outcome-focused',
    purpose: 'Capture planning meetings, reviews and agreed actions.',
    adultGuidanceSections: [
      {
        heading: 'What was reviewed and agreed?',
        guidance: 'Record meeting purpose, child participation, decisions, actions, owners and timescales.',
        goodRecordShouldInclude: ['Child participation', 'Decisions', 'Actions and owners', 'Timescales'],
        avoid: ['Vague actions', 'Missing child voice in planning'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record how the child participated and what they wanted.',
    adultResponseGuidance: 'Record how adults advocated for the child in the meeting.',
    followUpGuidance: 'List actions, responsible adults and review dates.',
    planImpactGuidance: 'Explicitly note which plans were updated.',
    reviewGuidance: 'Manager oversight for significant plan changes.',
    orbLiveCoachPrompts: ['What should a review meeting note include?'],
    grammarStyleRules: ['Action-oriented language', 'Clear ownership']
  },
  manager_governance: {
    tone: 'evidence-based, oversight-focused',
    purpose: 'Support manager review, Reg 44/45 evidence and governance oversight.',
    adultGuidanceSections: [
      {
        heading: 'What evidence or issue is being recorded?',
        guidance:
          'For Reg 44: evidence source, issue, action, responsible person, timescale, oversight. For Reg 45: quality theme, evidence, impact, improvement action, child outcome.',
        goodRecordShouldInclude: ['Evidence source', 'Issue/theme', 'Action owner', 'Timescale'],
        avoid: ['Unsubstantiated claims', 'Missing improvement action'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Include child outcome impact where relevant.',
    adultResponseGuidance: 'Record managerial decisions and oversight.',
    followUpGuidance: 'Record review dates and escalation paths.',
    planImpactGuidance: 'Link to quality improvement and service development plans.',
    reviewGuidance: 'Governance records require appropriate oversight sign-off.',
    orbLiveCoachPrompts: ['Help me structure Reg 44 evidence.', 'What improvement action should I record?'],
    grammarStyleRules: ['Evidence-based statements', 'Clear accountability']
  },
  workforce: {
    tone: 'professional, supportive, reflective',
    purpose: 'Record staff supervision, debrief, wellbeing and workforce notes.',
    adultGuidanceSections: [
      {
        heading: 'What workforce activity took place?',
        guidance: 'Record supervision themes, debrief after incidents, wellbeing check-ins and agreed actions.',
        goodRecordShouldInclude: ['Purpose', 'Themes discussed', 'Actions agreed'],
        avoid: ['Unnecessary personal detail', 'Blame without restorative focus'],
        requiredForReview: false
      }
    ],
    childVoiceGuidance: 'Link back to child impact where the workforce note relates to a child event.',
    adultResponseGuidance: 'Record support offered to staff and learning identified.',
    followUpGuidance: 'Record supervision actions and follow-up dates.',
    planImpactGuidance: 'Note if practice changes affect child care plans.',
    reviewGuidance: 'Manager review for serious debriefs after high-risk incidents.',
    orbLiveCoachPrompts: ['What should a staff debrief include?'],
    grammarStyleRules: ['Restorative professional tone', 'Learning-focused language']
  },
  environment: {
    tone: 'factual, safety-focused',
    purpose: 'Record environment checks, maintenance, searches and safety activity.',
    adultGuidanceSections: [
      {
        heading: 'What environment or safety activity took place?',
        guidance:
          'For room search: reason, proportionality, who authorised, child informed, items found, dignity, follow-up.',
        goodRecordShouldInclude: ['Reason', 'Authorisation', 'Child informed', 'Outcome', 'Follow-up'],
        avoid: ['Missing dignity considerations', 'Disproportionate detail'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record how the child was informed and supported.',
    adultResponseGuidance: 'Record authorisation, procedure and dignity preserved.',
    followUpGuidance: 'Record follow-up actions and notifications.',
    planImpactGuidance: 'Consider behaviour support and safety plan impacts.',
    reviewGuidance: 'Room searches and safety incidents may need manager review.',
    orbLiveCoachPrompts: ['How do I record a room search proportionately?'],
    grammarStyleRules: ['Procedural factual language', 'Dignity-preserving wording']
  },
  documents_evidence: {
    tone: 'evidence-focused, clear purpose',
    purpose: 'Record documents received, evidence filed and inspection relevance.',
    adultGuidanceSections: [
      {
        heading: 'What document or evidence is being noted?',
        guidance: 'Identify the document, why it matters, linkage to child/home and any follow-up.',
        goodRecordShouldInclude: ['Document identified', 'Purpose', 'Linkage', 'Follow-up'],
        avoid: ['Unnecessary duplication of sensitive content'],
        requiredForReview: false
      }
    ],
    childVoiceGuidance: 'Note child relevance where applicable.',
    adultResponseGuidance: 'Record who filed/reviewed and why.',
    followUpGuidance: 'Record any actions from the document.',
    planImpactGuidance: 'Link to care plan or inspection evidence areas.',
    reviewGuidance: 'Manager review for sensitive evidence.',
    orbLiveCoachPrompts: ['What should an evidence note include?'],
    grammarStyleRules: ['Clear reference language', 'Minimal unnecessary detail']
  }
}

/** Form-specific guidance overrides — high-risk and P0 forms get unique copy. */
const FORM_SPECIFIC_GUIDANCE: Partial<Record<string, Omit<RecordingFormGuidance, 'formId' | 'title'>>> = {
  'daily-note': {
    tone: 'warm, balanced, ordinary life',
    purpose: 'Capture an ordinary day with the child’s experience at the centre.',
    adultGuidanceSections: [
      {
        heading: 'What happened today?',
        guidance:
          'Describe the child’s day in a balanced way. Include ordinary moments, positives, worries, routines, relationships and the child’s voice where known.',
        goodRecordShouldInclude: ['Routines', 'Positives', 'Worries', 'Child voice', 'Relationships'],
        avoid: ['Only incidents', 'Judgemental labels', 'Vague “fine”'],
        requiredForReview: false
      }
    ],
    childVoiceGuidance: 'What did the child say, show or communicate about their day?',
    adultResponseGuidance: 'What did adults notice and do to support routines, regulation and connection?',
    followUpGuidance: 'What should the next adults know?',
    planImpactGuidance: 'Does this affect behaviour support, contact or daily routines?',
    reviewGuidance: 'Usually no manager review unless a concern emerges.',
    orbLiveCoachPrompts: ['Help me write a balanced daily note.', 'How can I include ordinary positives?'],
    grammarStyleRules: THERAPEUTIC_LANGUAGE_SUBSTITUTIONS.map((s) => `Prefer “${s.suggestion}” over “${s.label}” where accurate`)
  },
  incident: {
    tone: 'factual, sequence-focused',
    purpose: 'Record incidents with clear sequence, adult response and repair.',
    adultGuidanceSections: [
      {
        heading: 'What happened before, during and after?',
        guidance:
          'Record the sequence clearly. Separate facts from interpretation. Include adult responses, de-escalation, injury checks, child debrief and follow-up.',
        goodRecordShouldInclude: ['Antecedent', 'Sequence', 'Adult response', 'Impact', 'Debrief', 'Repair'],
        avoid: ['Blame', 'Intent speculation'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Include what the child communicated before, during or after the incident.',
    adultResponseGuidance: 'Record de-escalation, co-regulation, procedures and injury checks.',
    followUpGuidance: 'Record repair, debrief and notifications.',
    planImpactGuidance: 'Consider behaviour support plan and risk assessment impact.',
    reviewGuidance: 'Manager review likely required.',
    orbLiveCoachPrompts: ['Help me record incident sequence factually.', 'What repair should I include?'],
    grammarStyleRules: ['Sequence language (first, then, after)', 'Observable behaviour']
  },
  'safeguarding-concern': {
    tone: 'factual, exact words, escalation-first',
    purpose: 'Record safeguarding concerns without investigation or interpretation beyond known facts.',
    adultGuidanceSections: [
      {
        heading: 'What was noticed, said or disclosed?',
        guidance:
          'Use clear factual wording. Record exact words where important. Do not investigate or interpret beyond what is known. Include who was informed and immediate safety actions.',
        goodRecordShouldInclude: ['Exact words if relevant', 'Who/when/where', 'Immediate action', 'Who informed'],
        avoid: ['Investigation conclusions', 'Third-party speculation'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record the child’s words accurately where disclosed.',
    adultResponseGuidance: 'Record immediate safety actions and safeguarding procedures followed.',
    followUpGuidance: 'Record escalation to safeguarding lead/manager and agreed next steps.',
    planImpactGuidance: 'Flag safeguarding plan and risk assessment impacts.',
    reviewGuidance: 'Safeguarding review required — do not treat as complete until reviewed.',
    orbLiveCoachPrompts: ['Help me record a safeguarding concern factually.', 'What immediate actions should I note?'],
    grammarStyleRules: ['Exact quote markers where needed', 'No interpretive conclusions']
  },
  'physical-intervention': {
    tone: 'procedural, de-escalation-first, legal clarity',
    purpose: 'Record physical intervention with de-escalation, duration, holds, checks and debrief.',
    adultGuidanceSections: [
      {
        heading: 'De-escalation and intervention sequence',
        guidance:
          'Record de-escalation attempted first, legal/procedural facts, duration, holds used, injury checks, child debrief, staff debrief and manager notification.',
        goodRecordShouldInclude: ['De-escalation first', 'Duration', 'Holds', 'Injury checks', 'Debriefs', 'Manager notified'],
        avoid: ['Missing duration', 'Judgemental language'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record the child’s presentation and any communication during/after intervention.',
    adultResponseGuidance: 'Record holds, checks, debrief offers and manager notification.',
    followUpGuidance: 'Record review, learning and plan updates.',
    planImpactGuidance: 'Update behaviour support and risk plans.',
    reviewGuidance: 'Manager review required for all physical interventions.',
    orbLiveCoachPrompts: ['What must a restraint record include?', 'Help me record de-escalation first.'],
    grammarStyleRules: ['Procedural factual tone', 'Duration and hold clarity']
  },
  'family-time': {
    tone: 'relational, balanced, contact-aware',
    purpose: 'Record family contact with child presentation and contact plan relevance.',
    adultGuidanceSections: [
      {
        heading: 'Contact before, during and after',
        guidance:
          'Record relationships, child’s presentation before/during/after, positives, worries, risk and contact plan impact.',
        goodRecordShouldInclude: ['Presentation changes', 'Positives', 'Worries', 'Supervision'],
        avoid: ['Contact blame without evidence'],
        requiredForReview: false
      }
    ],
    childVoiceGuidance: 'How did the child experience contact?',
    adultResponseGuidance: 'Record preparation, supervision and de-brief support.',
    followUpGuidance: 'Record contact plan follow-up and notifications.',
    planImpactGuidance: 'Note contact plan and risk assessment impacts.',
    reviewGuidance: 'Escalate safeguarding concerns from contact.',
    orbLiveCoachPrompts: ['How do I record family time balance?'],
    grammarStyleRules: ['Balanced relational language']
  },
  'health-appointment': {
    tone: 'clinical-factual',
    purpose: 'Record health appointments with outcome and follow-up.',
    adultGuidanceSections: [
      {
        heading: 'Appointment details and outcome',
        guidance: 'Record appointment reason, outcome, medication/advice, follow-up and plan impact.',
        goodRecordShouldInclude: ['Reason', 'Outcome', 'Advice', 'Follow-up'],
        avoid: ['Staff making medical diagnoses'],
        requiredForReview: false
      }
    ],
    childVoiceGuidance: 'How did the child experience the appointment?',
    adultResponseGuidance: 'Record advocacy and support during the appointment.',
    followUpGuidance: 'Record GP/specialist follow-up.',
    planImpactGuidance: 'Update health plan and MAR if relevant.',
    reviewGuidance: 'Escalate serious health concerns.',
    orbLiveCoachPrompts: ['What should a health appointment note include?'],
    grammarStyleRules: ['Outcome-focused clinical language']
  },
  'education-note': {
    tone: 'progress-focused, child-centred',
    purpose: 'Record school engagement, attendance and barriers.',
    adultGuidanceSections: [
      {
        heading: 'Education engagement and progress',
        guidance: 'Record attendance, engagement, progress, barriers and PEP/targets impact.',
        goodRecordShouldInclude: ['Attendance', 'Engagement', 'Progress', 'Barriers'],
        avoid: ['Blame for school difficulties'],
        requiredForReview: false
      }
    ],
    childVoiceGuidance: 'Include the child’s view of school where known.',
    adultResponseGuidance: 'Record advocacy with school and support offered.',
    followUpGuidance: 'Record PEP/target follow-up.',
    planImpactGuidance: 'Note PEP, EHCP and education plan impacts.',
    reviewGuidance: 'Escalate exclusion or safeguarding at school.',
    orbLiveCoachPrompts: ['How do I record education progress?'],
    grammarStyleRules: ['Strengths-based education language']
  },
  keywork: {
    tone: 'relational, child-led',
    purpose: 'Capture direct keywork with child voice and agreed next steps.',
    adultGuidanceSections: [
      {
        heading: 'What did the child share?',
        guidance:
          'Capture the child’s wishes, feelings and views. Include what adults explored, what helped and agreed next steps.',
        goodRecordShouldInclude: ['Child voice', 'Wishes/feelings', 'Direct work', 'Next steps'],
        avoid: ['Adult speaking for child without basis'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Prioritise the child’s own words and wishes.',
    adultResponseGuidance: 'Record relational work and what helped.',
    followUpGuidance: 'Agree next keywork session focus.',
    planImpactGuidance: 'Link to care plan and pathway plan.',
    reviewGuidance: 'Show child-centred direct work.',
    orbLiveCoachPrompts: ['How do I record keywork with child voice?'],
    grammarStyleRules: ['Child-led relational language']
  },
  'complaint-concern': {
    tone: 'rights-focused, advocacy-aware',
    purpose: 'Record complaints with child advocacy and response timescales.',
    adultGuidanceSections: [
      {
        heading: 'Complaint or concern details',
        guidance: 'Record the child’s words, advocacy, response, timescales, outcome and rights.',
        goodRecordShouldInclude: ['Child words', 'Advocacy', 'Response', 'Timescales', 'Outcome'],
        avoid: ['Dismissing concern language'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record the child’s complaint or concern in their words where possible.',
    adultResponseGuidance: 'Record advocacy and adult response with timescales.',
    followUpGuidance: 'Record outcome and further escalation if needed.',
    planImpactGuidance: 'Consider complaint policy and plan impacts.',
    reviewGuidance: 'Manager review required for complaints.',
    orbLiveCoachPrompts: ['How do I record a complaint fairly?'],
    grammarStyleRules: ['Rights-respecting neutral tone']
  },
  'room-search': {
    tone: 'procedural, dignity-preserving',
    purpose: 'Record room searches with proportionality and authorisation.',
    adultGuidanceSections: [
      {
        heading: 'Search reason and procedure',
        guidance: 'Record reason, proportionality, who authorised, child informed, items found, dignity and follow-up.',
        goodRecordShouldInclude: ['Reason', 'Authorisation', 'Child informed', 'Items found', 'Dignity', 'Follow-up'],
        avoid: ['Humiliating detail', 'Missing authorisation'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record how the child was informed and supported.',
    adultResponseGuidance: 'Record authorisation and procedure followed.',
    followUpGuidance: 'Record follow-up and manager notification if required.',
    planImpactGuidance: 'Consider behaviour support plan impact.',
    reviewGuidance: 'Manager review likely required.',
    orbLiveCoachPrompts: ['How do I record a room search proportionately?'],
    grammarStyleRules: ['Dignity-preserving procedural language']
  },
  'reg44-evidence': {
    tone: 'governance, evidence-based',
    purpose: 'Reg 44 evidence with issue, action and oversight.',
    adultGuidanceSections: [
      {
        heading: 'Reg 44 evidence entry',
        guidance: 'Record evidence source, issue, action, responsible person, timescale and oversight.',
        goodRecordShouldInclude: ['Evidence source', 'Issue', 'Action', 'Owner', 'Timescale'],
        avoid: ['Missing action owner'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Note child impact where relevant.',
    adultResponseGuidance: 'Record managerial oversight decisions.',
    followUpGuidance: 'Record review date and escalation.',
    planImpactGuidance: 'Link to quality improvement plans.',
    reviewGuidance: 'Governance oversight required.',
    orbLiveCoachPrompts: ['Help me structure Reg 44 evidence.'],
    grammarStyleRules: ['Evidence and accountability language']
  },
  'reg45-evidence': {
    tone: 'quality-improvement, outcome-focused',
    purpose: 'Reg 45 quality evidence with improvement actions.',
    adultGuidanceSections: [
      {
        heading: 'Reg 45 quality evidence',
        guidance: 'Record quality of care theme, evidence, impact, improvement action and child outcome.',
        goodRecordShouldInclude: ['Quality theme', 'Evidence', 'Impact', 'Improvement action', 'Child outcome'],
        avoid: ['Generic quality statements without evidence'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Include child outcome where evidenced.',
    adultResponseGuidance: 'Record oversight and improvement ownership.',
    followUpGuidance: 'Record timescales for improvement.',
    planImpactGuidance: 'Link to service development plans.',
    reviewGuidance: 'Quality governance review.',
    orbLiveCoachPrompts: ['What improvement action should Reg 45 evidence include?'],
    grammarStyleRules: ['Quality and outcome language']
  },
  disclosure: {
    tone: 'factual, exact words, immediate safety',
    purpose: 'Record disclosures with exact words and immediate safeguarding actions.',
    adultGuidanceSections: [
      {
        heading: 'What was disclosed?',
        guidance: 'Record exact words where possible. Do not investigate. Record immediate safety and who was informed.',
        goodRecordShouldInclude: ['Exact words', 'Who/when/where', 'Immediate action', 'Notifications'],
        avoid: ['Leading questions recorded as fact', 'Investigation conclusions'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record the child’s disclosure words accurately.',
    adultResponseGuidance: 'Record immediate safeguarding response.',
    followUpGuidance: 'Record safeguarding escalation.',
    planImpactGuidance: 'Flag safeguarding plan impacts.',
    reviewGuidance: 'Safeguarding review mandatory.',
    orbLiveCoachPrompts: ['Help me record a disclosure safely.'],
    grammarStyleRules: ['Exact quote where critical']
  },
  allegation: {
    tone: 'factual, non-prejudicial',
    purpose: 'Record allegations with facts, notifications and no investigation conclusions.',
    adultGuidanceSections: [
      {
        heading: 'Allegation details',
        guidance: 'Record who said what, when, immediate actions and notifications. Do not conclude guilt or innocence.',
        goodRecordShouldInclude: ['Allegation detail', 'Notifications', 'Immediate action'],
        avoid: ['Conclusions', 'Prejudicial language'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record words accurately where the child is involved.',
    adultResponseGuidance: 'Record safeguarding procedures and notifications.',
    followUpGuidance: 'Record external agency involvement.',
    planImpactGuidance: 'Safeguarding plan impacts.',
    reviewGuidance: 'Mandatory safeguarding/manager review.',
    orbLiveCoachPrompts: ['How do I record an allegation factually?'],
    grammarStyleRules: ['Non-prejudicial factual language']
  },
  'medication-error': {
    tone: 'clinical-factual, escalation-first',
    purpose: 'Record medication errors with immediate action and notifications.',
    adultGuidanceSections: [
      {
        heading: 'Medication error details',
        guidance: 'Record what happened, immediate action, who was informed, child welfare check and follow-up. Follow medication policy.',
        goodRecordShouldInclude: ['What happened', 'Immediate action', 'Notifications', 'Follow-up'],
        avoid: ['Delaying escalation', 'AI-based medication advice'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Record child presentation after the error.',
    adultResponseGuidance: 'Record welfare checks and notifications.',
    followUpGuidance: 'Record GP/pharmacy follow-up per policy.',
    planImpactGuidance: 'Update MAR and health plans.',
    reviewGuidance: 'Manager review mandatory for medication errors.',
    orbLiveCoachPrompts: ['What must a medication error record include?'],
    grammarStyleRules: ['Precise factual medication language']
  },
  'missing-episode': {
    tone: 'timeline-focused, return-aware',
    purpose: 'Document missing episode with notifications and return.',
    adultGuidanceSections: [
      {
        heading: 'Missing episode timeline',
        guidance: 'Record when noticed, searches, notifications, return and child presentation on return.',
        goodRecordShouldInclude: ['Timeline', 'Notifications', 'Return', 'Return support'],
        avoid: ['Blame', 'Missing notifications'],
        requiredForReview: true
      }
    ],
    childVoiceGuidance: 'Include child voice on return where possible.',
    adultResponseGuidance: 'Record search and notification procedures.',
    followUpGuidance: 'Return interview and plan review.',
    planImpactGuidance: 'Missing/RHI plan impact.',
    reviewGuidance: 'Manager review required.',
    orbLiveCoachPrompts: ['What should a missing record include?'],
    grammarStyleRules: ['Timeline clarity']
  }
}

function mergeGuidance(formId: string, title: string, base: Omit<RecordingFormGuidance, 'formId' | 'title'>): RecordingFormGuidance {
  return { formId, title, ...base }
}

export function guidanceForForm(formId: string, category?: RecordingFormCategory): RecordingFormGuidance {
  const form = recordingFormById(formId)
  const resolvedTitle = form?.title || formId.replace(/-/g, ' ')
  const resolvedCategory = category || form?.category || 'daily_life'

  const specific = FORM_SPECIFIC_GUIDANCE[formId]
  if (specific) {
    return mergeGuidance(formId, resolvedTitle, specific)
  }

  const categoryBase = CATEGORY_GUIDANCE[resolvedCategory]
  return mergeGuidance(formId, resolvedTitle, {
    ...categoryBase,
    purpose: categoryBase.purpose.replace('child', resolvedTitle.toLowerCase().includes('staff') ? 'staff' : 'child'),
    orbLiveCoachPrompts: [
      `What should this ${resolvedTitle.toLowerCase()} capture?`,
      ...categoryBase.orbLiveCoachPrompts.slice(0, 3)
    ]
  })
}

export function allFormIdsWithGuidance(formIds: string[]): { covered: string[]; missing: string[] } {
  const covered: string[] = []
  const missing: string[] = []
  for (const id of formIds) {
    const g = guidanceForForm(id)
    if (g.adultGuidanceSections.length && g.purpose) {
      covered.push(id)
    } else {
      missing.push(id)
    }
  }
  return { covered, missing }
}

export function headingGuidanceForForm(formId: string): RecordingGuidanceSection[] {
  return guidanceForForm(formId).adultGuidanceSections
}
