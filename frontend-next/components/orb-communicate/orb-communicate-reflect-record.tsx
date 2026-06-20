'use client'

import { useState } from 'react'

import {
  OrbCommunicateField,
  OrbCommunicatePreviewPanel,
  OrbCommunicateSection,
  orbCommunicateInputClass
} from '@/components/orb-communicate/orb-communicate-shared'
import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import { generateReflectionRecord } from '@/lib/orb/communicate/orb-communicate-client'
import type {
  CommunicationReflectionOutput,
  CommunicationReflectionRequest
} from '@/lib/orb/communicate/orb-communicate-types'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'

const DEFAULT_REQUEST: CommunicationReflectionRequest = {
  whatWasExplained: ''
}

export function OrbCommunicateReflectRecordWorkflow({ onBack }: { onBack: () => void }) {
  const [request, setRequest] = useState<CommunicationReflectionRequest>(DEFAULT_REQUEST)
  const [output, setOutput] = useState<CommunicationReflectionOutput | null>(null)
  const [loading, setLoading] = useState(false)

  function update<K extends keyof CommunicationReflectionRequest>(
    key: K,
    value: CommunicationReflectionRequest[K]
  ) {
    setRequest((current) => ({ ...current, [key]: value }))
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault()
    if (!request.whatWasExplained.trim()) return
    setLoading(true)
    try {
      const result = await generateReflectionRecord(request)
      setOutput(result)
    } finally {
      setLoading(false)
    }
  }

  if (output) {
    return (
      <div className="space-y-4" data-orb-communicate-workflow="reflect_record">
        <OrbCommunicatePreviewPanel
          title={output.title}
          onBack={() => setOutput(null)}
          onCopy={() => void copyTextToClipboard(output.record)}
        >
          <div className="space-y-5">
            <OrbCommunicateSection title="Record">
              <div className="whitespace-pre-wrap">{output.record}</div>
            </OrbCommunicateSection>
            {output.observationHighlights.length ? (
              <OrbCommunicateSection title="Observation highlights">
                <ul className="list-disc space-y-1 pl-5">
                  {output.observationHighlights.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </OrbCommunicateSection>
            ) : null}
            <OrbCommunicateSection title="Staff support summary">
              {output.staffSupportSummary}
            </OrbCommunicateSection>
            <OrbCommunicateSection title="Next steps">{output.nextSteps}</OrbCommunicateSection>
            <OrbCommunicateSection title="Recording reminders">
              <ul className="list-disc space-y-1 pl-5">
                {output.recordingReminders.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </OrbCommunicateSection>
          </div>
        </OrbCommunicatePreviewPanel>
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleGenerate} data-orb-communicate-workflow="reflect_record">
      <button type="button" onClick={onBack} className="text-sm text-sky-400/90 hover:text-sky-300">
        ← Back to Communicate
      </button>
      <OrbGlassCard className="space-y-4 border-white/10 bg-white/[0.04]">
        <OrbCommunicateField
          id="reflect-explained"
          label="What was explained?"
          hint="Describe the accessible explanation or support offered."
        >
          <textarea
            id="reflect-explained"
            className={`${orbCommunicateInputClass} min-h-[88px]`}
            required
            value={request.whatWasExplained}
            onChange={(e) => update('whatWasExplained', e.target.value)}
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="reflect-support" label="What communication support was used?">
          <textarea
            id="reflect-support"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.communicationSupportUsed ?? ''}
            onChange={(e) => update('communicationSupportUsed', e.target.value)}
            placeholder="e.g. Easy-read sheet, symbol board, social story"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="reflect-response" label="How did the person respond?">
          <textarea
            id="reflect-response"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.howDidPersonRespond ?? ''}
            onChange={(e) => update('howDidPersonRespond', e.target.value)}
            placeholder="Observable responses only — what staff saw and heard"
          />
        </OrbCommunicateField>
        <OrbCommunicateField
          id="reflect-exact"
          label="Exact words, signs or gestures"
          hint="Record verbatim where possible."
        >
          <textarea
            id="reflect-exact"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.exactWordsSignsOrGestures ?? ''}
            onChange={(e) => update('exactWordsSignsOrGestures', e.target.value)}
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="reflect-choices" label="What choices were offered?">
          <textarea
            id="reflect-choices"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.choicesOffered ?? ''}
            onChange={(e) => update('choicesOffered', e.target.value)}
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="reflect-helped" label="What helped?">
          <textarea
            id="reflect-helped"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.whatHelped ?? ''}
            onChange={(e) => update('whatHelped', e.target.value)}
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="reflect-not-helped" label="What did not help?">
          <textarea
            id="reflect-not-helped"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.whatDidNotHelp ?? ''}
            onChange={(e) => update('whatDidNotHelp', e.target.value)}
          />
        </OrbCommunicateField>
        <OrbCommunicateField
          id="reflect-concern"
          label="Any safeguarding, health or risk concern?"
          hint="Factual note only — follow local escalation routes."
        >
          <textarea
            id="reflect-concern"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.safeguardingHealthOrRiskConcern ?? ''}
            onChange={(e) => update('safeguardingHealthOrRiskConcern', e.target.value)}
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="reflect-next" label="What should staff do next?">
          <textarea
            id="reflect-next"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.whatShouldStaffDoNext ?? ''}
            onChange={(e) => update('whatShouldStaffDoNext', e.target.value)}
          />
        </OrbCommunicateField>
        <button
          type="submit"
          disabled={loading || !request.whatWasExplained.trim()}
          className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {loading ? 'Drafting record…' : 'Generate reflection record'}
        </button>
      </OrbGlassCard>
    </form>
  )
}
