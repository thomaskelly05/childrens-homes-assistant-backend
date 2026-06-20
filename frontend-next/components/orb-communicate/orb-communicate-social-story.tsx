'use client'

import { useState } from 'react'

import {
  OrbCommunicateField,
  OrbCommunicatePreviewPanel,
  OrbCommunicateSection,
  orbCommunicateInputClass,
  orbCommunicateSelectClass
} from '@/components/orb-communicate/orb-communicate-shared'
import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import { generateSocialStory } from '@/lib/orb/communicate/orb-communicate-client'
import type { SocialStoryOutput, SocialStoryRequest } from '@/lib/orb/communicate/orb-communicate-types'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'

const DEFAULT_REQUEST: SocialStoryRequest = {
  situation: '',
  tone: 'calm'
}

export function OrbCommunicateSocialStoryWorkflow({ onBack }: { onBack: () => void }) {
  const [request, setRequest] = useState<SocialStoryRequest>(DEFAULT_REQUEST)
  const [output, setOutput] = useState<SocialStoryOutput | null>(null)
  const [loading, setLoading] = useState(false)

  function update<K extends keyof SocialStoryRequest>(key: K, value: SocialStoryRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }))
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault()
    if (!request.situation.trim()) return
    setLoading(true)
    try {
      const result = await generateSocialStory(request)
      setOutput(result)
    } finally {
      setLoading(false)
    }
  }

  if (output) {
    const copyText = [
      output.title,
      '',
      output.story,
      '',
      'Suggested symbols',
      output.suggestedSymbols.join(', '),
      '',
      'Staff delivery guidance',
      output.staffDeliveryGuidance,
      '',
      'Regulation support options',
      ...output.regulationSupportOptions.map((line) => `• ${line}`),
      '',
      'Follow-up reflection prompts',
      ...output.followUpReflectionPrompts.map((line) => `• ${line}`)
    ].join('\n')

    return (
      <div className="space-y-4" data-orb-communicate-workflow="social_story">
        <OrbCommunicatePreviewPanel
          title={output.title}
          onBack={() => setOutput(null)}
          onCopy={() => void copyTextToClipboard(copyText)}
        >
          <div className="space-y-5">
            <OrbCommunicateSection title="Social story">
              <div className="whitespace-pre-wrap">{output.story}</div>
            </OrbCommunicateSection>
            <OrbCommunicateSection title="Suggested symbols">
              <div className="flex flex-wrap gap-2">
                {output.suggestedSymbols.map((symbol) => (
                  <span
                    key={symbol}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            </OrbCommunicateSection>
            <OrbCommunicateSection title="Staff delivery guidance">
              {output.staffDeliveryGuidance}
            </OrbCommunicateSection>
            <OrbCommunicateSection title="Regulation support options">
              <ul className="list-disc space-y-1 pl-5">
                {output.regulationSupportOptions.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
            </OrbCommunicateSection>
            <OrbCommunicateSection title="Follow-up reflection prompts">
              <ul className="list-disc space-y-1 pl-5">
                {output.followUpReflectionPrompts.map((prompt) => (
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
    <form className="space-y-5" onSubmit={handleGenerate} data-orb-communicate-workflow="social_story">
      <button type="button" onClick={onBack} className="text-sm text-sky-400/90 hover:text-sky-300">
        ← Back to Communicate
      </button>
      <OrbGlassCard className="space-y-4 border-white/10 bg-white/[0.04]">
        <OrbCommunicateField id="story-situation" label="Situation" hint="What is the story about?">
          <textarea
            id="story-situation"
            className={`${orbCommunicateInputClass} min-h-[88px]`}
            required
            value={request.situation}
            onChange={(e) => update('situation', e.target.value)}
            placeholder="e.g. Going to a health appointment"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="story-hard" label="What may feel hard?">
          <textarea
            id="story-hard"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.whatMayFeelHard ?? ''}
            onChange={(e) => update('whatMayFeelHard', e.target.value)}
            placeholder="e.g. Waiting in an unfamiliar room"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="story-safe" label="What helps the person feel safe?">
          <textarea
            id="story-safe"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.whatHelpsFeelSafe ?? ''}
            onChange={(e) => update('whatHelpsFeelSafe', e.target.value)}
            placeholder="e.g. A familiar adult, sensory kit, knowing the plan"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="story-choices" label="What choices can the person make?">
          <textarea
            id="story-choices"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.choicesPersonCanMake ?? ''}
            onChange={(e) => update('choicesPersonCanMake', e.target.value)}
            placeholder="e.g. Ask for a break, use a symbol card"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="story-help" label="Who can help?">
          <textarea
            id="story-help"
            className={`${orbCommunicateInputClass} min-h-[72px]`}
            value={request.whoCanHelp ?? ''}
            onChange={(e) => update('whoCanHelp', e.target.value)}
            placeholder="e.g. Key worker, on-shift staff"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="story-tone" label="Tone">
          <select
            id="story-tone"
            className={orbCommunicateSelectClass}
            value={request.tone}
            onChange={(e) => update('tone', e.target.value as SocialStoryRequest['tone'])}
          >
            <option value="calm">Calm</option>
            <option value="reassuring">Reassuring</option>
            <option value="preparation">Preparation</option>
            <option value="repair">Repair</option>
          </select>
        </OrbCommunicateField>
        <button
          type="submit"
          disabled={loading || !request.situation.trim()}
          className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {loading ? 'Writing story…' : 'Generate social story'}
        </button>
      </OrbGlassCard>
    </form>
  )
}
