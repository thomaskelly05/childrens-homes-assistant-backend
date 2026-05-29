'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import {
  CANONICAL_ADULT_PROFILE_ROLES,
  DEFAULT_ADULT_PROFILE,
  STANDALONE_PROFILE_BOUNDARY_NOTE,
  roleLabelFor,
  writeAdultProfile,
  type AdultProfile,
  type AdultProfileRole,
  type AdultProfileTone,
  type ConfidencePreference,
  type PreferredAnswerLength,
  type ReasoningDepth,
  type SafeguardingIntensity,
  type WritingStyle
} from '@/lib/orb/adult-profile-store'
import { RESIDENTIAL_AGENTS, type ResidentialAgentId } from '@/lib/orb/residential-agents'

export function OrbAdultProfileDrawer({
  open,
  profile,
  cognitionModeLabel,
  onClose,
  onSave
}: {
  open: boolean
  profile: AdultProfile
  cognitionModeLabel?: string
  onClose: () => void
  onSave: (next: AdultProfile) => void
}) {
  const [draft, setDraft] = useState(profile)

  useEffect(() => {
    if (open) setDraft(profile)
  }, [open, profile])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  function patch<K extends keyof AdultProfile>(key: K, value: AdultProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function save() {
    const next: AdultProfile = {
      ...draft,
      roleLabel: draft.roleLabel || roleLabelFor(draft.role),
      updatedAt: Date.now()
    }
    writeAdultProfile(next)
    onSave(next)
    onClose()
  }

  return (
    <div className="orb-panel-overlay fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Adult profile">
      <div className="orb-panel-drawer flex h-full w-full max-w-md flex-col border-l border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--orb-line)] px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--orb-muted)]">Your profile</p>
            <h2 className="text-lg font-semibold text-[var(--orb-foreground)]">Cognition & preferences</h2>
            {cognitionModeLabel ? (
              <p className="mt-1 text-xs text-[var(--orb-accent)]" data-orb-profile-cognition-mode>
                Active agent · {cognitionModeLabel}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]" aria-label="Close profile">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="orb-panel-body flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <p
            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900"
            data-orb-profile-boundary-note
          >
            {STANDALONE_PROFILE_BOUNDARY_NOTE}
          </p>
          <Field label="Your name">
            <input
              value={draft.name}
              onChange={(e) => patch('name', e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="orb-profile-input w-full"
            />
          </Field>
          <Field label="Role">
            <select
              value={draft.role}
              onChange={(e) => {
                const role = e.target.value as AdultProfileRole
                patch('role', role)
                patch('roleLabel', roleLabelFor(role))
              }}
              className="orb-profile-input w-full"
            >
              {CANONICAL_ADULT_PROFILE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabelFor(role)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Current setting">
            <input
              value={draft.homeName}
              onChange={(e) => patch('homeName', e.target.value)}
              placeholder="e.g. Oak House"
              className="orb-profile-input w-full"
            />
          </Field>
          <Field label="Type of service">
            <input
              value={draft.serviceType ?? ''}
              onChange={(e) => patch('serviceType', e.target.value)}
              placeholder="e.g. Children's residential home"
              className="orb-profile-input w-full"
              data-orb-profile-service-type
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Team">
              <input value={draft.team ?? ''} onChange={(e) => patch('team', e.target.value)} className="orb-profile-input w-full" />
            </Field>
            <Field label="Shift role">
              <input value={draft.shiftRole ?? ''} onChange={(e) => patch('shiftRole', e.target.value)} className="orb-profile-input w-full" />
            </Field>
          </div>
          <Field label="Preferred agent">
            <select
              value={draft.preferredAgent}
              onChange={(e) => patch('preferredAgent', e.target.value as ResidentialAgentId)}
              className="orb-profile-input w-full"
            >
              {RESIDENTIAL_AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preferred response style">
            <ToneSelect value={draft.preferredTone} onChange={(v) => patch('preferredTone', v)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Answer length">
              <select
                value={draft.preferredAnswerLength}
                onChange={(e) => patch('preferredAnswerLength', e.target.value as PreferredAnswerLength)}
                className="orb-profile-input w-full"
                data-orb-profile-answer-length
              >
                <option value="brief">Brief</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </Field>
            <Field label="Confidence framing">
              <select
                value={draft.confidencePreference}
                onChange={(e) => patch('confidencePreference', e.target.value as ConfidencePreference)}
                className="orb-profile-input w-full"
                data-orb-profile-confidence
              >
                <option value="cautious">Cautious</option>
                <option value="balanced">Balanced</option>
                <option value="direct">Direct</option>
              </select>
            </Field>
          </div>
          <Field label="Preferred terminology">
            <input
              value={draft.preferredTerminology ?? ''}
              onChange={(e) => patch('preferredTerminology', e.target.value)}
              placeholder="e.g. young person, not client"
              className="orb-profile-input w-full"
              data-orb-profile-terminology
            />
          </Field>
          <section className="rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-4" data-orb-profile-default-lenses>
            <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Default lenses</h3>
            <p className="mt-1 text-xs text-[var(--orb-muted)]">ORB weaves these in when relevant — not live OS data.</p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={draft.defaultLenses.safeguarding}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      defaultLenses: { ...c.defaultLenses, safeguarding: e.target.checked }
                    }))
                  }
                  data-orb-lens-safeguarding
                />
                Include safeguarding lens by default
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={draft.defaultLenses.ofsted}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      defaultLenses: { ...c.defaultLenses, ofsted: e.target.checked }
                    }))
                  }
                  data-orb-lens-ofsted
                />
                Include Ofsted lens by default
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={draft.defaultLenses.recording}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      defaultLenses: { ...c.defaultLenses, recording: e.target.checked }
                    }))
                  }
                  data-orb-lens-recording
                />
                Include recording prompts by default
              </label>
            </div>
          </section>
          <Field label="Safeguarding intensity">
            <select
              value={draft.safeguardingIntensity}
              onChange={(e) => patch('safeguardingIntensity', e.target.value as SafeguardingIntensity)}
              className="orb-profile-input w-full"
            >
              <option value="standard">Standard</option>
              <option value="heightened">Heightened awareness</option>
              <option value="maximum">Maximum (high-risk contexts)</option>
            </select>
          </Field>
          <Field label="Writing style">
            <select
              value={draft.writingStyle}
              onChange={(e) => patch('writingStyle', e.target.value as WritingStyle)}
              className="orb-profile-input w-full"
            >
              <option value="concise">Concise</option>
              <option value="structured">Structured</option>
              <option value="narrative">Narrative</option>
            </select>
          </Field>
          <Field label="Therapeutic preferences">
            <textarea
              value={draft.therapeuticPreferences}
              onChange={(e) => patch('therapeuticPreferences', e.target.value)}
              rows={2}
              className="orb-profile-input w-full resize-none"
            />
          </Field>
          <section className="rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-4" data-orb-personalisation>
            <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Personalisation</h3>
            <div className="mt-3 space-y-3">
              <Field label="How would you like ORB to respond?">
                <textarea
                  value={draft.customInstructions ?? ''}
                  onChange={(e) => patch('customInstructions', e.target.value)}
                  rows={3}
                  placeholder="e.g. Always structure safeguarding answers with RM and RI lenses."
                  className="orb-profile-input w-full resize-none"
                  data-orb-custom-instructions
                />
              </Field>
              <Field label="What should ORB know about your role?">
                <textarea
                  value={draft.roleContextNotes ?? ''}
                  onChange={(e) => patch('roleContextNotes', e.target.value)}
                  rows={2}
                  className="orb-profile-input w-full resize-none"
                />
              </Field>
              <Field label="Supervision goals">
                <input
                  value={draft.supervisionGoals ?? ''}
                  onChange={(e) => patch('supervisionGoals', e.target.value)}
                  className="orb-profile-input w-full"
                />
              </Field>
              <Field label="Current focus areas">
                <input
                  value={draft.currentFocusAreas ?? ''}
                  onChange={(e) => patch('currentFocusAreas', e.target.value)}
                  className="orb-profile-input w-full"
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={draft.voicePreference?.prefersSpokenResponses ?? false}
                  onChange={(e) =>
                    patch('voicePreference', {
                      ...DEFAULT_ADULT_PROFILE.voicePreference!,
                      ...draft.voicePreference,
                      prefersSpokenResponses: e.target.checked,
                      britishFemale: draft.voicePreference?.britishFemale ?? true
                    })
                  }
                  data-orb-prefers-spoken
                />
                Prefer spoken responses (auto-speak when enabled in Voice settings)
              </label>
            </div>
          </section>
          <section className="rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-4" data-orb-cognition-preferences>
            <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Cognition preferences</h3>
            <div className="mt-3 space-y-3">
              <Field label="Reasoning depth">
                <select
                  value={draft.cognitionPreferences.reasoningDepth}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      cognitionPreferences: {
                        ...c.cognitionPreferences,
                        reasoningDepth: e.target.value as ReasoningDepth
                      }
                    }))
                  }
                  className="orb-profile-input w-full"
                >
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="deep">Deep institutional reasoning</option>
                </select>
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={draft.cognitionPreferences.chronologyAwareness}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      cognitionPreferences: { ...c.cognitionPreferences, chronologyAwareness: e.target.checked }
                    }))
                  }
                />
                Longitudinal / chronology awareness
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--orb-muted)]">
                <input
                  type="checkbox"
                  checked={draft.cognitionPreferences.institutionalDepth}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      cognitionPreferences: { ...c.cognitionPreferences, institutionalDepth: e.target.checked }
                    }))
                  }
                />
                Institutional depth frame
              </label>
            </div>
          </section>
        </div>

        <footer className="flex gap-2 border-t border-[var(--orb-line)] px-5 py-4">
          <button
            type="button"
            onClick={() => setDraft({ ...DEFAULT_ADULT_PROFILE, name: draft.name })}
            className="flex-1 rounded-xl border border-[var(--orb-line)] py-2.5 text-sm text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
          >
            Reset defaults
          </button>
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-xl bg-[var(--orb-accent)] py-2.5 text-sm font-semibold text-[var(--orb-on-accent)]"
            data-orb-profile-save
          >
            Save profile
          </button>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--orb-muted)]">{label}</span>
      {children}
    </label>
  )
}

function ToneSelect({ value, onChange }: { value: AdultProfileTone; onChange: (v: AdultProfileTone) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as AdultProfileTone)} className="orb-profile-input w-full">
      <option value="calm">Calm</option>
      <option value="direct">Direct</option>
      <option value="reflective">Reflective</option>
      <option value="coaching">Coaching</option>
    </select>
  )
}
