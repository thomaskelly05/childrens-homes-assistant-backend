import type { OrbTemplateSummary } from '@/lib/orb/orb-billing-client'

export const ORB_TEMPLATE_FALLBACK_CATEGORIES = [
  'Safeguarding',
  'Recording',
  'Care Planning',
  'Risk Assessment',
  'Ofsted / SCCIF',
  'Leadership / RI',
  'Supervision',
  'Locality',
  'Learning'
] as const

export type OrbTemplateFallbackCategory = (typeof ORB_TEMPLATE_FALLBACK_CATEGORIES)[number]

export type OrbTemplateFallbackEntry = {
  id: string
  title: string
  description: string
  category: OrbTemplateFallbackCategory
}

function tpl(
  id: string,
  title: string,
  description: string,
  category: OrbTemplateFallbackCategory
): OrbTemplateFallbackEntry {
  return { id, title, description, category }
}

/** Local residential template registry when API returns empty or fails. */
export const ORB_RESIDENTIAL_TEMPLATE_FALLBACK: OrbTemplateFallbackEntry[] = [
  tpl('sg-concern', 'Safeguarding concern record', 'Structured concern record with chronology and actions.', 'Safeguarding'),
  tpl('sg-mfc-return', 'Missing from care return conversation', 'Return interview prompts and welfare check recording.', 'Safeguarding'),
  tpl('sg-exploit', 'Exploitation risk screening', 'Contextual and criminal exploitation screening prompts.', 'Safeguarding'),
  tpl('sg-contextual', 'Contextual safeguarding assessment', 'Community and peer-context risk factors.', 'Safeguarding'),
  tpl('sg-lado', 'LADO referral preparation', 'Allegations against staff — referral preparation checklist.', 'Safeguarding'),
  tpl('sg-strategy', 'Strategy meeting preparation', 'Multi-agency strategy meeting briefing structure.', 'Safeguarding'),
  tpl('rec-daily', 'Daily record', 'Child-centred daily record with voice and outcomes.', 'Recording'),
  tpl('rec-incident', 'Incident record', 'Incident narrative, triggers, de-escalation and follow-up.', 'Recording'),
  tpl('rec-chronology', 'Chronology entry', 'Dated chronology entry for reviews and conferences.', 'Recording'),
  tpl('rec-keywork', 'Keywork session', 'Keywork session record with goals and child feedback.', 'Recording'),
  tpl('rec-oversight', 'Manager oversight note', 'Manager oversight and quality assurance note.', 'Recording'),
  tpl('rec-reflective', 'Reflective recording template', 'Reflective practice recording with learning points.', 'Recording'),
  tpl('cp-placement', 'Placement plan', 'Placement plan sections aligned to regulations.', 'Care Planning'),
  tpl('cp-review', 'Care plan review', 'Care plan review record and actions.', 'Care Planning'),
  tpl('cp-risk', 'Risk assessment', 'Individual risk assessment with controls and review.', 'Risk Assessment'),
  tpl('cp-behaviour', 'Behaviour support plan', 'Proactive behaviour support and de-escalation plan.', 'Care Planning'),
  tpl('cp-mfc-plan', 'Missing from care plan', 'Missing from care prevention and response plan.', 'Care Planning'),
  tpl('cp-wellbeing', 'Emotional wellbeing plan', 'Emotional wellbeing and therapeutic support plan.', 'Care Planning'),
  tpl('insp-sccif', 'SCCIF evidence tracker', 'Track evidence against SCCIF evaluation criteria.', 'Ofsted / SCCIF'),
  tpl('insp-ready', 'Inspection evidence preparation review', 'Pre-Inspection evidence preparation review for children\'s homes.', 'Ofsted / SCCIF'),
  tpl('insp-r44', 'Reg 44 action tracker', 'Regulation 44 visit actions and evidence.', 'Ofsted / SCCIF'),
  tpl('insp-r45', 'Reg 45 quality of care review', 'Regulation 45 independent review structure.', 'Ofsted / SCCIF'),
  tpl('insp-qs', 'Quality Standards audit', 'Children\'s homes Quality Standards self-audit.', 'Ofsted / SCCIF'),
  tpl('lead-rm-monthly', 'Registered Manager monthly review', 'Monthly management review and assurance record.', 'Leadership / RI'),
  tpl('lead-ri-log', 'RI challenge log', 'Responsible Individual challenge and response log.', 'Leadership / RI'),
  tpl('lead-governance', 'Governance review', 'Governance and compliance review template.', 'Leadership / RI'),
  tpl('lead-improvement', 'Improvement plan', 'Service improvement plan with SMART actions.', 'Leadership / RI'),
  tpl('loc-risk', 'Locality risk assessment', 'Local community and placement locality risks.', 'Locality'),
  tpl('loc-community', 'Community risk assessment', 'Community-based risk factors and mitigations.', 'Locality'),
  tpl('loc-transport', 'Transport route risk review', 'Transport and escort route risk review.', 'Locality'),
  tpl('loc-hotspot', 'Hotspot review', 'Known hotspot locations and staff guidance.', 'Locality'),
  tpl('learn-5min', 'Five-minute learning session', 'Short staff learning session plan.', 'Learning'),
  tpl('learn-briefing', 'Staff briefing', 'Team briefing structure for practice updates.', 'Learning'),
  tpl('learn-check', 'Knowledge check', 'Quick knowledge check questions for staff.', 'Learning'),
  tpl('learn-supervision', 'Reflective supervision prompt', 'Supervision prompts for residential practice.', 'Supervision'),
  tpl('learn-cpd', 'CPD note', 'Continuing professional development record.', 'Learning')
]

