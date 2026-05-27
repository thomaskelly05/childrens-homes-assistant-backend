/** Live citation card content for inline [Anchor] chips in ORB responses. */

export type CitationCardContent = {
  title: string
  whyItMatters: string
  evidenceExpectations?: string[]
  inspectionMeaning?: string
  practicalApplication?: string
  sourceHint?: string
}

const CITATION_CARDS: Record<string, CitationCardContent> = {
  'reg 12': {
    title: 'Regulation 12 — Protection of children',
    whyItMatters:
      'Children must be protected from harm and abuse. Adults must act immediately when protection concerns arise.',
    evidenceExpectations: [
      'What risk was identified and what immediate steps were taken.',
      'Who was informed and when.',
      'How the child was kept safe while decisions were made.'
    ],
    inspectionMeaning: 'Inspectors look for timely protection, not delayed escalation.',
    practicalApplication: 'Separate facts from interpretation; record actions and rationale clearly.',
    sourceHint: "Children's Homes Regulations 2015"
  },
  'reg 13': {
    title: 'Regulation 13 — Leadership and management',
    whyItMatters: 'Registered managers and leaders must oversee practice, decisions and learning.',
    evidenceExpectations: ['Manager review, supervision, follow-up actions and oversight trail.'],
    inspectionMeaning: 'Weak oversight often surfaces as a leadership finding.',
    practicalApplication: 'Show who reviewed what, when, and what changed as a result.',
    sourceHint: "Children's Homes Regulations 2015"
  },
  sccif: {
    title: 'SCCIF — Social care common inspection framework',
    whyItMatters: 'Inspection evaluates impact on children, not paperwork alone.',
    evidenceExpectations: ['Child experience, timeliness, professional curiosity, leadership impact.'],
    inspectionMeaning: 'Evidence must show what difference practice made for children.',
    practicalApplication: 'Link records to outcomes, voice and follow-through.',
    sourceHint: 'Ofsted SCCIF'
  },
  lado: {
    title: 'LADO — Local authority designated officer',
    whyItMatters: 'Allegations against adults working with children require structured consultation.',
    evidenceExpectations: ['Who was consulted, advice received, and actions taken without prejudging outcomes.'],
    practicalApplication: 'Preserve fairness while prioritising child protection.',
    sourceHint: 'Working Together / local procedures'
  },
  'working together': {
    title: 'Working Together',
    whyItMatters: 'Multi-agency safeguarding depends on timely information sharing and clear roles.',
    practicalApplication: 'Record who was contacted and what was agreed.',
    sourceHint: 'Statutory safeguarding guidance'
  },
  'recording quality': {
    title: 'Recording quality',
    whyItMatters: 'Strong records support safeguarding, continuity, inspection and child voice.',
    evidenceExpectations: [
      "Child's words where possible",
      'Observed facts vs adult interpretation',
      'Actions, rationale and outcomes'
    ],
    practicalApplication: 'Chronology-aware, specific, proportionate and reviewable.',
    sourceHint: 'IndiCare institutional cognition'
  }
}

function normaliseCitationKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function citationCardForLabel(label: string): CitationCardContent | null {
  const key = normaliseCitationKey(label)
  if (CITATION_CARDS[key]) return CITATION_CARDS[key]
  for (const [cardKey, card] of Object.entries(CITATION_CARDS)) {
    if (key.includes(cardKey) || cardKey.includes(key)) return card
  }
  return null
}
