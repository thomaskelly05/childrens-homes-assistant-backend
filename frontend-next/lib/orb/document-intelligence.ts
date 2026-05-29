/** Standalone ORB document intelligence — lenses and contextual UI actions. */

export type OrbDocumentLens =
  | 'summary'
  | 'explain'
  | 'actions'
  | 'policy_card'
  | 'reg44'
  | 'reg45'
  | 'ofsted'
  | 'safeguarding'
  | 'recording_quality'
  | 'manager_oversight'
  | 'ri_governance'
  | 'staff_briefing'
  | 'supervision'
  | 'checklist'
  | 'what_is_missing'
  | 'nvq_evidence_map'
  | 'reflective_account_plan'
  | 'assessor_feedback'
  | 'professional_discussion_prompts'
  | 'witness_testimony_prompt'
  | 'learning_action_plan'
  | 'workbook_summary'
  | 'qualification_criteria_explainer'

export type OrbDocumentContextualAction = {
  lens: OrbDocumentLens
  label: string
}

const REG44_MARKERS = [
  'regulation 44',
  'reg 44',
  'reg44',
  'independent visitor',
  'visitor report',
  'monthly visit'
]

const POLICY_MARKERS = ['policy', 'procedure', 'guidance', 'staff must', 'escalat']

const INCIDENT_MARKERS = ['incident', 'daily note', 'recording', 'chronology', 'safeguarding concern']

const NVQ_MARKERS = [
  'nvq',
  'diploma',
  'workbook',
  'reflective account',
  'criteria',
  'assessor',
  'professional discussion',
  'witness testimony',
  'portfolio'
]

export type OrbDocumentKind =
  | 'reg44'
  | 'policy'
  | 'incident_record'
  | 'nvq_learning'
  | 'general'

export function detectDocumentKind(text: string, title = ''): OrbDocumentKind {
  const combined = `${title} ${text}`.toLowerCase()
  if (REG44_MARKERS.some((term) => combined.includes(term))) return 'reg44'
  if (NVQ_MARKERS.some((term) => combined.includes(term))) return 'nvq_learning'
  if (POLICY_MARKERS.some((term) => combined.includes(term))) return 'policy'
  if (INCIDENT_MARKERS.some((term) => combined.includes(term))) return 'incident_record'
  return 'general'
}

const CORE_ACTIONS: OrbDocumentContextualAction[] = [
  { lens: 'summary', label: 'Summarise this' },
  { lens: 'explain', label: 'Explain this' },
  { lens: 'actions', label: 'Create action plan' }
]

const REG44_ACTIONS: OrbDocumentContextualAction[] = [
  { lens: 'reg44', label: 'Reg 44 extraction' },
  { lens: 'actions', label: 'Action plan' },
  { lens: 'manager_oversight', label: 'Manager response' },
  { lens: 'ri_governance', label: 'RI oversight' },
  { lens: 'ofsted', label: 'Ofsted lens' }
]

const POLICY_ACTIONS: OrbDocumentContextualAction[] = [
  { lens: 'policy_card', label: 'Policy card' },
  { lens: 'staff_briefing', label: 'Staff briefing' },
  { lens: 'checklist', label: 'Audit checklist' },
  { lens: 'supervision', label: 'Supervision questions' },
  { lens: 'recording_quality', label: 'Recording requirements' }
]

const INCIDENT_ACTIONS: OrbDocumentContextualAction[] = [
  { lens: 'recording_quality', label: 'Recording quality' },
  { lens: 'safeguarding', label: 'Safeguarding lens' },
  { lens: 'manager_oversight', label: 'Manager oversight' },
  { lens: 'what_is_missing', label: 'What is missing?' }
]

const NVQ_ACTIONS: OrbDocumentContextualAction[] = [
  { lens: 'nvq_evidence_map', label: 'NVQ evidence map' },
  { lens: 'qualification_criteria_explainer', label: 'Explain criteria' },
  { lens: 'reflective_account_plan', label: 'Reflective account plan' },
  { lens: 'assessor_feedback', label: 'Assessor feedback' },
  { lens: 'professional_discussion_prompts', label: 'Professional discussion' },
  { lens: 'learning_action_plan', label: 'Learning action plan' }
]

export function contextualDocumentActions(text: string, title = ''): OrbDocumentContextualAction[] {
  const kind = detectDocumentKind(text, title)
  const seen = new Set<OrbDocumentLens>()
  const merged: OrbDocumentContextualAction[] = []

  const add = (items: OrbDocumentContextualAction[]) => {
    for (const item of items) {
      if (seen.has(item.lens)) continue
      seen.add(item.lens)
      merged.push(item)
    }
  }

  add(CORE_ACTIONS)
  if (kind === 'reg44') add(REG44_ACTIONS)
  else if (kind === 'nvq_learning') add(NVQ_ACTIONS)
  else if (kind === 'policy') add(POLICY_ACTIONS)
  else if (kind === 'incident_record') add(INCIDENT_ACTIONS)
  else {
    add([
      { lens: 'policy_card', label: 'Policy card' },
      { lens: 'ofsted', label: 'Ofsted lens' },
      { lens: 'safeguarding', label: 'Safeguarding lens' },
      { lens: 'what_is_missing', label: 'What is missing?' }
    ])
  }

  return merged.slice(0, 8)
}

