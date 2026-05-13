import { RegulatoryReference } from './types'

const sharedGoodEvidence = [
  'Chronology, evidence, action and report records can be traced back to source records.',
  'The record explains the child need, staff response, outcome and next review point.',
  'Management oversight is visible when risk, shortfall or professional judgement is involved.'
]

const sharedPoorEvidence = [
  'Narrative is generic and cannot be connected to a child plan, action or outcome.',
  'Evidence is described but not linked to source records or citations.',
  'No review date, responsible staff member or follow-up action is recorded.'
]

function standard(
  id: string,
  title: string,
  summary: string,
  plainEnglish: string,
  linkedEventTypes: RegulatoryReference['linkedEventTypes'],
  linkedRecordTypes: RegulatoryReference['linkedRecordTypes'],
  evidenceExpectations: string[],
  reportSections: string[],
  riskIndicators: string[] = []
): RegulatoryReference {
  return {
    id,
    framework: 'quality_standards',
    code: title,
    title,
    summary,
    plainEnglish,
    evidenceExpectations,
    whatGoodEvidenceLooksLike: sharedGoodEvidence,
    whatPoorEvidenceLooksLike: sharedPoorEvidence,
    linkedRecordTypes,
    linkedEventTypes,
    inspectionPrompts: [
      'How does the home know this child is making progress?',
      'What evidence shows the child experience and lived reality?',
      'Where are shortfalls owned, reviewed and improved?'
    ],
    qualityIndicators: [
      'Child voice informs decisions.',
      'Staff response is consistent with the plan.',
      'Evidence is current, reviewed and report-ready.'
    ],
    riskIndicators,
    commonEvidenceGaps: ['Child voice missing', 'Source citation missing', 'Management oversight not recorded'],
    reportSections
  }
}

export const qualityStandards: RegulatoryReference[] = [
  standard(
    'qs-quality-purpose-care',
    'Quality and purpose of care',
    'Evidence that the home delivers care in line with its statement of purpose and the needs of children living there.',
    'Show how daily care, placement goals and review evidence are joined together.',
    ['daily_log', 'placement_update', 'positive_outcome', 'manager_review'],
    ['daily_log', 'document', 'report', 'evidence', 'manager_review'],
    ['Placement progress records', 'Daily care linked to needs', 'Service improvement actions'],
    ['Quality of care findings', 'Placement progress', 'Reg 45 quality of care review']
  ),
  standard(
    'qs-views-wishes-feelings',
    'Children views, wishes and feelings',
    'Evidence that children are listened to and their views influence care and planning.',
    'Record the voice of the child and what staff or managers did with it.',
    ['keywork', 'direct_work', 'daily_log', 'family_contact', 'lac_review'],
    ['keywork', 'daily_log', 'report', 'evidence', 'lac_review'],
    ['Direct quotes or attributed views', 'Decision or action in response', 'Review of whether the response helped'],
    ['Child voice', 'Young people spoken to', 'Feedback from children'],
    ['child voice absent']
  ),
  standard(
    'qs-education',
    'Education',
    'Evidence that education is promoted and barriers to learning are understood and acted on.',
    'Show attendance, engagement, support, school liaison and next actions.',
    ['education', 'daily_log', 'appointment', 'positive_outcome'],
    ['daily_log', 'appointment', 'evidence', 'action', 'report'],
    ['Attendance evidence', 'Virtual school or provider feedback', 'Actions for timetable or barriers'],
    ['Education', 'Education progress', 'LAC review education'],
    ['education refusal', 'attendance evidence missing']
  ),
  standard(
    'qs-enjoyment-achievement',
    'Enjoyment and achievement',
    'Evidence that children are supported to take part in meaningful activity and build confidence.',
    'Record interests, participation, barriers and progress in independence or self-esteem.',
    ['daily_log', 'positive_outcome', 'family_contact', 'direct_work'],
    ['daily_log', 'keywork', 'evidence', 'report'],
    ['Activity plans and feedback', 'Child voice about interests', 'Evidence of achievement'],
    ['Enjoyment and achievement', 'Progress from starting points']
  ),
  standard(
    'qs-health-wellbeing',
    'Health and wellbeing',
    'Evidence that physical, emotional and mental health needs are understood and supported.',
    'Connect presentation, appointments, medication, emotional wellbeing and follow-up.',
    ['health', 'medication', 'appointment', 'daily_log', 'keywork'],
    ['medication', 'appointment', 'daily_log', 'evidence', 'report'],
    ['Appointment outcomes', 'Medication alerts reviewed', 'Emotional wellbeing recording'],
    ['Health and wellbeing', 'Health and medication summary'],
    ['missed medication', 'appointment outcome missing']
  ),
  standard(
    'qs-positive-relationships',
    'Positive relationships',
    'Evidence that staff support safe relationships, family time, repair and belonging.',
    'Show preparation, debrief, restorative practice and how relationships are strengthened.',
    ['family_contact', 'incident', 'behaviour_observation', 'keywork'],
    ['incident', 'keywork', 'daily_log', 'action', 'evidence'],
    ['Family time support plans', 'Restorative conversations', 'Debrief and follow-up'],
    ['Positive relationships', 'Family time/contact'],
    ['peer conflict', 'contact anxiety']
  ),
  standard(
    'qs-protection-children',
    'Protection of children',
    'Evidence that safeguarding risk is identified, responded to and reviewed.',
    'Join safeguarding chronology, risk plans, agency contacts, actions and management oversight.',
    ['safeguarding', 'incident', 'missing_episode', 'risk_review', 'manager_review'],
    ['safeguarding', 'incident', 'risk_assessment', 'document', 'action', 'evidence'],
    ['Safeguarding chronology', 'Risk and safety plan review', 'Agency notification outcomes'],
    ['Safeguarding observations', 'Protection judgement', 'Safeguarding chronology'],
    ['missing-from-care', 'exploitation-vulnerability', 'risk review overdue']
  ),
  standard(
    'qs-leadership-management',
    'Leadership and management',
    'Evidence that managers monitor quality, act on shortfalls and improve care.',
    'Show audits, manager reviews, Reg 44/45 learning, staff accountability and completed actions.',
    ['manager_review', 'audit_event', 'reg44_finding', 'reg45_evidence', 'incident'],
    ['manager_review', 'reg44_report', 'reg45_report', 'action', 'report', 'evidence'],
    ['Manager review sign-off', 'Action tracking', 'Quality assurance themes and service development'],
    ['Leadership and management findings', 'Management oversight report', 'Service development plan'],
    ['overdue-manager-review', 'action overdue', 'shortfall not closed']
  ),
  standard(
    'qs-care-planning',
    'Care planning',
    'Evidence that care is planned, reviewed and responsive to the child changing needs.',
    'Connect placement goals, LAC review evidence, risk changes, child voice and agreed actions.',
    ['lac_review', 'placement_update', 'risk_review', 'daily_log', 'professional_contact'],
    ['lac_review', 'document', 'report', 'risk_assessment', 'action'],
    ['Care plan and placement plan evidence', 'LAC review actions', 'Progress against goals'],
    ['Care planning', 'LAC review sections', 'Placement progress'],
    ['review actions not evidenced', 'placement goal progress missing']
  )
]
