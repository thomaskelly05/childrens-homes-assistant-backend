import { RegulatoryReference } from './types'

function regulation(
  number: number,
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
    id: `chr-reg-${number}`,
    framework: 'children_homes_regulations_2015',
    code: `Regulation ${number}`,
    title,
    summary,
    plainEnglish,
    evidenceExpectations,
    whatGoodEvidenceLooksLike: [
      'Dated records identify the young person, staff member, source record and management oversight where required.',
      'Evidence links day-to-day care, child voice, professional input, risk assessment and follow-up action.',
      'Records show reflection, review and progress from starting points rather than only describing an isolated event.'
    ],
    whatPoorEvidenceLooksLike: [
      'Isolated notes with no child voice, source record, chronology link or action owner.',
      'Generic statements such as "all okay" without detail about need, response, outcome or review.',
      'Actions are recorded without due date, responsible adult/staff member or evidence of completion.'
    ],
    linkedRecordTypes,
    linkedEventTypes,
    inspectionPrompts: [
      'What do records show happened, who was involved and what changed afterwards?',
      'Can managers evidence that follow-up action was completed and reviewed?',
      'Does the evidence show the child was listened to and supported in line with their plan?'
    ],
    qualityIndicators: [
      'Child-centred recording with clear outcomes.',
      'Consistent management oversight and learning.',
      'Evidence triangulated from chronology, documents, actions and professional feedback.'
    ],
    riskIndicators,
    commonEvidenceGaps: [
      'Missing manager review or sign-off.',
      'No linked evidence item or source citation.',
      'No recorded child voice or external professional feedback where expected.'
    ],
    reportSections
  }
}

