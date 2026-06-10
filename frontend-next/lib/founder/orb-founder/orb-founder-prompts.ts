/**
 * ORB Founder — suggested prompt categories and example questions.
 */

export type FounderOrbPromptCategory = {
  id: string
  label: string
  prompts: string[]
}

export const FOUNDER_ORB_PROMPT_CATEGORIES: FounderOrbPromptCategory[] = [
  {
    id: 'strategy',
    label: 'Strategy',
    prompts: [
      'What should I do today?',
      'Show my top actions',
      'Create actions from this',
      'What is the biggest operational risk before provider rollout?'
    ]
  },
  {
    id: 'actions',
    label: 'Founder Actions',
    prompts: [
      'What actions are linked to Ofsted?',
      'What actions are linked to AI cost?'
    ]
  },
  {
    id: 'product',
    label: 'Product',
    prompts: [
      'What should I build next and why?',
      'What do these numbers say about product-market fit?'
    ]
  },
  {
    id: 'ofsted',
    label: 'Ofsted',
    prompts: ['What would Ofsted likely challenge in this product?']
  },
  {
    id: 'growth',
    label: 'Growth',
    prompts: ['What do these numbers say about product-market fit?']
  },
  {
    id: 'investors',
    label: 'Investors',
    prompts: ['Give me the honest investor view of IndiCare right now.']
  },
  {
    id: 'ai-cost',
    label: 'AI Cost',
    prompts: ['How do I reduce AI cost without weakening ORB quality?']
  },
  {
    id: 'sector',
    label: 'Sector Intelligence',
    prompts: ['What sector trends should shape our product roadmap?']
  },
  {
    id: 'founder-story',
    label: 'Founder Story',
    prompts: ["Turn this week's product progress into a LinkedIn post."]
  },
  {
    id: 'operating-loop',
    label: 'Operating Loop',
    prompts: [
      'Run my operating loop.',
      'What happened in the last operating loop?',
      'What did the CTO recommend?',
      'What build briefs were created?',
      'What approvals are waiting?',
      'What should I decide today?',
      'Run a brand loop.',
      'Run a quality loop.',
      'Run a technical loop.'
    ]
  }
]

/** Flat list of featured example prompts for quick access */
export const FOUNDER_ORB_FEATURED_PROMPTS = [
  'Run my operating loop.',
  'What happened in the last operating loop?',
  'What did the CTO recommend?',
  'What approvals are waiting?',
  'What should I decide today?',
  'Run a quality loop.',
  'Run a technical loop.'
] as const
