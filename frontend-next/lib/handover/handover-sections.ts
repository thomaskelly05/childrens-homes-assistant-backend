import type { HandoverDraftSection } from '@/lib/os-api/handover-intelligence'

export const DEFAULT_HANDOVER_SECTIONS: HandoverDraftSection[] = [
  {
    id: 'children-presentation',
    title: 'Children and presentation',
    body: '',
    prompts: ['How did each child present?', 'Any mood or regulation changes?', 'Key positives to carry forward?']
  },
  {
    id: 'safeguarding-isn',
    title: 'Safeguarding / ISN',
    body: '',
    prompts: ['Any safeguarding themes to hand over?', 'ISN patterns needing follow-up?', 'Who needs to know?']
  },
  {
    id: 'incidents-behaviour',
    title: 'Incidents / behaviour',
    body: '',
    prompts: ['Incidents or distress episodes?', 'Adult response and repair?', 'Triggers or patterns?']
  },
  {
    id: 'missing-risk',
    title: 'Missing / return / risk',
    body: '',
    prompts: ['Missing episodes or risk indicators?', 'Return welfare checks?', 'Updated risk awareness?']
  },
  {
    id: 'health-medication',
    title: 'Health / medication',
    body: '',
    prompts: ['Medication given or refused?', 'Health appointments or clinical follow-up?']
  },
  {
    id: 'education-family',
    title: 'Education / family time',
    body: '',
    prompts: ['Education updates?', 'Family contact or visits?', 'Professional meetings?']
  },
  {
    id: 'actions-follow-up',
    title: 'Actions and follow-up',
    body: '',
    prompts: ['Open actions for next shift?', 'Manager decisions needed?', 'Recording follow-up?']
  },
  {
    id: 'environment-practical',
    title: 'Environment / practical tasks',
    body: '',
    prompts: ['Environmental or maintenance issues?', 'Practical tasks for incoming staff?']
  },
  {
    id: 'staff-wellbeing',
    title: 'Staff support / wellbeing',
    body: '',
    prompts: ['Staff support needs?', 'Supervision or debrief themes?']
  },
  {
    id: 'next-shift',
    title: 'Next shift priorities',
    body: '',
    prompts: ['Top three priorities for the next shift?', 'What must not be missed?']
  }
]