export function fallbackTemplatesToSummaries(
  entries: OrbTemplateFallbackEntry[] = ORB_RESIDENTIAL_TEMPLATE_FALLBACK
): OrbTemplateSummary[] {
  return entries.map((entry) => ({
    id: `fallback-${entry.id}`,
    title: entry.title,
    description: entry.description,
    category: entry.category
  }))
}

export function filterFallbackTemplates(options?: {
  category?: string
  search?: string
}): OrbTemplateSummary[] {
  const q = options?.search?.trim().toLowerCase()
  const cat = options?.category?.trim()
  let list = ORB_RESIDENTIAL_TEMPLATE_FALLBACK
  if (cat) {
    list = list.filter((t) => t.category === cat)
  }
  if (q) {
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    )
  }
  return fallbackTemplatesToSummaries(list)
}

export function templateUsePrompt(title: string): string {
  return templateImmediatePrompt(title)
}

const TEMPLATE_SECTION_HINTS: Record<string, string[]> = {
  'safeguarding concern record': [
    'Date and time',
    'Young person',
    'Adults present',
    'Nature of concern',
    'What was observed',
    'What the child said',
    'Immediate action taken',
    'Manager/DSL informed',
    'Safeguarding decision/rationale',
    'External notifications',
    'Follow-up actions',
    'Chronology/plan updates',
    'Review date'
  ]
}

/** Rich auto-send prompt for immediate template generation in chat. */
export function templateImmediatePrompt(
  title: string,
  options?: { category?: string; description?: string }
): string {
  const key = title.trim().toLowerCase()
  const sections = TEMPLATE_SECTION_HINTS[key]
  const categoryLine = options?.category ? `Category: ${options.category}.` : ''
  const framing =
    'Use residential children\'s home practice (not schools). Include child voice, safeguarding, manager oversight, and follow-up actions where relevant. Use clear headings and [placeholders]. Ask follow-up questions only if essential.'

  if (sections?.length) {
    return [
      `Create a complete, professional ${title} for me now.`,
      categoryLine,
      framing,
      '',
      'Include these sections with usable wording (not just a description):',
      ...sections.map((s) => `- ${s}`)
    ]
      .filter(Boolean)
      .join('\n')
  }

  const desc = options?.description?.trim()
  return [
    `Create a complete, professional ${title} for me now.`,
    categoryLine,
    desc ? `Purpose: ${desc}` : '',
    framing,
    'Output a usable template with headings, placeholders, safeguarding prompts, and recording/chronology notes where relevant.'
  ]
    .filter(Boolean)
    .join('\n')
}
