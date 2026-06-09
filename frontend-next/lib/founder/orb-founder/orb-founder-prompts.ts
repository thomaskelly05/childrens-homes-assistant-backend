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
      'What is the biggest operational risk before provider rollout?',
      'What should I focus on tomorrow?'
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
  }
]

/** Flat list of featured example prompts for quick access */
export const FOUNDER_ORB_FEATURED_PROMPTS = [
  'Give me the honest investor view of IndiCare right now.',
  'What is the biggest operational risk before provider rollout?',
  'What would Ofsted likely challenge in this product?',
  'What should I build next and why?',
  "Turn this week's product progress into a LinkedIn post.",
  'What do these numbers say about product-market fit?',
  'How do I reduce AI cost without weakening ORB quality?'
] as const
