import { CareAction, EvidenceGap, EvidenceItem } from './types'

export const demoEvidenceItems: EvidenceItem[] = [
  {
    id: 'ev-jamie-school-attendance',
    title: 'Jamie attended school with morning routine support',
    description: 'Daily log and education notes show Jamie left for Oakbridge Academy on time following staff prompts.',
    evidenceType: 'daily_record',
    sourceType: 'daily_log',
    sourceId: 'log-001',
    youngPersonId: 'yp-jamie',
    homeId: 'home-oak',
    linkedRegulation: 'Children Homes Regulations 2015 Reg 8',
    linkedReportIds: ['report-weekly-jamie'],
    createdBy: 'staff-abi',
    createdAt: '2026-05-13T09:30:00.000Z',
    quality: 'adequate',
    tags: ['education', 'routine', 'positive-outcome']
  },
  {
    id: 'ev-noah-missing-return',
    title: 'Noah returned safely and completed welfare check',
    description: 'Incident record confirms Noah returned with staff support and no injuries were reported.',
    evidenceType: 'incident_record',
    sourceType: 'incident',
    sourceId: 'inc-001',
    youngPersonId: 'yp-noah',
    homeId: 'home-oak',
    linkedRegulation: 'Children Homes Regulations 2015 Reg 12',
    linkedReportIds: ['report-safeguarding-noah'],
    createdBy: 'staff-morgan',
    createdAt: '2026-05-12T20:15:00.000Z',
    quality: 'strong',
    tags: ['missing', 'safeguarding', 'welfare-check']
  },
  {
    id: 'ev-reg44-april-finding-3',
    title: 'Reg 44 April finding 3: return interviews need stronger audit trail',
    description: 'Independent visitor noted that return interview outcomes were not consistently visible in the young person chronology.',
    evidenceType: 'regulatory_finding',
    sourceType: 'reg44_report',
    sourceId: 'doc-reg44-apr-2026',
    homeId: 'home-oak',
    linkedRegulation: 'Regulation 44',
    linkedReportIds: ['report-reg44-action-plan-april'],
    createdBy: 'staff-ella',
    createdAt: '2026-05-01T10:00:00.000Z',
    quality: 'review_required',
    tags: ['reg44', 'audit-trail', 'missing']
  },
  {
    id: 'ev-mia-child-voice',
    title: 'Mia described feeling proud after homework and meal preparation',
    description: 'Evening record captures positive engagement and child voice linked to emotional wellbeing and independence.',
    evidenceType: 'child_voice',
    sourceType: 'daily_log',
    sourceId: 'log-003',
    youngPersonId: 'yp-mia',
    homeId: 'home-oak',
    linkedRegulation: 'Children Homes Regulations 2015 Reg 7',
    linkedReportIds: ['report-reg45-2026'],
    createdBy: 'staff-ella',
    createdAt: '2026-05-12T20:10:00.000Z',
    quality: 'adequate',
    tags: ['child-voice', 'wellbeing', 'independence']
  },
  {
    id: 'ev-manager-review-gaming-rota',
    title: 'Manager review of gaming rota consistency',
    description: 'Manager oversight records the need for consistent expectations around shared activities.',
    evidenceType: 'manager_review',
    sourceType: 'manager_review',
    sourceId: 'mgr-002',
    youngPersonId: 'yp-jamie',
    homeId: 'home-oak',
    linkedRegulation: 'Children Homes Regulations 2015 Reg 13',
    linkedReportIds: ['report-monthly-manager-may'],
    createdBy: 'staff-ella',
    createdAt: '2026-05-11T14:00:00.000Z',
    quality: 'partial',
    tags: ['behaviour-support', 'manager-review']
  }
]