export const childrenHomesRegulations: RegulatoryReference[] = [
  regulation(
    5,
    'Engaging with the wider system',
    'The home should work effectively with placing authorities, schools, health services, police and other agencies.',
    'Records should show staff sharing information, escalating concerns and following through with partner agencies.',
    ['professional_contact', 'appointment', 'safeguarding', 'lac_review'],
    ['appointment', 'safeguarding', 'report', 'document', 'action'],
    ['Agency contacts with purpose and outcome', 'Social worker and professional feedback', 'Evidence of escalation and follow-up'],
    ['Agency involvement', 'Leadership and management', 'LAC review actions'],
    ['agency response delayed', 'missing external feedback']
  ),
  regulation(
    6,
    'Quality and purpose of care',
    'Care should meet each child needs as set out in the home statement of purpose and placement plan.',
    'Evidence should connect the child plan, daily care, outcomes and review of whether the placement remains right.',
    ['daily_log', 'placement_update', 'positive_outcome', 'manager_review'],
    ['daily_log', 'document', 'report', 'manager_review', 'evidence'],
    ['Placement goals and progress evidence', 'Daily routines linked to plans', 'Staff reflection on outcomes'],
    ['Quality of care findings', 'Placement progress', 'Reg 45 quality of care review']
  ),
  regulation(
    7,
    'Children views, wishes and feelings',
    'Children should be helped to express views and influence care, routines, plans and reviews.',
    'Records should show the voice of the child, how staff responded and whether anything changed.',
    ['daily_log', 'keywork', 'direct_work', 'family_contact', 'positive_outcome', 'lac_review'],
    ['daily_log', 'keywork', 'report', 'evidence', 'reg45_report', 'lac_review'],
    ['Direct quotes or clearly attributed child voice', 'Response to views and wishes', 'Evidence that views influenced action'],
    ['Child voice', 'Young people spoken to', 'Feedback from children'],
    ['child voice absent', 'views not followed up']
  ),
  regulation(
    8,
    'Education',
    'The home should promote education, learning, attendance and achievement.',
    'Education evidence should show attendance, barriers, support, liaison and progress from starting points.',
    ['education', 'daily_log', 'appointment', 'positive_outcome', 'lac_review'],
    ['daily_log', 'appointment', 'report', 'evidence', 'action'],
    ['Attendance and engagement records', 'Virtual school or education provider feedback', 'Actions for barriers to learning'],
    ['Education', 'Education and health outcomes', 'LAC review education'],
    ['attendance concern', 'education refusal', 'missing education feedback']
  ),
  regulation(
    9,
    'Enjoyment and achievement',
    'Children should be supported to enjoy interests, family time, community activity and personal development.',
    'Records should evidence meaningful activity, relationships, family time and progress in confidence or independence.',
    ['daily_log', 'family_contact', 'positive_outcome', 'direct_work'],
    ['daily_log', 'keywork', 'document', 'evidence', 'report'],
    ['Activity planning and review', 'Child feedback about interests', 'Evidence of barriers being addressed'],
    ['Enjoyment and achievement', 'Family time/contact', 'Progress from starting points'],
    ['activity cancellation', 'family contact worry']
  ),
  regulation(
    10,
    'Health and wellbeing',
    'The home should promote physical, emotional and mental health and support access to services.',
    'Health evidence should show need, appointment outcomes, medication safety, emotional wellbeing and follow-up.',
    ['health', 'medication', 'appointment', 'daily_log', 'keywork'],
    ['medication', 'appointment', 'daily_log', 'report', 'evidence'],
    ['Health appointments and outcomes', 'Medication administration alerts and review', 'Emotional wellbeing observations and response'],
    ['Health', 'Health and wellbeing', 'Education and health outcomes'],
    ['missed medication', 'health appointment outcome missing', 'CAMHS feedback missing']
  ),
  regulation(
    11,
    'Positive relationships',
    'Children should be supported to build and maintain safe, positive relationships.',
    'Records should show relational practice, restorative work, family time support and how conflict is repaired.',
    ['family_contact', 'behaviour_observation', 'incident', 'direct_work', 'keywork'],
    ['incident', 'keywork', 'daily_log', 'evidence', 'action'],
    ['Restorative conversation records', 'Family time preparation and debrief', 'Relationship-based staff response'],
    ['Positive relationships', 'Behaviour support', 'LAC review family time'],
    ['peer conflict', 'contact anxiety']
  ),
  regulation(
    12,
    'Protection of children',
    'The home should protect children from harm and respond effectively to safeguarding and risk.',
    'Safeguarding records should connect concerns, risk plans, agencies, actions, manager oversight and outcomes.',
    ['safeguarding', 'incident', 'missing_episode', 'risk_review', 'allegation', 'manager_review'],
    ['safeguarding', 'incident', 'risk_assessment', 'manager_review', 'document', 'action'],
    ['Safeguarding chronology with source citations', 'Risk assessment and safety plan review', 'Agency notifications and outcomes'],
    ['Safeguarding observations', 'Protection judgement', 'Safeguarding chronology'],
    ['missing-from-care', 'exploitation-vulnerability', 'active safeguarding concern', 'risk review overdue']
  ),
  regulation(
    13,
    'Leadership and management',
    'Leaders and managers should ensure high-quality care, monitoring, review and staff accountability.',
    'Evidence should show oversight, audit, learning, supervision, action tracking and service improvement.',
    ['manager_review', 'audit_event', 'reg44_finding', 'reg45_evidence', 'incident'],
    ['manager_review', 'action', 'report', 'reg44_report', 'reg45_report', 'evidence'],
    ['Manager review records', 'Quality assurance audits', 'Actions with owners, due dates and completion evidence'],
    ['Leadership and management findings', 'Management oversight report', 'Service development plan'],
    ['overdue-manager-review', 'action overdue', 'evidence-gap']
  ),
  regulation(
    14,
    'Care planning',
    'Children should receive care in line with plans, placing authority requirements and review decisions.',
    'Records should show placement plans, LAC review evidence, goals, progress, risk changes and agreed actions.',
    ['lac_review', 'placement_update', 'daily_log', 'risk_review', 'professional_contact'],
    ['lac_review', 'document', 'report', 'risk_assessment', 'action'],
    ['Placement and care plan links', 'LAC review actions and evidence', 'Progress against agreed goals'],
    ['Care planning', 'LAC review sections', 'Placement progress'],
    ['care plan out of date', 'review actions not evidenced']
  ),
  regulation(
    35,
    'Behaviour management',
    'Behaviour support should be proportionate, restorative and subject to recording and review.',
    'Incident and behaviour records should show triggers, de-escalation, outcomes, restraint/sanction where relevant and manager review.',
    ['incident', 'restraint', 'sanction', 'behaviour_observation', 'manager_review'],
    ['incident', 'risk_assessment', 'manager_review', 'action', 'evidence'],
    ['Trigger and de-escalation evidence', 'Outcome and injury checks', 'Manager review of restraint/sanction where relevant'],
    ['Incidents/restraints/missing episodes analysis', 'Behaviour support', 'Manager oversight'],
    ['restraint', 'sanction', 'repeated incident pattern']
  ),
  regulation(
    40,
    'Notification of serious events',
    'Serious events should be considered for notification to the right bodies and recorded with rationale.',
    'Records should show notification decisions, agencies informed, date/time, outcome and manager oversight.',
    ['incident', 'missing_episode', 'safeguarding', 'allegation', 'manager_review'],
    ['incident', 'safeguarding', 'manager_review', 'report', 'action'],
    ['Reg 40 consideration with rationale', 'Agency notification evidence', 'Manager sign-off and follow-up'],
    ['Safeguarding observations', 'Incident pattern review', 'Leadership oversight'],
    ['police-notified', 'serious incident', 'reg40 consideration missing']
  ),
  regulation(
    44,
    'Independent person visits',
    'Independent visitor reports should identify findings, shortfalls, actions and evidence of follow-up.',
    'Reg 44 evidence should turn findings into owned actions and feed learning into manager oversight and Reg 45.',
    ['reg44_finding', 'manager_review', 'audit_event', 'safeguarding'],
    ['reg44_report', 'action', 'evidence', 'report', 'document'],
    ['Extracted findings', 'Action plan with owner and due date', 'Evidence of completion and manager review'],
    ['Reg 44 action plan', 'Shortfalls and recommendations', 'Leadership and management findings'],
    ['reg44 finding overdue', 'action plan open', 'evidence not linked']
  ),
  regulation(
    45,
    'Review of quality of care',
    'The registered person should review the quality of care and use evidence to improve the service.',
    'Reg 45 evidence should draw together child voice, outcomes, safeguarding, staff practice, feedback, actions and learning.',
    ['reg45_evidence', 'manager_review', 'positive_outcome', 'safeguarding', 'incident', 'lac_review'],
    ['reg45_report', 'report', 'evidence', 'action', 'document'],
    ['Annual evidence pack with citations', 'Feedback from children, families and professionals', 'Service development actions'],
    ['Reg 45 quality of care review', 'Leadership evaluation', 'Service development plan'],
    ['external feedback missing', 'review required', 'source evidence incomplete']
  )
]
