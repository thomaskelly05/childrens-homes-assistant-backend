'use client'

import type { RecordingWorkspaceType } from '@/lib/record/recording-types'

const PROMPTS_BY_TYPE: Record<RecordingWorkspaceType, string[]> = {
  'daily-note': [
    'What did the young person experience today?',
    'What support did adults offer?',
    'What changed by the end of the day?'
  ],
  incident: [
    'What was seen or heard?',
    'How did adults respond and support regulation?',
    'What repair or follow-up is needed?'
  ],
  'child-voice': [
    'What did they say, show or communicate?',
    'How were wishes and feelings understood?',
    'What should adults do next?'
  ],
  keywork: ['What was the goal of the session?', 'What progress was observed?', 'What happens next?'],
  missing: ['When was the concern noticed?', 'Who was informed?', 'What happened on return?'],
  'family-time': ['What contact took place?', 'How did the young person respond?', 'What matters for continuity?'],
  'health-medication': ['What was observed?', 'What action was taken?', 'What follow-up is required?'],
  handover: ['What should the next adults know?', 'Any risks or routines to hold?', 'Unfinished follow-up?'],
  'evidence-document': ['What evidence are you noting?', 'Why does it matter?', 'Who needs to see it?'],
  'staff-reflection': ['What are you reflecting on?', 'What learning emerged?', 'What follow-up is needed?']
}

export function RecordingTherapeuticPrompts({ recordingType }: { recordingType: RecordingWorkspaceType }) {
  const prompts = PROMPTS_BY_TYPE[recordingType] || PROMPTS_BY_TYPE['daily-note']

  return (
    <section data-testid="recording-therapeutic-prompts" className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800">Therapeutic prompts</p>
      <ul className="mt-2 space-y-2 text-sm font-semibold leading-6 text-emerald-950">
        {prompts.map((prompt) => (
          <li key={prompt} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{prompt}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
