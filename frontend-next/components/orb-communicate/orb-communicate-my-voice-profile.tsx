'use client'

import { useEffect, useState } from 'react'

import {
  OrbCommunicateField,
  OrbCommunicateSection,
  orbCommunicateInputClass,
  orbCommunicateSelectClass
} from '@/components/orb-communicate/orb-communicate-shared'
import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import {
  fetchMyVoiceProfile,
  saveMyVoiceProfile
} from '@/lib/orb/communicate/orb-communicate-client'
import { EMPTY_MY_VOICE_PROFILE } from '@/lib/orb/communicate/orb-communicate-generators'
import type { MyVoiceProfile } from '@/lib/orb/communicate/orb-communicate-types'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'

const PROFILE_FIELDS: Array<{
  key: keyof MyVoiceProfile
  label: string
  hint?: string
  multiline?: boolean
}> = [
  { key: 'howICommunicate', label: 'How I communicate', multiline: true },
  { key: 'howISayYes', label: 'How I say yes' },
  { key: 'howISayNo', label: 'How I say no' },
  { key: 'howIShowPain', label: 'How I show pain' },
  { key: 'howIShowAnxiety', label: 'How I show anxiety' },
  { key: 'wordsSignsOrSymbolsIUse', label: 'Words, signs or symbols I use', multiline: true },
  { key: 'whatIUnderstandWell', label: 'What I understand well', multiline: true },
  { key: 'whatIFindHardToUnderstand', label: 'What I find hard to understand', multiline: true },
  {
    key: 'whatHelpsMeProcessInformation',
    label: 'What helps me process information',
    multiline: true
  },
  {
    key: 'whatMakesCommunicationHarder',
    label: 'What makes communication harder',
    multiline: true
  },
  { key: 'sensoryNeeds', label: 'Sensory needs', multiline: true },
  { key: 'trustedAdults', label: 'Trusted adults', multiline: true },
  {
    key: 'thingsStaffShouldNotAssume',
    label: 'Things staff should not assume',
    multiline: true,
    hint: 'Record preferences and boundaries — not diagnoses.'
  },
  { key: 'recordingGuidance', label: 'Recording guidance', multiline: true }
]

