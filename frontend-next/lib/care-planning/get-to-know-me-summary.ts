export const GET_TO_KNOW_ME_PLAN_SET = [
  {
    id: 'one-page-profile',
    label: 'One-page profile',
    description: 'Who I am, what matters, what helps and what adults need to know today.',
    guidance: ['What I like to be called', 'What matters to me', 'How adults can help me today']
  },
  {
    id: 'care-plan',
    label: 'Care plan',
    description: 'Placement aims, routines, daily care, delegated authority and support.',
    guidance: ['Why I live here', 'My daily routines', 'What adults can agree or decide']
  },
  {
    id: 'health-plan',
    label: 'Health plan',
    description: 'Health needs, medication, appointments, sleep, diet and follow-up.',
    guidance: ['My health baseline', 'Medication and treatment', 'Appointments and follow-up']
  },
  {
    id: 'education-plan',
    label: 'Education plan',
    description: 'School, attendance, learning needs, achievements and education actions.',
    guidance: ['School and attendance', 'Learning support', 'Education actions']
  },
  {
    id: 'positive-support-plan',
    label: 'Positive support plan',
    description: 'What helps, early signs, regulation, repair and consistent adult responses.',
    guidance: ['Early signs adults may notice', 'What helps me regulate', 'Repair and recovery']
  },
  {
    id: 'risk-review',
    label: 'Risk review',
    description: 'Known risks, protective factors, scores, controls and review actions.',
    guidance: ['Known risks and protective factors', 'Current score and rationale', 'Review actions']
  },
  {
    id: 'safety-support',
    label: 'Safety support',
    description: 'Safety actions, protective planning and escalation information.',
    guidance: ['What adults need to notice', 'What adults should do', 'When managers need to know']
  },
  {
    id: 'missing-plan',
    label: 'Missing from home plan',
    description: 'Patterns, locations, prevention and return conversation learning.',
    guidance: ['Known patterns', 'Prevention and support', 'Return conversation learning']
  },
  {
    id: 'restrictive-practice',
    label: 'Restrictive practice review',
    description: 'Physical intervention learning, reduction planning and alternatives.',
    guidance: ['Known history', 'Alternatives to try first', 'Debrief and reduction learning']
  },
  {
    id: 'relationships-plan',
    label: 'Relationships plan',
    description: 'Family time, important people, contact and relationship support.',
    guidance: ['Important people', 'Family time support', 'Emotional preparation and repair']
  },
  {
    id: 'identity-life-story',
    label: 'Identity and life story',
    description: 'Identity, culture, faith, language, belonging, memories and LifeEcho.',
    guidance: ['Identity and belonging', 'Culture, faith and language', 'Life story and memories']
  },
  {
    id: 'independence-plan',
    label: 'Independence plan',
    description: 'Skills, routines, money, travel, self-care and preparation for adulthood.',
    guidance: ['Current skills', 'Goals and next steps', 'Monthly progress']
  },
  {
    id: 'wellbeing-plan',
    label: 'Emotional wellbeing plan',
    description: 'Feelings, presentation, regulation, therapeutic input and what helps.',
    guidance: ['How I present emotionally', 'What helps me feel settled', 'Support or therapy input']
  },
  {
    id: 'communication-profile',
    label: 'Communication profile',
    description: 'Communication style, sensory needs, processing and accessible support.',
    guidance: ['How I communicate', 'Processing and understanding', 'Sensory support']
  },
  {
    id: 'voice-plan',
    label: 'Child voice plan',
    description: 'Wishes, feelings, child requests and you-said-we-did follow-up.',
    guidance: ['What I am saying', 'What I want adults to know', 'You said, we did']
  },
  {
    id: 'calendar',
    label: 'Appointments and calendar',
    description: 'Health, education, family time, statutory dates, visits and reminders.',
    guidance: ['Upcoming dates', 'Preparation needed', 'Follow-up actions']
  },
  {
    id: 'transition-plan',
    label: 'Transition plan',
    description: 'Moving on, endings, independence, preparation and leaving care.',
    guidance: ['Where I am moving towards', 'What needs preparing', 'Ending well']
  }
] as const

export type GetToKnowMePlanId = typeof GET_TO_KNOW_ME_PLAN_SET[number]['id']
