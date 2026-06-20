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
import { OrbCommunicateSymbolPlaceholder } from '@/components/orb-communicate/orb-communicate-shared'

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

export const ORB_COMMUNICATE_CREATOR_HEADLINE =
  'Describe what the person needs to understand, express or prepare for. ORB will create an adult-reviewed communication support pack.'

export const ORB_COMMUNICATE_PROMPT_PLACEHOLDER =
  'What do you need to explain, support or create?'

export const ORB_COMMUNICATE_PACK_PREVIEW =
  'Describe the communication need. ORB creates an adult-reviewed support pack with consistent accessible visuals that can be personalised around the way each person communicates.'

const ORB_COMMUNICATE_PREVIEW_SECTIONS = [
  {
    title: 'Easy-read explanation preview',
    body: 'Short sentences, clear sequence and a calm explanation of what is happening.'
  },
  {
    title: 'Visual support cards preview',
    body: 'Original generic cards for people, places, feelings and next steps.'
  },
  {
    title: 'Social story preview',
    body: 'Respectful first-person structure that can be personalised before sharing.'
  },
  {
    title: 'Staff guidance preview',
    body: 'How adults can introduce, check understanding and avoid assumptions.'
  },
  {
    title: 'Recording prompts preview',
    body: 'What the person expressed, what helped, adult response and follow-up.'
  }
] as const

export const ORB_COMMUNICATE_PLACEHOLDER_VISUAL_CARDS = [
  'Now',
  'Next',
  'Choice',
  'Feeling',
  'Safe adult',
  'Break',
  'Later',
  'Finished'
] as const

export const ORB_COMMUNICATE_VISUAL_PREVIEW_COPY =
  'Consistent accessible visuals that can be personalised around the way each person communicates.'

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
    <div className="orb-communicate-create orb-communicate-station space-y-4" data-orb-communicate-create-flow data-orb-communicate-station-layout>
      <header className="orb-communicate-station__hero flex gap-4" data-orb-communicate-station-hero>
        <div className="shrink-0 pt-1">
          <GlassOrbMark size="sm" pulse aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--orb-res-navy)] sm:text-2xl">
            ORB Communicate
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--orb-res-workspace-text)]" data-orb-communicate-subtitle>
            Create accessible explanations, visual supports and social stories so people can understand, express
            themselves and be heard before the record is written.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--orb-res-workspace-muted)]" data-orb-communicate-supporting-line>
            {ORB_COMMUNICATE_CREATOR_HEADLINE}
          </p>
        </div>
      </header>

      <div className="orb-communicate-creator-grid grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.75fr)]" data-orb-communicate-creator-grid>
      <form className="orb-communicate-create__form orb-station-workspace space-y-3" onSubmit={handleCreate} data-orb-communicate-create-block>
        <p className="text-sm font-medium text-[var(--orb-res-navy)]" data-orb-communicate-creator-prompt>
          {ORB_COMMUNICATE_PROMPT_PLACEHOLDER}
        </p>
        <label className="sr-only" htmlFor="orb-communicate-prompt">
          Describe what you need
        </label>
        <textarea
          id="orb-communicate-prompt"
          className="orb-communicate-prompt min-h-[9rem] w-full resize-y text-base"
          placeholder={ORB_COMMUNICATE_PROMPT_PLACEHOLDER}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          data-orb-communicate-prompt-input
          data-orb-communicate-natural-language-input
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

        <OrbCommunicateGuidePanel settings={guide} onChange={setGuide} className="orb-communicate-guide-secondary" />

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

      <aside className="orb-communicate-support-preview" data-orb-communicate-support-pack-preview data-orb-communicate-original-placeholder-visuals>
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-res-workspace-muted)]">
            Support-pack preview
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--orb-res-navy)]">
            Adult-reviewed pack structure
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--orb-res-workspace-muted)]">
            Uses original placeholder visual cards only. Visuals support communication and do not imply universal understanding.
          </p>
        </header>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-orb-communicate-placeholder-visual-cards data-orb-communicate-visual-preview>
          {ORB_COMMUNICATE_PLACEHOLDER_VISUAL_CARDS.map((label) => (
            <div key={label} className="orb-communicate-preview-symbol" data-orb-communicate-placeholder-card={label}>
              <span aria-hidden />
              <strong>{label}</strong>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2" data-orb-communicate-preview-sections>
          {ORB_COMMUNICATE_PREVIEW_SECTIONS.map((section) => (
            <article key={section.title} className="orb-communicate-preview-section">
              <h4>{section.title}</h4>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </aside>
      </div>

      <div className="orb-communicate-outputs space-y-2" data-orb-communicate-outputs>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-res-workspace-muted)]">
          What ORB can create
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
