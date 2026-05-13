import { RegulatoryReference } from './types'

function sccifArea(
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
    framework: 'sccif',
    code: title,
    title,
    summary,
    plainEnglish,
    evidenceExpectations,
    whatGoodEvidenceLooksLike: [
      'Evidence is current, child-specific and traceable to source records.',
      'Records show impact, not just activity, with progress from starting points.',
      'Shortfalls are acknowledged with accountable actions and management review.'
    ],
    whatPoorEvidenceLooksLike: [
      'Evidence is asserted without citations or source records.',
      'Records focus on process but not the lived experience or outcome for children.',
      'Risks, gaps or overdue actions are hidden or not owned.'
    ],
    linkedRecordTypes,
    linkedEventTypes,
    inspectionPrompts: [
      'What is the child lived experience in this home?',
      'How do leaders know practice is safe and effective?',
      'What evidence demonstrates learning and sustained improvement?'
    ],
    qualityIndicators: [
      'Clear triangulation between daily records, chronology, evidence and actions.',
      'Children voice and outcomes are visible.',
      'Managers understand risk, quality and next steps.'
    ],
    riskIndicators,
    commonEvidenceGaps: ['No child-specific impact evidence', 'Missing source citations', 'No management oversight trail'],
    reportSections
  }
}

export const sccifReferences: RegulatoryReference[] = [
  sccifArea(
    'sccif-overall-experiences-progress',
    'Overall experiences and progress of children',
    'How children experience care and make progress from their starting points.',
    'Bring together daily care, outcomes, child voice, education, health and relationships.',
    ['daily_log', 'positive_outcome', 'education', 'health', 'keywork', 'lac_review'],
    ['daily_log', 'keywork', 'report', 'evidence', 'lac_review'],
    ['Progress from placement goals', 'Child voice and lived experience', 'Education, health and wellbeing evidence'],
    ['Children progress', 'Placement progress', 'LAC review summary']
  ),
  sccifArea(
    'sccif-helped-protected',
    'How well children are helped and protected',
    'How the home identifies, reduces and responds to risk of harm.',
    'Show safeguarding chronology, risk review, agency action and management oversight.',
    ['safeguarding', 'incident', 'missing_episode', 'risk_review', 'manager_review'],
    ['safeguarding', 'incident', 'risk_assessment', 'action', 'evidence'],
    ['Safeguarding chronology', 'Risk and safety plan updates', 'Agency notification outcomes'],
    ['Safeguarding evidence', 'Protection judgement', 'Incident pattern review'],
    ['missing-from-care', 'exploitation-vulnerability', 'active safeguarding concern']
  ),
  sccifArea(
    'sccif-leaders-managers',
    'Effectiveness of leaders and managers',
    'How leaders understand quality, risk, workforce and improvement.',
    'Evidence management oversight, audit, Reg 44/45 action tracking and learning.',
    ['manager_review', 'audit_event', 'reg44_finding', 'reg45_evidence', 'incident'],
    ['manager_review', 'reg44_report', 'reg45_report', 'action', 'report'],
    ['Manager review sign-off', 'Audit trail', 'Action completion evidence'],
    ['Leadership', 'Management oversight report', 'Service development plan'],
    ['overdue-manager-review', 'action overdue']
  ),
  sccifArea(
    'sccif-quality-purpose-care',
    'Quality and purpose of care',
    'Whether care matches the home purpose and children individual plans.',
    'Connect placement plans, daily care, outcomes and review evidence.',
    ['daily_log', 'placement_update', 'positive_outcome', 'manager_review'],
    ['daily_log', 'document', 'report', 'evidence'],
    ['Statement of purpose links', 'Placement progress records', 'Review of outcomes'],
    ['Quality of care findings', 'Reg 45 quality of care review']
  ),
  sccifArea(
    'sccif-safeguarding-culture',
    'The home safeguarding culture',
    'Whether safeguarding practice is open, curious, timely and well-led.',
    'Show staff noticing patterns, escalating concerns and learning from incidents.',
    ['safeguarding', 'incident', 'missing_episode', 'allegation', 'manager_review'],
    ['safeguarding', 'incident', 'manager_review', 'action', 'evidence'],
    ['Pattern analysis', 'Escalation records', 'Debriefs and management learning'],
    ['Safeguarding culture', 'Safeguarding chronology'],
    ['threshold drift', 'agency response delayed', 'repeat missing episodes']
  ),
  sccifArea(
    'sccif-workforce-stability-development',
    'Workforce stability and development',
    'How staffing, supervision, training and consistency support children.',
    'Evidence staff skills, consistency, supervision and learning from practice.',
    ['manager_review', 'audit_event', 'professional_contact'],
    ['staff_supervision', 'training_record', 'manager_review', 'report'],
    ['Training and supervision records', 'Staff allocation continuity', 'Learning from incidents'],
    ['Workforce', 'Leadership and management'],
    ['staff consistency concern', 'training gap']
  ),
  sccifArea(
    'sccif-management-oversight',
    'Management oversight',
    'Whether records, incidents, actions and shortfalls are reviewed and acted on.',
    'Make overdue reviews, action owners and evidence quality checks visible.',
    ['manager_review', 'incident', 'risk_review', 'reg44_finding', 'audit_event'],
    ['manager_review', 'action', 'evidence', 'reg44_report', 'report'],
    ['Review dates and sign-off', 'Evidence quality checks', 'Action completion trail'],
    ['Management oversight report', 'Reg 44 action plan'],
    ['overdue-manager-review', 'evidence review required', 'action overdue']
  ),
  sccifArea(
    'sccif-childrens-voice-lived-experience',
    'Children voice and lived experience',
    'Whether children views, wishes and feelings are known and acted on.',
    'Show what children said, how adults responded and whether the response helped.',
    ['keywork', 'direct_work', 'daily_log', 'family_contact', 'lac_review'],
    ['keywork', 'daily_log', 'evidence', 'report'],
    ['Direct child voice', 'Evidence of response', 'Review of impact'],
    ['Child voice', 'Young people spoken to', 'Feedback from children'],
    ['child voice absent', 'views not followed up']
  ),
  sccifArea(
    'sccif-progress-starting-points',
    'Progress from starting points',
    'Whether children make measurable, meaningful progress from admission or review points.',
    'Use placement goals, chronology and evidence to show change over time.',
    ['placement_update', 'positive_outcome', 'education', 'health', 'lac_review'],
    ['daily_log', 'lac_review', 'report', 'evidence'],
    ['Baseline and review points', 'Progress examples with citations', 'Barriers and next actions'],
    ['Progress from starting points', 'Placement progress', 'Reg 45 review']
  ),
  sccifArea(
    'sccif-matching-placement-planning',
    'Matching and placement planning',
    'Whether the placement is planned, reviewed and matched to need.',
    'Evidence referral, placement goals, compatibility, risk and review decisions.',
    ['placement_update', 'lac_review', 'risk_review', 'professional_contact'],
    ['placement_plan', 'care_plan', 'risk_assessment', 'lac_review', 'report'],
    ['Placement plan evidence', 'Risk and compatibility review', 'Placing authority feedback'],
    ['Care planning', 'Placement context', 'Matching and planning'],
    ['placement plan missing', 'review action overdue']
  ),
  sccifArea(
    'sccif-records-monitoring-review',
    'Records, monitoring and review',
    'Whether records are accurate, monitored, reviewed and useful for care and oversight.',
    'Show records are linked, cited, reviewed and used in actions and reports.',
    ['audit_event', 'manager_review', 'document_upload', 'reg44_finding', 'reg45_evidence'],
    ['document', 'report', 'manager_review', 'evidence', 'action'],
    ['Source citations', 'Audit and manager review', 'Evidence gaps and actions'],
    ['Records reviewed', 'Evidence cited', 'Report source panel'],
    ['citation missing', 'record not linked', 'review required']
  )
]
