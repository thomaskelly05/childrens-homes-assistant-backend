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
    id: 'staff-team',
    label: 'Founder Staff Team',
    prompts: [
      'What should my CTO focus on?',
      'Ask the Brand Ambassador to draft a LinkedIn post.',
      'What should the developer build next?',
      'Run my founder staff team.',
      'What approvals are waiting?',
      'Create a Cursor brief for the next build.',
      'What should I post this week?',
      'What is my biggest technical risk?',
      'What is my biggest brand opportunity?'
    ]
  }
]

/** Flat list of featured example prompts for quick access */
export const FOUNDER_ORB_FEATURED_PROMPTS = [
  'What should my CTO focus on?',
  'Ask the Brand Ambassador to draft a LinkedIn post.',
  'What should the developer build next?',
  'Run my founder staff team.',
  'What approvals are waiting?',
  'Create a Cursor brief for the next build.',
  'What should I post this week?',
  'What is my biggest technical risk?'
] as const
