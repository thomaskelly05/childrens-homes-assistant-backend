'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

import { OrbPrivacyInputWarning } from '@/components/orb/privacy/orb-privacy-input-warning'
import { submitOrbPilotFeedback } from '@/lib/orb/pilot/orb-pilot-client'
import { sanitiseOrbPilotFeedbackField } from '@/lib/orb/pilot/orb-pilot-sanitize'
import type { OrbPilotFeatureUsed } from '@/lib/orb/pilot/orb-pilot-types'

const FEATURE_OPTIONS: Array<{ value: OrbPilotFeatureUsed; label: string }> = [
  { value: 'chat', label: 'Chat' },
  { value: 'dictate', label: 'Dictate' },
  { value: 'write', label: 'Write' },
  { value: 'voice', label: 'Voice' },
  { value: 'export', label: 'Export' },
  { value: 'report', label: 'Report' },
  { value: 'other', label: 'Other' }
]

function RatingSelect({
  id,
  label,
  value,
  onChange
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="text-xs font-semibold text-[var(--orb-foreground)]">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] px-3 py-2 text-sm"
      >
        <option value="">Not sure / skip</option>
        <option value="1">1 — Not at all</option>
        <option value="2">2</option>
        <option value="3">3 — Somewhat</option>
        <option value="4">4</option>
        <option value="5">5 — Very much</option>
      </select>
    </label>
  )
}