export type OrbDocumentIntelligenceSection = {
  heading: string
  body: string
  items?: string[]
}

export type OrbDocumentIntelligenceResult = {
  lens: OrbDocumentLens
  title: string
  summary: string
  sections?: OrbDocumentIntelligenceSection[]
  actions?: Array<{
    title: string
    reason?: string | null
    owner?: string | null
    due_date?: string | null
    risk_level?: string | null
  }>
  checklist?: string[]
  confidence?: string
  standalone?: boolean
  os_records_accessed?: boolean
  missing_information?: string[]
  policy_card?: Record<string, unknown>
  reg44?: Record<string, unknown>
}

const DOCUMENT_LENS_TITLE_PREFIX: Partial<Record<OrbDocumentLens, string>> = {
  policy_card: 'Policy Card',
  reg44: 'Reg 44 Review',
  reg45: 'Reg 45 Evidence Review',
  actions: 'Action Plan',
  safeguarding: 'Safeguarding Lens',
  ofsted: 'Ofsted Lens',
  staff_briefing: 'Staff Briefing',
  recording_quality: 'Recording Quality',
  manager_oversight: 'Manager Oversight',
  ri_governance: 'RI Governance Lens',
  supervision: 'Supervision Questions',
  checklist: 'Audit Checklist',
  what_is_missing: 'What Is Missing',
  summary: 'Document Summary',
  explain: 'Document Explanation'
}

/** First meaningful line from pasted/uploaded text when title is missing. */
export function inferDocumentTitleFromText(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  for (const line of lines) {
    if (line.length < 6 || line.length > 120) continue
    if (/^(page\s+\d|confidential|draft|version\s+\d)/i.test(line)) continue
    if (/^[-#*]+/.test(line)) continue
    return line.length > 80 ? `${line.slice(0, 77).trim()}…` : line
  }
  return 'Uploaded document'
}

/** Human-readable title for document intelligence outputs and saves. */
export function documentIntelligenceDisplayTitle(
  lens: OrbDocumentLens | string,
  documentTitle?: string | null,
  documentText?: string
): string {
  const key = String(lens).trim() as OrbDocumentLens
  const prefix =
    DOCUMENT_LENS_TITLE_PREFIX[key] ||
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  const doc =
    (documentTitle || '').trim() ||
    (documentText?.trim() ? inferDocumentTitleFromText(documentText) : 'Uploaded document')
  return `${prefix} — ${doc}`
}

export function formatDocumentIntelligenceMarkdown(result: OrbDocumentIntelligenceResult): string {
  const lines: string[] = [
    `# ${result.title}`,
    '',
    `**Lens:** ${result.lens.replace(/_/g, ' ')}`,
    '',
    result.summary,
    '',
    '_Based only on the uploaded or pasted document — standalone ORB has not checked live IndiCare OS records._',
    ''
  ]

  for (const section of result.sections || []) {
    lines.push(`## ${section.heading}`)
    if (section.body) lines.push(section.body)
    for (const item of section.items || []) {
      lines.push(`- ${item}`)
    }
    lines.push('')
  }

  if (result.policy_card) {
    const card = result.policy_card as Record<string, string>
    if (card.what_staff_must_know) {
      lines.push('## What staff must know')
      lines.push(card.what_staff_must_know)
      lines.push('')
    }
    if (card.when_to_escalate) {
      lines.push('## When to escalate')
      lines.push(card.when_to_escalate)
      lines.push('')
    }
    if (card.manager_responsibilities) {
      lines.push('## Manager responsibilities')
      lines.push(card.manager_responsibilities)
      lines.push('')
    }
  }

  if (result.actions?.length) {
    lines.push('## Draft actions')
    for (const action of result.actions) {
      const owner = action.owner ? ` (${action.owner})` : ''
      const due = action.due_date ? ` — due: ${action.due_date}` : ''
      lines.push(`- **${action.title}**${owner}${due}`)
      if (action.reason) lines.push(`  - ${action.reason}`)
    }
    lines.push('')
  }

  if (result.checklist?.length) {
    lines.push('## Checklist')
    for (const item of result.checklist) {
      lines.push(`- [ ] ${item}`)
    }
    lines.push('')
  }

  if (result.missing_information?.length) {
    lines.push('## Missing information')
    for (const gap of result.missing_information) {
      lines.push(`- ${gap}`)
    }
  }

  return lines.join('\n').trim()
}
