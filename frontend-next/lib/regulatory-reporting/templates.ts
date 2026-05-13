import { ReportTemplate } from './types'

export const reportTemplates: ReportTemplate[] = [
  {
    id: 'reg44',
    title: 'Reg 44 report generator',
    description: 'Draft independent visitor report structure with source citations and evidence gaps.',
    regulation: 'Regulation 44',
    sections: ['Visit details', 'Young people spoken to', 'Staff spoken to', 'Records reviewed', 'Safeguarding observations', 'Quality of care findings', 'Leadership and management findings', 'Environment findings', 'Shortfalls', 'Recommendations', 'Actions', 'Evidence cited']
  },
  {
    id: 'reg44_action_plan',
    title: 'Reg 44 uploaded report action plan',
    description: 'Turns extracted Reg 44 findings into actions, due dates, evidence requirements and chronology links.',
    regulation: 'Regulation 44',
    sections: ['Extracted findings', 'Actions generated', 'Responsible staff', 'Due dates', 'Evidence required', 'Evidence gaps', 'Chronology links']
  },
  {
    id: 'reg45',
    title: 'Reg 45 annual quality of care review',
    description: 'Draft quality of care review with child voice, outcomes, safeguarding, incidents, feedback and service development.',
    regulation: 'Regulation 45',
    sections: ['Quality of care review', 'Safeguarding effectiveness', 'Feedback from children', 'Feedback from families/professionals', 'Staff training/supervision', 'Incidents/restraints/missing episodes analysis', 'Complaints', 'Education/health outcomes', 'Leadership and management evaluation', 'Service development plan', 'Evidence citations']
  },
  {
    id: 'lac_review',
    title: 'LAC review report',
    description: 'Child-centred looked-after review summary with progress, risks, actions and citations.',
    sections: ['Child voice', 'Placement progress', 'Education', 'Health', 'Emotional wellbeing', 'Family time/contact', 'Safeguarding', 'Incidents/missing episodes', 'Risk changes', 'Direct work/keywork', 'Goals and outcomes', 'Recommendations', 'Citations']
  },
  { id: 'placement_progress', title: 'Placement progress report', description: 'Progress against placement goals and current care plan evidence.', sections: ['Placement context', 'Progress', 'Barriers', 'Actions', 'Evidence'] },
  { id: 'social_worker_update', title: 'Social worker update', description: 'Concise update for placing authority review and oversight.', sections: ['Summary', 'Safeguarding', 'Education and health', 'Actions', 'Evidence'] },
  { id: 'weekly_care_summary', title: 'Weekly care summary', description: 'Seven-day summary of daily care, progress, risks and next steps.', sections: ['Overview', 'Daily care', 'Risks', 'Child voice', 'Next actions'] },
  { id: 'monthly_manager_report', title: 'Monthly manager report', description: 'Manager oversight across safeguarding, staffing, records and quality of care.', sections: ['Oversight', 'Themes', 'Shortfalls', 'Actions', 'Evidence'] },
  { id: 'safeguarding_chronology', title: 'Safeguarding chronology', description: 'Dated safeguarding sequence with linked incidents, actions and agencies.', sections: ['Chronology', 'Themes', 'Agency involvement', 'Actions', 'Gaps'] },
  { id: 'missing_episode_analysis', title: 'Missing episode analysis', description: 'Pattern review for missing episodes, triggers, return interviews and plans.', sections: ['Episodes', 'Triggers', 'Return interviews', 'Risk plan changes', 'Actions'] },
  { id: 'incident_pattern_review', title: 'Incident pattern review', description: 'Incident themes, triggers, de-escalation and manager oversight.', sections: ['Pattern summary', 'Triggers', 'Responses', 'Outcomes', 'Actions'] },
  { id: 'ofsted_evidence_pack', title: 'Ofsted evidence pack', description: 'Evidence pack grouped by care quality, safeguarding, leadership and outcomes.', sections: ['Children progress', 'Safeguarding', 'Leadership', 'Workforce', 'Evidence gaps'] },
  { id: 'manager_oversight', title: 'Manager oversight report', description: 'Manager review and quality assurance action tracking.', sections: ['Reviews', 'Shortfalls', 'Actions', 'Evidence'] },
  { id: 'keywork_progress', title: 'Keywork progress report', description: 'Direct work and keywork progress against goals.', sections: ['Goals', 'Sessions', 'Child voice', 'Progress', 'Next steps'] },
  { id: 'education_progress', title: 'Education progress report', description: 'Education attendance, engagement, support and next actions.', sections: ['Attendance', 'Engagement', 'Barriers', 'Progress', 'Evidence'] },
  { id: 'health_medication_summary', title: 'Health and medication summary', description: 'Health appointments, medication administration and alerts.', sections: ['Health overview', 'Medication', 'Appointments', 'Alerts', 'Actions'] }
]

export function getReportTemplate(id: string) {
  return reportTemplates.find((template) => template.id === id)
}
