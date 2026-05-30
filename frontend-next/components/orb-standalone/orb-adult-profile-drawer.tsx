'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, X } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
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

function formatAccessStateLabel(accessState: string | null): string | null {
  if (!accessState) return null
  return accessState.replace(/_/g, ' ')
}

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
  const router = useRouter()
  const auth = useAuth()
  const account = useOrbAccountState()
  const [draft, setDraft] = useState(profile)

  const accountStatusLabel = account.isLoading
    ? 'Checking account…'
    : account.isSignedIn
      ? 'Signed in'
      : 'Signed out'

  const accountDetail = account.isLoading
    ? 'Checking your ORB Residential account…'
    : account.isSignedIn
      ? [account.userName || account.userEmail, account.planName, account.accessState ? formatAccessStateLabel(account.accessState) : null]
          .filter(Boolean)
          .join(' · ')
      : 'Not signed in'

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

  function goToSignIn() {
    onClose()
    router.push(account.signInUrl)
  }

  function goToAccess() {
    onClose()
    router.push(account.accessUrl)
  }

  async function handleLogout() {
    onClose()
    await auth.logout()
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

          <section className="rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-4" data-orb-account-controls>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">ORB Residential account</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-account-email>
                  {accountDetail}
                </p>
                {account.isSignedIn && account.accessFetchStatus && account.accessFetchStatus >= 400 ? (
                  <p className="mt-1 text-[11px] text-amber-700" data-orb-account-access-problem>
                    {account.accessFetchStatus === 503
                      ? 'ORB Residential access is temporarily unavailable. Try again shortly.'
                      : 'ORB Residential access could not be confirmed. Open Manage access to review your plan.'}
                  </p>
                ) : null}
                {account.isSignedIn && account.safetyAccepted !== null ? (
                  <p className="mt-1 text-[11px] text-[var(--orb-muted)]" data-orb-account-safety-state>
                    Safety accepted: {account.safetyAccepted ? 'yes' : 'no'}
                    {account.adminBypass ? ' · admin bypass' : ''}
                  </p>
                ) : null}
                {account.isSignedIn && account.safetyAccepted === false ? (
                  <p className="mt-1 text-[11px] text-amber-700" data-orb-account-safety-warning>
                    Safety statements need accepting before ORB Residential can answer.
                  </p>
                ) : null}
                {account.isSignedIn && account.hasConfirmedAccess && account.subscriptionStatus ? (
                  <p className="mt-1 text-[11px] text-[var(--orb-muted)]" data-orb-account-subscription>
                    Subscription: {account.subscriptionStatus.replace(/_/g, ' ')}
                    {account.trialEndsAt
                      ? ` · trial ends ${new Date(account.trialEndsAt).toLocaleDateString('en-GB')}`
                      : ''}
                  </p>
                ) : null}
              </div>
              <span
                className="rounded-full border border-[var(--orb-line)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--orb-muted)]"
                data-orb-account-status-badge
              >
                {accountStatusLabel}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {!account.isSignedIn && !account.isLoading ? (
                <button
                  type="button"
                  onClick={goToSignIn}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--orb-accent)] px-3 py-2 text-xs font-semibold text-[var(--orb-on-accent)]"
                  data-orb-account-sign-in
                >
                  <LogIn className="h-4 w-4" />
                  Sign in to ORB Residential
                </button>
              ) : null}
              {account.isSignedIn ? (
                <>
                  <button
                    type="button"
                    onClick={goToAccess}
                    className="rounded-xl border border-[var(--orb-line)] px-3 py-2 text-xs font-semibold text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                    data-orb-account-access
                  >
                    Manage ORB Residential access
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    data-orb-account-logout
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </>
              ) : null}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--orb-muted)]" data-orb-passkey-hint>
              {account.isSignedIn
                ? account.hasPasskeys
                  ? 'Face ID, Touch ID or passkey is set up on your account. Manage passkeys in Settings → Security.'
                  : 'Add Face ID, Touch ID or a passkey in Settings → Security for faster sign-in on this device.'
                : 'Face ID, Touch ID and passkeys are available from the ORB sign-in flow when supported by your device.'}
            </p>
            {!account.isSignedIn && !account.isLoading ? (
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--orb-muted)]">
                ORB Residential does not access IndiCare OS records.
              </p>
            ) : null}
          </section>

          {!account.isSignedIn && !account.isLoading ? (
            <p className="text-[11px] leading-relaxed text-[var(--orb-muted)]" data-orb-local-profile-note>
              Preferences below are saved on this device only until you sign in to ORB Residential.
            </p>
          ) : null}

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

function Field({ label, children }: { label: string; children: ReactNode }) {
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
