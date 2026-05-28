export const GET_TO_KNOW_ME_PLAN_SET = [
  { id: 'one-page-profile', label: 'One-page profile', description: 'Who I am, what matters, what helps and what adults need to know today.' },
  { id: 'care-plan', label: 'Care plan', description: 'Placement aims, routines, daily care, delegated authority and support.' },
  { id: 'health-plan', label: 'Health plan', description: 'Health needs, medication, appointments, sleep, diet and follow-up.' },
  { id: 'education-plan', label: 'Education plan', description: 'School, attendance, learning needs, achievements and education actions.' },
  { id: 'positive-support-plan', label: 'Positive support plan', description: 'What helps, early signs, regulation, repair and consistent adult responses.' },
  { id: 'risk-review', label: 'Risk review', description: 'Known risks, protective factors, scores, controls and review actions.' },
  { id: 'safety-support', label: 'Safety support', description: 'Safety actions, protective planning and escalation information.' },
  { id: 'missing-plan', label: 'Missing from home plan', description: 'Patterns, locations, prevention and return conversation learning.' },
  { id: 'restrictive-practice', label: 'Restrictive practice review', description: 'Physical intervention learning, reduction planning and alternatives.' },
  { id: 'relationships-plan', label: 'Relationships plan', description: 'Family time, important people, contact and relationship support.' },
  { id: 'identity-life-story', label: 'Identity and life story', description: 'Identity, culture, faith, language, belonging, memories and LifeEcho.' },
  { id: 'independence-plan', label: 'Independence plan', description: 'Skills, routines, money, travel, self-care and preparation for adulthood.' },
  { id: 'wellbeing-plan', label: 'Emotional wellbeing plan', description: 'Feelings, presentation, regulation, therapeutic input and what helps.' },
  { id: 'communication-profile', label: 'Communication profile', description: 'Communication style, sensory needs, processing and accessible support.' },
  { id: 'voice-plan', label: 'Child voice plan', description: 'Wishes, feelings, child requests and you-said-we-did follow-up.' },
  { id: 'calendar', label: 'Appointments and calendar', description: 'Health, education, family time, statutory dates, visits and reminders.' },
  { id: 'transition-plan', label: 'Transition plan', description: 'Moving on, endings, independence, preparation and leaving care.' }
] as const

export type GetToKnowMePlanId = typeof GET_TO_KNOW_ME_PLAN_SET[number]['id']
