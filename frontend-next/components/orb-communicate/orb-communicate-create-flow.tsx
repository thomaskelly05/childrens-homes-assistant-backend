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
  'Explain that contact has changed',
  'Help explain a change of plan',
  'Create a bedtime visual routine',
  'Prepare for a hospital appointment',
  'Introduce a new staff member',
  'Support someone to say how they feel'
] as const

export const ORB_COMMUNICATE_OUTPUT_TYPES = [
  'Easy-read wording',
  'Visual support cards',
  'Social story sections',
  'Staff guidance',
  'Recording prompts',
  'Reflect-and-record starter'
] as const

export const ORB_COMMUNICATE_PACK_PREVIEW =
  'ORB can create an adult-reviewed support pack with easy-read wording, visual cards, staff guidance and recording prompts.'

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
    <div className="orb-communicate-create orb-communicate-station space-y-5" data-orb-communicate-create-flow data-orb-communicate-station-layout>
      <header className="orb-communicate-station__hero flex gap-4">
        <div className="shrink-0 pt-1">
          <GlassOrbMark size="sm" pulse aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--orb-res-navy)] sm:text-2xl">
            ORB Communicate
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--orb-res-workspace-text)]" data-orb-communicate-subtitle>
            ORB Communicate helps adults create accessible explanations, visual supports and social stories so people
            can understand, express themselves and be heard before the record is written.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--orb-res-workspace-muted)]" data-orb-communicate-supporting-line>
            Describe what you need to explain or support. ORB will shape an adult-reviewed communication support pack.
          </p>
        </div>
      </header>

      <div className="orb-communicate-outputs space-y-2" data-orb-communicate-outputs>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-res-workspace-muted)]">
          What you can create
        </p>
        <ul className="flex flex-wrap gap-2">
          {ORB_COMMUNICATE_OUTPUT_TYPES.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--orb-res-workspace-text)]"
              data-orb-communicate-output-type={item}
            >
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-[var(--orb-res-workspace-muted)]" data-orb-communicate-pack-preview>
          {ORB_COMMUNICATE_PACK_PREVIEW}
        </p>
      </div>

      <form className="orb-communicate-create__form space-y-4" onSubmit={handleCreate}>
        <label className="sr-only" htmlFor="orb-communicate-prompt">
          Describe what you need
        </label>
        <textarea
          id="orb-communicate-prompt"
          className="orb-communicate-prompt min-h-[9.5rem] w-full resize-y text-base"
          placeholder="Describe what you need to explain, support or create for adult review…"
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
          {creating ? 'Creating support…' : 'Create support pack'}
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