export const demoCareActions: CareAction[] = [
  {
    id: 'act-reg44-return-interviews',
    title: 'Add return interview outcome to Noah chronology',
    description: 'Record the return interview outcome and link it to the missing episode, safeguarding chronology and Reg 44 action plan.',
    sourceType: 'reg44_report',
    sourceId: 'doc-reg44-apr-2026',
    assignedToStaffId: 'staff-morgan',
    youngPersonId: 'yp-noah',
    homeId: 'home-oak',
    dueDate: '2026-05-14',
    priority: 'urgent',
    status: 'overdue',
    regulation: 'Regulation 44',
    evidenceRequired: ['Return interview record', 'Manager review sign-off', 'Updated missing risk plan'],
    evidenceIds: ['ev-noah-missing-return'],
    createdAt: '2026-05-01T10:20:00.000Z'
  },
  {
    id: 'act-jamie-contact-plan',
    title: 'Review Jamie family time support plan',
    description: 'Check whether Jamie needs an updated contact preparation plan after pressure reported during family call.',
    sourceType: 'safeguarding',
    sourceId: 'safe-002',
    assignedToStaffId: 'staff-ella',
    youngPersonId: 'yp-jamie',
    homeId: 'home-oak',
    dueDate: '2026-05-16',
    priority: 'high',
    status: 'in_progress',
    regulation: 'Children Homes Regulations 2015 Reg 12',
    evidenceRequired: ['Child debrief', 'Social worker feedback', 'Updated family time plan if needed'],
    evidenceIds: [],
    createdAt: '2026-05-08T16:45:00.000Z'
  },
  {
    id: 'act-education-evidence',
    title: 'Attach education attendance evidence for Jamie',
    description: 'Add school attendance confirmation and key worker reflection to strengthen LAC review evidence.',
    sourceType: 'lac_review',
    sourceId: 'report-lac-jamie-may',
    assignedToStaffId: 'staff-abi',
    youngPersonId: 'yp-jamie',
    homeId: 'home-oak',
    dueDate: '2026-05-20',
    priority: 'medium',
    status: 'open',
    regulation: 'Children Homes Regulations 2015 Reg 8',
    evidenceRequired: ['School attendance confirmation', 'Young person voice about timetable'],
    evidenceIds: ['ev-jamie-school-attendance'],
    createdAt: '2026-05-13T12:00:00.000Z'
  },
  {
    id: 'act-reg45-feedback',
    title: 'Collect professional feedback for Reg 45 review',
    description: 'Request feedback from social workers and virtual school for the annual quality of care draft.',
    sourceType: 'reg45_evidence',
    sourceId: 'report-reg45-2026',
    assignedToStaffId: 'staff-ella',
    homeId: 'home-oak',
    dueDate: '2026-05-24',
    priority: 'medium',
    status: 'open',
    regulation: 'Regulation 45',
    evidenceRequired: ['Social worker feedback', 'Virtual school feedback', 'Family feedback where appropriate'],
    evidenceIds: [],
    createdAt: '2026-05-13T12:30:00.000Z'
  }
]

export const demoEvidenceGaps: EvidenceGap[] = [
  {
    id: 'gap-return-interview',
    title: 'Return interview outcome not yet attached',
    description: 'No completed return interview note is linked to Noah missing episode or Reg 44 finding 3.',
    regulation: 'Regulation 44',
    youngPersonId: 'yp-noah',
    homeId: 'home-oak',
    priority: 'urgent',
    sourceEventIds: ['chron-inc-noah-missing', 'chron-reg44-april'],
    suggestedAction: 'Attach the return interview record and ask the manager to review the updated chronology entry.'
  },
  {
    id: 'gap-jamie-contact',
    title: 'Family time plan evidence is incomplete',
    description: 'Jamie reported pressure during a family call but there is not yet a linked updated contact plan or social worker response.',
    regulation: 'Children Homes Regulations 2015 Reg 9',
    youngPersonId: 'yp-jamie',
    homeId: 'home-oak',
    priority: 'high',
    sourceEventIds: ['chron-safe-jamie-contact'],
    suggestedAction: 'Link social worker feedback and record whether the family time support plan was updated.'
  },
  {
    id: 'gap-reg45-feedback',
    title: 'Reg 45 feedback pack needs external views',
    description: 'Professional and family feedback is not yet evidenced for the current annual quality of care review.',
    regulation: 'Regulation 45',
    homeId: 'home-oak',
    priority: 'medium',
    sourceEventIds: ['chron-reg45-prep'],
    suggestedAction: 'Request feedback from social workers, virtual school and families where appropriate.'
  }
]
