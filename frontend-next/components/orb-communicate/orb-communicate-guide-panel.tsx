'use client'

import type {
  CommunicationAudience,
  CommunicationOutputPreference,
  CommunicationSupportPackSensitivity
} from '@/lib/orb/communicate/orb-communicate-types'

export type CommunicateGuideSettings = {
  useMyVoiceProfile: boolean
  audience: CommunicationAudience
  sensitivity: CommunicationSupportPackSensitivity
  outputPreference: CommunicationOutputPreference
  includeVisuals: boolean
  includeRecordingPrompts: boolean
}

export const DEFAULT_COMMUNICATE_GUIDE_SETTINGS: CommunicateGuideSettings = {
  useMyVoiceProfile: true,
  audience: 'young_person',
  sensitivity: 'routine',
  outputPreference: 'let_orb_choose',
  includeVisuals: true,
  includeRecordingPrompts: true
}

export function OrbCommunicateGuidePanel({
  settings,
  onChange,
  className = ''
}: {
  settings: CommunicateGuideSettings
  onChange: (next: CommunicateGuideSettings) => void
  className?: string
}) {
  function patch<K extends keyof CommunicateGuideSettings>(key: K, value: CommunicateGuideSettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <details
      className={`orb-communicate-guide rounded-xl border border-[var(--orb-res-workspace-border)] bg-[var(--orb-res-workspace-surface)] ${className}`}
      data-orb-communicate-guide-panel
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--orb-res-navy)] [&::-webkit-details-marker]:hidden">
        Guide ORB
      </summary>
      <div className="space-y-3 border-t border-[var(--orb-res-workspace-border)] px-4 py-3">
        <label className="flex items-center justify-between gap-3 text-sm text-[var(--orb-res-workspace-text)]">
          <span>Use My Voice Profile</span>
          <input
            type="checkbox"
            checked={settings.useMyVoiceProfile}
            onChange={(event) => patch('useMyVoiceProfile', event.target.checked)}
            data-orb-communicate-guide-voice-profile
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--orb-res-workspace-text)]">Audience</span>
          <select
            className="orb-communicate-field w-full"
            value={settings.audience}
            onChange={(event) => patch('audience', event.target.value as CommunicationAudience)}
            data-orb-communicate-guide-audience
          >
            <option value="child">Child</option>
            <option value="young_person">Young person</option>
            <option value="adult">Adult</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--orb-res-workspace-text)]">Sensitivity</span>
          <select
            className="orb-communicate-field w-full"
            value={settings.sensitivity}
            onChange={(event) =>
              patch('sensitivity', event.target.value as CommunicationSupportPackSensitivity)
            }
            data-orb-communicate-guide-sensitivity
          >
            <option value="routine">Routine</option>
            <option value="emotional">Emotional</option>
            <option value="health">Health</option>
            <option value="safeguarding_sensitive">Safeguarding-sensitive</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-[var(--orb-res-workspace-text)]">Output preference</span>
          <select
            className="orb-communicate-field w-full"
            value={settings.outputPreference}
            onChange={(event) =>
              patch('outputPreference', event.target.value as CommunicationOutputPreference)
            }
            data-orb-communicate-guide-output-preference
          >
            <option value="let_orb_choose">Let ORB choose</option>
            <option value="easy_read_only">Easy-read only</option>
            <option value="visual_support">Visual support</option>
            <option value="social_story">Social story</option>
            <option value="full_support_pack">Full support pack</option>
          </select>
        </label>

        <label className="flex items-center justify-between gap-3 text-sm text-[var(--orb-res-workspace-text)]">
          <span>Include visuals</span>
          <input
            type="checkbox"
            checked={settings.includeVisuals}
            onChange={(event) => patch('includeVisuals', event.target.checked)}
            data-orb-communicate-guide-include-visuals
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm text-[var(--orb-res-workspace-text)]">
          <span>Include recording prompts</span>
          <input
            type="checkbox"
            checked={settings.includeRecordingPrompts}
            onChange={(event) => patch('includeRecordingPrompts', event.target.checked)}
            data-orb-communicate-guide-include-recording
          />
        </label>
      </div>
    </details>
  )
}