export function OrbCommunicateMyVoiceProfileWorkflow({ onBack }: { onBack: () => void }) {
  const [profile, setProfile] = useState<MyVoiceProfile>(EMPTY_MY_VOICE_PROFILE)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchMyVoiceProfile().then((stored) => {
      if (!active) return
      if (stored) setProfile(stored)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  function update<K extends keyof MyVoiceProfile>(key: K, value: MyVoiceProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }))
    setSavedMessage(null)
  }

  async function handleSave() {
    const { profile: saved, savedLocally } = await saveMyVoiceProfile(profile)
    setProfile(saved)
    setSavedMessage(
      savedLocally
        ? 'Profile saved on this device — ready for team review.'
        : 'Profile kept for this session — storage is unavailable on this device.'
    )
  }

  function formatPreview(): string {
    return PROFILE_FIELDS.map((field) => {
      const value = profile[field.key]
      if (field.key === 'preferredCommunicationFormat') return null
      if (!value || typeof value !== 'string' || !value.trim()) return null
      return `${field.label}\n${value.trim()}`
    })
      .filter(Boolean)
      .concat([
        `Preferred communication format\n${formatLabel(profile.preferredCommunicationFormat)}${
          profile.preferredCommunicationFormat === 'other' && profile.preferredCommunicationFormatOther
            ? `: ${profile.preferredCommunicationFormatOther}`
            : ''
        }`
      ])
      .join('\n\n')
  }

  function formatLabel(format: MyVoiceProfile['preferredCommunicationFormat']): string {
    const labels: Record<MyVoiceProfile['preferredCommunicationFormat'], string> = {
      symbols: 'Symbols',
      photos: 'Photos',
      objects: 'Objects',
      audio: 'Audio',
      short_text: 'Short text',
      other: 'Other'
    }
    return labels[format]
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading profile…</p>
  }

  if (view === 'preview') {
    return (
      <div className="space-y-4" data-orb-communicate-workflow="my_voice_profile">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('edit')}
            className="text-sm text-sky-400/90 hover:text-sky-300"
          >
            ← Edit profile
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            Back to Communicate
          </button>
        </div>
        <OrbGlassCard className="space-y-5 border-white/10 bg-white/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">My Voice Profile — preview</h3>
            <button
              type="button"
              onClick={() => void copyTextToClipboard(formatPreview())}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/5"
            >
              Copy
            </button>
          </div>
          {PROFILE_FIELDS.map((field) => {
            const value = profile[field.key]
            if (typeof value !== 'string' || !value.trim()) return null
            return (
              <OrbCommunicateSection key={field.key} title={field.label}>
                {value}
              </OrbCommunicateSection>
            )
          })}
          <OrbCommunicateSection title="Preferred communication format">
            {formatLabel(profile.preferredCommunicationFormat)}
            {profile.preferredCommunicationFormat === 'other' &&
            profile.preferredCommunicationFormatOther ? (
              <span> — {profile.preferredCommunicationFormatOther}</span>
            ) : null}
          </OrbCommunicateSection>
          {profile.updatedAt ? (
            <p className="text-xs text-slate-500">Last updated: {new Date(profile.updatedAt).toLocaleString('en-GB')}</p>
          ) : null}
        </OrbGlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-5" data-orb-communicate-workflow="my_voice_profile">
      <button type="button" onClick={onBack} className="text-sm text-sky-400/90 hover:text-sky-300">
        ← Back to Communicate
      </button>
      <OrbGlassCard className="space-y-4 border-white/10 bg-white/[0.04]">
        {PROFILE_FIELDS.map((field) => (
          <OrbCommunicateField
            key={field.key}
            id={`profile-${field.key}`}
            label={field.label}
            hint={field.hint}
          >
            {field.multiline ? (
              <textarea
                id={`profile-${field.key}`}
                className={`${orbCommunicateInputClass} min-h-[72px]`}
                value={(profile[field.key] as string) ?? ''}
                onChange={(e) => update(field.key, e.target.value as MyVoiceProfile[typeof field.key])}
              />
            ) : (
              <input
                id={`profile-${field.key}`}
                className={orbCommunicateInputClass}
                value={(profile[field.key] as string) ?? ''}
                onChange={(e) => update(field.key, e.target.value as MyVoiceProfile[typeof field.key])}
              />
            )}
          </OrbCommunicateField>
        ))}
        <OrbCommunicateField id="profile-format" label="Preferred communication format">
          <select
            id="profile-format"
            className={orbCommunicateSelectClass}
            value={profile.preferredCommunicationFormat}
            onChange={(e) =>
              update(
                'preferredCommunicationFormat',
                e.target.value as MyVoiceProfile['preferredCommunicationFormat']
              )
            }
          >
            <option value="symbols">Symbols</option>
            <option value="photos">Photos</option>
            <option value="objects">Objects</option>
            <option value="audio">Audio</option>
            <option value="short_text">Short text</option>
            <option value="other">Other</option>
          </select>
        </OrbCommunicateField>
        {profile.preferredCommunicationFormat === 'other' ? (
          <OrbCommunicateField id="profile-format-other" label="Other format (please describe)">
            <input
              id="profile-format-other"
              className={orbCommunicateInputClass}
              value={profile.preferredCommunicationFormatOther ?? ''}
              onChange={(e) => update('preferredCommunicationFormatOther', e.target.value)}
            />
          </OrbCommunicateField>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Save profile
          </button>
          <button
            type="button"
            onClick={() => setView('preview')}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5"
          >
            Preview
          </button>
        </div>
        {savedMessage ? <p className="text-sm text-emerald-300/90">{savedMessage}</p> : null}
      </OrbGlassCard>
    </div>
  )
}
