export type DocumentScope = 'child' | 'home' | 'staff'

export type DocumentTemplateSummary = {
  templateId: string
  title: string
  scope: DocumentScope
  category: string
  reviewFrequency: string
  ownerRole: string
  description: string
  sections: string[]
  prompts: string[]
}

const childVoicePrompts = [
  'What mattered to the child?',
  'How did the child experience this?',
  'What support helped?',
  'What changed emotionally?',
  'What strengths were seen?',
  'What relationships supported progress?',
  'How was the child voice included?'
]

const childDocuments = [
  'Care Plan',
  'Placement Plan',
  'Matching Assessment',
  'Impact Risk Assessment',
  'Individual Risk Assessment',
  'Missing From Care Protocol',
  'Positive Behaviour Support Plan',
  'Education Plan',
  'Health Plan',
  'Medication Plan',
  'Family Contact Plan',
  'Independence Plan',
  'Online Safety Plan',
  'Self-Harm Risk Assessment',
  'Safety Plan',
  'Keywork Plan',
  'Emotional Wellbeing Plan',
  'CSE/CCE Risk Assessment',
  'Bullying/Peer Relationship Plan'
]

const homeDocuments = [
  'Statement of Purpose',
  "Children's Guide",
  'Locality Risk Assessment',
  'Safeguarding Policy',
  'Missing Child Policy',
  'Behaviour Management Policy',
  'Restraint Policy',
  'Complaints Policy',
  'Whistleblowing Policy',
  'Medication Policy',
  'Admissions Policy',
  'Equality & Diversity Policy',
  'Data Protection Policy',
  'Online Safety Policy',
  'Business Continuity Plan',
  'Fire Risk Assessment',
  'Health & Safety Risk Assessment',
  'Workforce Development Plan',
  'Quality Assurance Calendar',
  'Reg 44 Report',
  'Reg 45 Review',
  'Ofsted Action Plan'
]

const staffDocuments = [
  'Supervision Record',
  'Appraisal',
  'Induction',
  'Probation',
  'Training Matrix',
  'Competency Assessment',
  'Safer Recruitment Checklist',
  'DBS Tracking',
  'Staff Development Plan'
]

export function documentSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function category(title: string, scope: DocumentScope) {
  const lower = title.toLowerCase()
  if (scope === 'child' && lower.includes('risk')) return 'risk_assessment'
  if (scope === 'child' && lower.includes('plan')) return 'child_plan'
  if (scope === 'home' && (lower.includes('reg ') || lower.includes('ofsted') || lower.includes('quality'))) return 'inspection_readiness'
  if (scope === 'staff') return 'staff_confidential'
  return `${scope}_document`
}

function makeTemplate(title: string, scope: DocumentScope): DocumentTemplateSummary {
  const child = scope === 'child'
  return {
    templateId: `${scope}_${documentSlug(title)}`,
    title,
    scope,
    category: category(title, scope),
    reviewFrequency: title.includes('Reg 44') || title.includes('Supervision') ? 'monthly' : title.includes('Reg 45') ? 'six-monthly' : title.toLowerCase().includes('risk') ? 'monthly or after significant event' : 'annual or when circumstances change',
    ownerRole: child ? 'key worker / manager' : scope === 'home' ? 'registered manager / RI' : 'registered manager / supervisor',
    description: child ? 'Editable, child-centred plan with chronology, evidence, actions, review and sign-off.' : 'Editable operational document with review ownership, evidence, actions and sign-off.',
    sections: child
      ? ['Child voice and wishes', 'Story and starting point', 'Strengths, relationships and what helps', 'Current needs, risks and support', 'Actions, evidence and review']
      : scope === 'home'
        ? ['Purpose and child impact', 'Practice expectations', 'Evidence and oversight', 'Actions and inspection readiness']
        : ['Reflective practice', 'Wellbeing, support and accountability', 'Development evidence', 'Sign-off and next review'],
    prompts: child ? childVoicePrompts : ['What evidence supports this?', 'Who owns the next review?', 'What action remains open?', 'What should a manager sample?']
  }
}

export const documentTemplates = [
  ...childDocuments.map((title) => makeTemplate(title, 'child')),
  ...homeDocuments.map((title) => makeTemplate(title, 'home')),
  ...staffDocuments.map((title) => makeTemplate(title, 'staff'))
]

export function templatesFor(scope: DocumentScope, categoryFilter?: string) {
  return documentTemplates.filter((template) => template.scope === scope && (!categoryFilter || template.category === categoryFilter))
}

export function getDocumentTemplate(templateId?: string) {
  return documentTemplates.find((template) => template.templateId === templateId) || documentTemplates[0]
}