export function OrbPilotFeedbackForm({ authenticated }: { authenticated: boolean }) {
  const [featureUsed, setFeatureUsed] = useState<OrbPilotFeatureUsed>('chat')
  const [taskType, setTaskType] = useState('')
  const [timeSaved, setTimeSaved] = useState('')
  const [timeSavedMinutes, setTimeSavedMinutes] = useState('')
  const [recordQualityRating, setRecordQualityRating] = useState('')
  const [childVoiceRating, setChildVoiceRating] = useState('')
  const [whatHelpedTheChild, setWhatHelpedTheChild] = useState('')
  const [therapeuticLanguageRating, setTherapeuticLanguageRating] = useState('')
  const [staffConfidenceRating, setStaffConfidenceRating] = useState('')
  const [safeguardingPromptRating, setSafeguardingPromptRating] = useState('')
  const [wouldUseAgain, setWouldUseAgain] = useState('')
  const [whatWorkedWell, setWhatWorkedWell] = useState('')
  const [whatFeltUnsafeOrUnhelpful, setWhatFeltUnsafeOrUnhelpful] = useState('')
  const [improvementSuggestion, setImprovementSuggestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const freeTextCombined = [whatHelpedTheChild, whatWorkedWell, whatFeltUnsafeOrUnhelpful, improvementSuggestion].join(
    ' '
  )

  function parseRating(value: string): number | undefined {
    if (!value) return undefined
    const parsed = Number(value)
    return parsed >= 1 && parsed <= 5 ? parsed : undefined
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const fieldsToCheck = [
      { value: taskType, label: 'Task type' },
      { value: whatHelpedTheChild, label: 'What helped the child' },
      { value: whatWorkedWell, label: 'What worked well' },
      { value: whatFeltUnsafeOrUnhelpful, label: 'Safety concern' },
      { value: improvementSuggestion, label: 'Improvement suggestion' }
    ]

    for (const field of fieldsToCheck) {
      if (!field.value.trim()) continue
      const result = sanitiseOrbPilotFeedbackField(field.value, { fieldLabel: field.label })
      if (result.rejected) {
        setError(result.reason ?? 'Please revise your feedback.')
        return
      }
    }

    if (!authenticated) {
      setError('Sign in to submit pilot feedback linked to your account.')
      return
    }

    setBusy(true)
    try {
      await submitOrbPilotFeedback({
        featureUsed,
        taskType: taskType.trim() || undefined,
        timeSavedMinutes:
          timeSaved === 'yes' && timeSavedMinutes ? Number(timeSavedMinutes) : timeSaved === 'no' ? 0 : undefined,
        recordQualityRating: parseRating(recordQualityRating),
        childVoiceRating: parseRating(childVoiceRating),
        therapeuticLanguageRating: parseRating(therapeuticLanguageRating),
        safeguardingPromptRating: parseRating(safeguardingPromptRating),
        staffConfidenceRating: parseRating(staffConfidenceRating),
        wouldUseAgain: wouldUseAgain === 'yes' ? true : wouldUseAgain === 'no' ? false : undefined,
        whatHelpedTheChild: whatHelpedTheChild.trim() || undefined,
        whatWorkedWell: whatWorkedWell.trim() || undefined,
        whatFeltUnsafeOrUnhelpful: whatFeltUnsafeOrUnhelpful.trim() || undefined,
        improvementSuggestion: improvementSuggestion.trim() || undefined
      })
      setSuccess('Thank you. Your feedback helps us improve ORB safely for children’s homes.')
      setTaskType('')
      setTimeSaved('')
      setTimeSavedMinutes('')
      setRecordQualityRating('')
      setChildVoiceRating('')
      setWhatHelpedTheChild('')
      setTherapeuticLanguageRating('')
      setStaffConfidenceRating('')
      setSafeguardingPromptRating('')
      setWouldUseAgain('')
      setWhatWorkedWell('')
      setWhatFeltUnsafeOrUnhelpful('')
      setImprovementSuggestion('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit feedback.')
    } finally {
      setBusy(false)
    }
  }

  if (!authenticated) {
    return (
      <div
        className="rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-6"
        data-orb-pilot-feedback-auth-required
      >
        <p className="text-sm leading-6 text-[var(--orb-muted)]">
          Sign in to submit closed-pilot feedback. Do not include child names, staff names or safeguarding narratives.
        </p>
        <Link href="/orb" className="mt-4 inline-block text-sm font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
          Return to ORB to sign in
        </Link>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-6"
      data-orb-pilot-feedback-form
    >
      <div
        className="rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100"
        data-orb-pilot-feedback-warning
      >
        Please do not include child names, staff names, full records or detailed safeguarding narratives in feedback.
      </div>

      <label className="block text-sm" htmlFor="orb-pilot-task-type">
        <span className="text-xs font-semibold">What did you use ORB for today?</span>
        <input
          id="orb-pilot-task-type"
          value={taskType}
          onChange={(event) => setTaskType(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-page-bg)] px-3 py-2 text-sm"
          placeholder="e.g. daily record, incident reflection, handover note"
          data-orb-pilot-field-task-type
        />
      </label>

      <label className="block text-sm" htmlFor="orb-pilot-feature-used">
        <span className="text-xs font-semibold">Which part did you use?</span>
        <select
          id="orb-pilot-feature-used"
          value={featureUsed}
          onChange={(event) => setFeatureUsed(event.target.value as OrbPilotFeatureUsed)}
          className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-page-bg)] px-3 py-2 text-sm"
          data-orb-pilot-field-feature-used
        >
          {FEATURE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold">Did ORB save you time?</legend>
        <label className="mr-4 text-sm">
          <input type="radio" name="time-saved" value="yes" checked={timeSaved === 'yes'} onChange={() => setTimeSaved('yes')} /> Yes
        </label>
        <label className="text-sm">
          <input type="radio" name="time-saved" value="no" checked={timeSaved === 'no'} onChange={() => setTimeSaved('no')} /> No
        </label>
      </fieldset>

      {timeSaved === 'yes' ? (
        <label className="block text-sm" htmlFor="orb-pilot-time-minutes">
          <span className="text-xs font-semibold">Roughly how many minutes?</span>
          <input
            id="orb-pilot-time-minutes"
            type="number"
            min={0}
            max={240}
            value={timeSavedMinutes}
            onChange={(event) => setTimeSavedMinutes(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-page-bg)] px-3 py-2 text-sm"
            data-orb-pilot-field-time-minutes
          />
        </label>
      ) : null}

      <RatingSelect
        id="orb-pilot-record-quality"
        label="Did it improve the quality or clarity of the record?"
        value={recordQualityRating}
        onChange={setRecordQualityRating}
      />

      <RatingSelect
        id="orb-pilot-child-voice"
        label="Did it help you think about the child's voice, wishes or feelings?"
        value={childVoiceRating}
        onChange={setChildVoiceRating}
      />

      <label className="block text-sm" htmlFor="orb-pilot-child-helped">
        <span className="text-xs font-semibold">What helped the child?</span>
        <textarea
          id="orb-pilot-child-helped"
          value={whatHelpedTheChild}
          onChange={(event) => setWhatHelpedTheChild(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-page-bg)] px-3 py-2 text-sm"
          placeholder="Describe the type of help only — no names or full records"
          data-orb-pilot-field-what-helped-child
        />
      </label>

      <RatingSelect
        id="orb-pilot-therapeutic"
        label="Did it help make the wording more therapeutic / support behaviour as communication?"
        value={therapeuticLanguageRating}
        onChange={setTherapeuticLanguageRating}
      />

      <RatingSelect
        id="orb-pilot-staff-confidence"
        label="Did ORB make you feel more confident with the task?"
        value={staffConfidenceRating}
        onChange={setStaffConfidenceRating}
      />

      <RatingSelect
        id="orb-pilot-safeguarding"
        label="Did it remind you about safeguarding, local policy or professional judgement?"
        value={safeguardingPromptRating}
        onChange={setSafeguardingPromptRating}
      />

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold">Would you use ORB again?</legend>
        <label className="mr-4 text-sm">
          <input
            type="radio"
            name="would-use-again"
            value="yes"
            checked={wouldUseAgain === 'yes'}
            onChange={() => setWouldUseAgain('yes')}
          />{' '}
          Yes
        </label>
        <label className="text-sm">
          <input
            type="radio"
            name="would-use-again"
            value="no"
            checked={wouldUseAgain === 'no'}
            onChange={() => setWouldUseAgain('no')}
          />{' '}
          No
        </label>
      </fieldset>

      <label className="block text-sm" htmlFor="orb-pilot-worked-well">
        <span className="text-xs font-semibold">What worked well?</span>
        <textarea
          id="orb-pilot-worked-well"
          value={whatWorkedWell}
          onChange={(event) => setWhatWorkedWell(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-page-bg)] px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm" htmlFor="orb-pilot-unsafe">
        <span className="text-xs font-semibold">What felt unsafe, wrong or unhelpful?</span>
        <textarea
          id="orb-pilot-unsafe"
          value={whatFeltUnsafeOrUnhelpful}
          onChange={(event) => setWhatFeltUnsafeOrUnhelpful(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-page-bg)] px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm" htmlFor="orb-pilot-improvement">
        <span className="text-xs font-semibold">What would make ORB better?</span>
        <textarea
          id="orb-pilot-improvement"
          value={improvementSuggestion}
          onChange={(event) => setImprovementSuggestion(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-page-bg)] px-3 py-2 text-sm"
        />
      </label>

      <OrbPrivacyInputWarning text={freeTextCombined} />

      {error ? (
        <p className="text-sm text-rose-400" data-orb-pilot-feedback-error>
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-400" data-orb-pilot-feedback-success>
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-[var(--orb-primary,#1677ff)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        data-orb-pilot-feedback-submit
      >
        {busy ? 'Submitting…' : 'Submit feedback'}
      </button>
    </form>
  )
}
