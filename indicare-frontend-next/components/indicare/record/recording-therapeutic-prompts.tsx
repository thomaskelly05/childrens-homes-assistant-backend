'use client'

import { resolveActiveRecordingForm } from '@/lib/record/recording-form-registry'
import { UNIVERSAL_THERAPEUTIC_PROMPTS } from '@/lib/record/recording-form-therapeutic-defaults'
import type { RecordingWorkspaceType } from '@/lib/record/recording-types'

const EXTRA_PROMPTS: Partial<Record<RecordingWorkspaceType, string[]>> = {
  'daily-note': [
    'What did the young person experience today?',
    'What support did adults offer?',
    'What strengths or progress can be noted?',
    'What changed by the end of the day?'
  ],
  incident: [
    'What was seen or heard?',
    'How did adults respond and support regulation?',
    'What repair or follow-up is needed?'
  ],
  'safeguarding-concern': [
    'What was noticed, said, seen or disclosed?',
    'Who was informed?',
    'What immediate safety action was taken?'
  ],
  'physical-intervention': [
    'What de-escalation was attempted?',
    'How long did the intervention last?',
    'Was debrief and repair offered?'
  ],
  missing: [
    'When was the concern first noticed?',
    'Who was informed?',
    'What happened on return?'
  ],
  'return-conversation': [
    'Was return interview/conversation offered?',
    'What did the young person say about return?',
    'What support was agreed?'
  ],
  'child-voice': [
    'What did they say, show or communicate?',
    'How were wishes and feelings understood?',
    'What should adults do next?'
  ],
  'medication-note-error': [
    'What medication activity took place?',
    'Any error, refusal or missed dose?',
    'Who was informed and what follow-up?'
  ],
  'manager-review': [
    'What record or event was reviewed?',
    'What evidence was considered?',
    'What decision or action is needed?'
  ],
  'reg44-evidence': [
    'Which quality theme does this support?',
    'What improvement action is needed?',
    'What is the impact for children?'
  ],
  'reg45-evidence': [
    'What evidence does this provide about quality of care?',
    'Which standard does it support?',
    'What improvement action is needed?'
  ]
}

export function RecordingTherapeuticPrompts({
  recordingType,
  formId
}: {
  recordingType: RecordingWorkspaceType
  formId?: string
}) {
  const form = resolveActiveRecordingForm(recordingType, formId)
  const prompts =
    form?.universalTherapeuticPrompts ||
    EXTRA_PROMPTS[recordingType] ||
    form?.qualityChecklist.slice(0, 4) ||
    UNIVERSAL_THERAPEUTIC_PROMPTS.slice(0, 8)

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
