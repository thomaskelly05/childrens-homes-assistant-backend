export type CarePlanImpactAreaId =
  | 'placement-care-plan'
  | 'health'
  | 'education'
  | 'positive-behaviour-support'
  | 'behaviour-support'
  | 'risk-assessment'
  | 'keeping-safe'
  | 'missing-from-home'
  | 'physical-intervention'
  | 'family-relationships'
  | 'identity-culture'
  | 'independence'
  | 'emotional-wellbeing'
  | 'communication'
  | 'child-voice'
  | 'appointments-calendar'

export type CarePlanImpactArea = {
  id: CarePlanImpactAreaId
  label: string
  shortLabel: string
  description: string
  recordTypes: string[]
  reviewPrompt: string
}

export const CARE_PLAN_IMPACT_AREAS: CarePlanImpactArea[] = [
  {
    id: 'placement-care-plan',
    label: 'Placement and care plan',
    shortLabel: 'Care plan',
    description: 'Overall placement aims, routines, support needs, daily care and what adults must know to provide consistent care.',
    recordTypes: ['daily-note', 'handover', 'keywork', 'child-voice', 'manager-review'],
    reviewPrompt: 'Does this change the child’s placement plan, daily routines, delegated authority or support arrangements?'
  },
  {
    id: 'health',
    label: 'Health plan',
    shortLabel: 'Health',
    description: 'Physical health, medication, appointments, allergies, injuries, sleep, diet, emotional wellbeing and health follow-up.',
    recordTypes: ['health-appointment', 'health-medication', 'medication-note-error', 'injury-body-map', 'daily-note'],
    reviewPrompt: 'Does the health plan, medication arrangements, appointments or follow-up need updating?'
  },
  {
    id: 'education',
    label: 'Education plan',
    shortLabel: 'Education',
    description: 'School attendance, learning, EHCP/SEN needs, exclusions, achievements, barriers and education actions.',
    recordTypes: ['education-note', 'daily-note', 'keywork'],
    reviewPrompt: 'Does the education plan, school communication or attendance support need review?'
  },
  {
    id: 'positive-behaviour-support',
    label: 'Positive behaviour support plan',
    shortLabel: 'PBS',
    description: 'Behaviour as communication, proactive support, de-escalation, triggers, regulation strategies and what helps.',
    recordTypes: ['incident', 'behaviour-support', 'daily-note', 'keywork', 'physical-intervention'],
    reviewPrompt: 'Does this identify a trigger, pattern, strategy or unmet need that should update the PBS plan?'
  },
  {
    id: 'behaviour-support',
    label: 'Behaviour support plan',
    shortLabel: 'Behaviour',
    description: 'Behaviour patterns, adult responses, repair, boundaries, restorative work and direct support.',
    recordTypes: ['incident', 'behaviour-support', 'keywork', 'daily-note'],
    reviewPrompt: 'Does the behaviour support plan need a new strategy, action or manager review?'
  },
  {
    id: 'risk-assessment',
    label: 'Risk assessment',
    shortLabel: 'Risk',
    description: 'Known and emerging risks, protective factors, dynamic risk, risk reduction and review dates.',
    recordTypes: ['incident', 'safeguarding-concern', 'missing', 'physical-intervention', 'room-search', 'daily-note'],
    reviewPrompt: 'Does this create, increase, reduce or evidence a risk that needs the risk assessment updating?'
  },
  {
    id: 'keeping-safe',
    label: 'Keeping safe plan',
    shortLabel: 'Keeping safe',
    description: 'Safeguarding worries, exploitation, online safety, self-harm, bullying, allegations, disclosures and protective actions.',
    recordTypes: ['safeguarding-concern', 'incident', 'child-voice', 'keywork', 'daily-note'],
    reviewPrompt: 'Does the keeping safe plan need immediate review or a safeguarding action?'
  },
  {
    id: 'missing-from-home',
    label: 'Missing from home plan',
    shortLabel: 'Missing',
    description: 'Missing episodes, return conversations, locations, triggers, push/pull factors, prevention and disruption work.',
    recordTypes: ['missing', 'return-conversation', 'safeguarding-concern', 'keywork'],
    reviewPrompt: 'Does this update missing-from-home triggers, known locations, prevention or return conversation learning?'
  },
  {
    id: 'physical-intervention',
    label: 'Physical intervention and restrictive practice review',
    shortLabel: 'PI / restraint',
    description: 'Physical intervention, restraint reduction, holds, debriefs, injuries, proportionality and alternatives tried.',
    recordTypes: ['physical-intervention', 'injury-body-map', 'incident'],
    reviewPrompt: 'Does this require manager review, restraint reduction planning, debrief or risk update?'
  },
  {
    id: 'family-relationships',
    label: 'Family, relationships and contact plan',
    shortLabel: 'Family',
    description: 'Family time, relationships, contact arrangements, significant people, repair, identity and emotional impact.',
    recordTypes: ['family-time', 'keywork', 'child-voice', 'daily-note'],
    reviewPrompt: 'Does this change contact arrangements, relationship support or emotional preparation?'
  },
  {
    id: 'identity-culture',
    label: 'Identity, culture and life story plan',
    shortLabel: 'Identity',
    description: 'Identity, culture, faith, language, belonging, life story work, memories and important personal meaning.',
    recordTypes: ['child-voice', 'keywork', 'daily-note', 'lifeecho-memory'],
    reviewPrompt: 'Does this need to update life story, identity support, cultural needs or the child’s one-page profile?'
  },
  {
    id: 'independence',
    label: 'Independence and preparation for adulthood plan',
    shortLabel: 'Independence',
    description: 'Skills, routines, money, travel, cooking, self-care, independence goals and preparation for adulthood.',
    recordTypes: ['keywork', 'daily-note', 'education-note'],
    reviewPrompt: 'Does this evidence progress or a new independence goal?'
  },
  {
    id: 'emotional-wellbeing',
    label: 'Emotional wellbeing and therapeutic support plan',
    shortLabel: 'Wellbeing',
    description: 'Feelings, presentation, trauma-informed support, regulation, relationships, therapeutic input and what helps.',
    recordTypes: ['daily-note', 'keywork', 'child-voice', 'incident', 'safeguarding-concern'],
    reviewPrompt: 'Does this update emotional presentation, regulation support or therapeutic strategies?'
  },
  {
    id: 'communication',
    label: 'Communication and sensory support profile',
    shortLabel: 'Communication',
    description: 'Communication style, autism-informed support, sensory needs, understanding, processing and accessible approaches.',
    recordTypes: ['daily-note', 'keywork', 'child-voice', 'education-note', 'behaviour-support'],
    reviewPrompt: 'Does this tell adults something important about communication, sensory needs or accessibility?'
  },
  {
    id: 'child-voice',
    label: 'Child voice and wishes/feelings',
    shortLabel: 'Voice',
    description: 'What the child said, wants, feels, disagrees with, asked for, or needs adults to hear.',
    recordTypes: ['child-voice', 'keywork', 'daily-note', 'return-conversation'],
    reviewPrompt: 'Does this need to be carried into plans, actions, advocacy or “you said, we did” follow-up?'
  },
  {
    id: 'appointments-calendar',
    label: 'Appointments and calendar',
    shortLabel: 'Calendar',
    description: 'Health, education, family time, LAC/review dates, statutory visits, appointments and reminders.',
    recordTypes: ['health-appointment', 'education-note', 'family-time', 'manager-review', 'daily-note'],
    reviewPrompt: 'Does this require a diary entry, appointment reminder or statutory review follow-up?'
  }
]

export function carePlanAreasForRecordingType(recordingType: string): CarePlanImpactArea[] {
  const matches = CARE_PLAN_IMPACT_AREAS.filter((area) => area.recordTypes.includes(recordingType))
  if (matches.length) return matches
  return CARE_PLAN_IMPACT_AREAS.filter((area) => ['placement-care-plan', 'risk-assessment', 'child-voice'].includes(area.id))
}
