'use client'

import { useEffect, useState } from 'react'

import {
  DEFAULT_COMMUNICATE_GUIDE_SETTINGS,
  OrbCommunicateGuidePanel,
  type CommunicateGuideSettings
} from '@/components/orb-communicate/orb-communicate-guide-panel'
import { ORB_COMMUNICATE_HUB_CARDS, OrbCommunicateAdvancedTools } from '@/components/orb-communicate/orb-communicate-hub'
import { ORB_COMMUNICATE_COMPACT_SAFETY } from '@/lib/orb/communicate/orb-communicate-plan'
import { loadMyVoiceProfileLocal } from '@/lib/orb/communicate/orb-communicate-client'
import { generateCommunicationSupportPack } from '@/lib/orb/communicate/orb-communicate-support-pack-generator'
import type {
  CommunicateMode,
  CommunicationSupportPackOutput
} from '@/lib/orb/communicate/orb-communicate-types'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'

export const ORB_COMMUNICATE_EXAMPLE_PROMPTS = [
  'Contact has changed',
  'New staff member',
  'Hospital appointment',
  'Bedtime worries',
  'Help someone say how they feel',
  'Create a visual routine'
] as const

export function OrbCommunicateCreateFlow({
  onPackCreated,
  onSelectAdvanced
}: {
  onPackCreated: (pack: CommunicationSupportPackOutput) => void
  onSelectAdvanced: (mode: Exclude<CommunicateMode, 'hub' | 'support_pack'>) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [guide, setGuide] = useState<CommunicateGuideSettings>(DEFAULT_COMMUNICATE_GUIDE_SETTINGS)
  const [profileNotice, setProfileNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!guide.useMyVoiceProfile) {
      setProfileNotice(null)
      return
    }
    const profile = loadMyVoiceProfileLocal()
    const hasContent = Boolean(
      profile?.howICommunicate.trim() ||
        profile?.wordsSignsOrSymbolsIUse.trim() ||
        profile?.whatHelpsMeProcessInformation.trim()
    )
    setProfileNotice(
      hasContent
        ? null
        : 'No My Voice Profile found yet. You can still create this support pack and add profile details later.'
    )
  }, [guide.useMyVoiceProfile])

  function applyExample(example: string) {
    setPrompt(example)
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      const profile = guide.useMyVoiceProfile ? loadMyVoiceProfileLocal() : null
      const pack = generateCommunicationSupportPack({
        prompt: trimmed,
        useMyVoiceProfile: guide.useMyVoiceProfile,
        myVoiceProfile: profile,
        audience: guide.audience,
        sensitivity: guide.sensitivity,
        outputPreference: guide.outputPreference,
        includeVisuals: guide.includeVisuals,
        includeRecordingPrompts: guide.includeRecordingPrompts
      })
      onPackCreated(pack)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="orb-communicate-create space-y-6" data-orb-communicate-create-flow>
      <div className="orb-communicate-create__hero text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <GlassOrbMark size="sm" pulse aria-hidden />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--orb-res-navy)] sm:text-2xl">
          ORB Communicate
        </h2>
        <p className="mt-2 text-base font-medium text-[var(--orb-res-workspace-text)]">
          What do you want to do today?
        </p>
        <p className="mt-1 text-sm text-[var(--orb-res-workspace-muted)]">
          Describe what you need to explain, support or create.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleCreate}>
        <label className="sr-only" htmlFor="orb-communicate-prompt">
          Describe what you need
        </label>
        <textarea
          id="orb-communicate-prompt"
          className="orb-communicate-prompt min-h-[8.5rem] w-full resize-y"
          placeholder="Describe what you need to explain, support or create…"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          data-orb-communicate-prompt-input
        />

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--orb-res-workspace-muted)]">
            Examples
          </p>
          <div className="flex flex-wrap gap-2" data-orb-communicate-example-chips>
            {ORB_COMMUNICATE_EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                className="orb-communicate-example-chip"
                onClick={() => applyExample(example)}
                data-orb-communicate-example={example}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <OrbCommunicateGuidePanel settings={guide} onChange={setGuide} />

        {profileNotice ? (
          <p className="text-sm text-[var(--orb-res-workspace-muted)]" data-orb-communicate-profile-notice>
            {profileNotice}
          </p>
        ) : null}

        <button
          type="submit"
          className="orb-communicate-create-btn w-full"
          disabled={!prompt.trim() || creating}
          data-orb-communicate-create-support
        >
          {creating ? 'Creating support…' : 'Create support'}
        </button>
      </form>

      <p
        className="text-center text-xs leading-relaxed text-[var(--orb-res-workspace-muted)]"
        data-orb-communicate-compact-safety
      >
        {ORB_COMMUNICATE_COMPACT_SAFETY}
      </p>

      <OrbCommunicateAdvancedTools cards={ORB_COMMUNICATE_HUB_CARDS} onSelect={onSelectAdvanced} />
    </div>
  )
}
