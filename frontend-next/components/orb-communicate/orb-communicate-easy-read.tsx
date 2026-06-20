'use client'

import { useState } from 'react'

import {
  OrbCommunicateField,
  OrbCommunicatePreviewPanel,
  OrbCommunicateSection,
  OrbCommunicateSymbolPlaceholder,
  orbCommunicateInputClass,
  orbCommunicateSelectClass
} from '@/components/orb-communicate/orb-communicate-shared'
import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import { generateEasyRead } from '@/lib/orb/communicate/orb-communicate-client'
import type { EasyReadOutput, EasyReadRequest } from '@/lib/orb/communicate/orb-communicate-types'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'

const DEFAULT_REQUEST: EasyReadRequest = {
  ageGroup: 'young_person',
  whatNeedsExplaining: '',
  context: 'routine',
  outputLength: 'standard'
}

export function OrbCommunicateEasyReadWorkflow({ onBack }: { onBack: () => void }) {
  const [request, setRequest] = useState<EasyReadRequest>(DEFAULT_REQUEST)
  const [output, setOutput] = useState<EasyReadOutput | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault()
    if (!request.whatNeedsExplaining.trim()) return
    setLoading(true)
    try {
      const result = await generateEasyRead(request)
      setOutput(result)
    } finally {
      setLoading(false)
    }
  }

  function update<K extends keyof EasyReadRequest>(key: K, value: EasyReadRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }))
  }

  if (output) {
    const copyText = [
      output.title,
      '',
      'What is happening',
      output.whatIsHappening,
      '',
      'Why it is happening',
      output.whyItIsHappening,
      '',
      'What happens next',
      output.whatHappensNext,
      '',
      'Who can help',
      output.whoCanHelp,
      '',
      'How I can say how I feel',
      output.howICanSayHowIFeel,
      '',
      'Suggested visual symbols',
      output.suggestedVisualSymbols.join(', '),
      '',
      'Staff guidance',
      output.staffGuidance,
      '',
      'Recording prompts',
      ...output.recordingPrompts.map((line) => `• ${line}`)
    ].join('\n')

    return (
      <div className="space-y-4" data-orb-communicate-workflow="easy_read">
        <OrbCommunicatePreviewPanel
          title={output.title}
          onBack={() => setOutput(null)}
          onCopy={() => void copyTextToClipboard(copyText)}
        >
          <div className="space-y-5">
            <OrbCommunicateSection title="What is happening">{output.whatIsHappening}</OrbCommunicateSection>
            <OrbCommunicateSection title="Why it is happening">{output.whyItIsHappening}</OrbCommunicateSection>
            <OrbCommunicateSection title="What happens next">{output.whatHappensNext}</OrbCommunicateSection>
            <OrbCommunicateSection title="Who can help">{output.whoCanHelp}</OrbCommunicateSection>
            <OrbCommunicateSection title="How I can say how I feel">
              {output.howICanSayHowIFeel}
            </OrbCommunicateSection>
            <OrbCommunicateSection title="Suggested visual symbols">
              <div className="flex flex-wrap gap-2">
                {output.suggestedVisualSymbols.map((symbol) => (
                  <span
                    key={symbol}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            </OrbCommunicateSection>
            <OrbCommunicateSection title="Staff guidance">{output.staffGuidance}</OrbCommunicateSection>
            <OrbCommunicateSection title="Recording prompts">
              <ul className="list-disc space-y-1 pl-5">
                {output.recordingPrompts.map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ul>
            </OrbCommunicateSection>
          </div>
        </OrbCommunicatePreviewPanel>
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleGenerate} data-orb-communicate-workflow="easy_read">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-sky-400/90 hover:text-sky-300"
      >
        ← Back to Communicate
      </button>
      <OrbGlassCard className="space-y-4 border-white/10 bg-white/[0.04]">
        <OrbCommunicateField id="easy-read-person" label="Person name or initials (optional)">
          <input
            id="easy-read-person"
            className={orbCommunicateInputClass}
            value={request.personNameOrInitials ?? ''}
            onChange={(e) => update('personNameOrInitials', e.target.value)}
            placeholder="e.g. A. or first name"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="easy-read-age" label="Age group">
          <select
            id="easy-read-age"
            className={orbCommunicateSelectClass}
            value={request.ageGroup}
            onChange={(e) => update('ageGroup', e.target.value as EasyReadRequest['ageGroup'])}
          >
            <option value="child">Child</option>
            <option value="young_person">Young person</option>
            <option value="adult">Adult</option>
          </select>
        </OrbCommunicateField>
        <OrbCommunicateField
          id="easy-read-topic"
          label="What needs to be explained?"
          hint="Describe the situation in plain language for staff preparation."
        >
          <textarea
            id="easy-read-topic"
            className={`${orbCommunicateInputClass} min-h-[88px]`}
            required
            value={request.whatNeedsExplaining}
            onChange={(e) => update('whatNeedsExplaining', e.target.value)}
            placeholder="e.g. A change to visiting arrangements this weekend"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="easy-read-context" label="Context">
          <select
            id="easy-read-context"
            className={orbCommunicateSelectClass}
            value={request.context}
            onChange={(e) => update('context', e.target.value as EasyReadRequest['context'])}
          >
            <option value="contact">Contact</option>
            <option value="health">Health</option>
            <option value="safety">Safety</option>
            <option value="routine">Routine</option>
            <option value="transition">Transition</option>
            <option value="house_meeting">House meeting</option>
            <option value="complaint">Complaint</option>
            <option value="safeguarding">Safeguarding</option>
            <option value="behaviour_support">Behaviour support</option>
            <option value="other">Other</option>
          </select>
        </OrbCommunicateField>
        <OrbCommunicateField id="easy-read-comm-needs" label="Communication needs">
          <textarea
            id="easy-read-comm-needs"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.communicationNeeds ?? ''}
            onChange={(e) => update('communicationNeeds', e.target.value)}
            placeholder="e.g. Short sentences, symbols alongside speech"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="easy-read-sensory" label="Sensory considerations">
          <textarea
            id="easy-read-sensory"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.sensoryConsiderations ?? ''}
            onChange={(e) => update('sensoryConsiderations', e.target.value)}
            placeholder="e.g. Quiet room, reduced visual clutter"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="easy-read-emotional" label="Emotional context">
          <textarea
            id="easy-read-emotional"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.emotionalContext ?? ''}
            onChange={(e) => update('emotionalContext', e.target.value)}
            placeholder="e.g. May feel anxious about change"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="easy-read-length" label="Output length">
          <select
            id="easy-read-length"
            className={orbCommunicateSelectClass}
            value={request.outputLength}
            onChange={(e) => update('outputLength', e.target.value as EasyReadRequest['outputLength'])}
          >
            <option value="short">Short</option>
            <option value="standard">Standard</option>
            <option value="detailed">Detailed</option>
          </select>
        </OrbCommunicateField>
        <button
          type="submit"
          disabled={loading || !request.whatNeedsExplaining.trim()}
          className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate easy read preview'}
        </button>
      </OrbGlassCard>
    </form>
  )
}
