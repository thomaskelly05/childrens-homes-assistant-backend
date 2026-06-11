'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'

import { fetchMyOrbPrivacyRequests, submitOrbPrivacyRequest } from '@/lib/orb/privacy/orb-privacy-client'
import { ORB_PRIVACY_CONTACT_EMAIL } from '@/lib/orb/privacy/orb-privacy-content'
import { sanitiseOrbPrivacyRequestSummary } from '@/lib/orb/privacy/orb-privacy-sanitize'
import type { OrbPrivacyRequest, OrbPrivacyRequestType } from '@/lib/orb/privacy/orb-privacy-types'

const REQUEST_TYPES: Array<{ value: OrbPrivacyRequestType; label: string }> = [
  { value: 'delete-my-orb-data', label: 'Delete my ORB data' },
  { value: 'export-my-orb-data', label: 'Export my ORB data' },
  { value: 'privacy-question', label: 'Ask a privacy question' },
  { value: 'privacy-concern', label: 'Report a privacy concern' }
]

export function OrbPrivacyRequestsForm({ authenticated }: { authenticated: boolean }) {
  const [requestType, setRequestType] = useState<OrbPrivacyRequestType>('privacy-question')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mine, setMine] = useState<OrbPrivacyRequest[]>([])

  useEffect(() => {
    if (!authenticated) return
    fetchMyOrbPrivacyRequests()
      .then(setMine)
      .catch(() => {
        /* non-blocking */
      })
  }, [authenticated, success])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const sanitised = sanitiseOrbPrivacyRequestSummary(summary)
    if (sanitised.rejected) {
      setError(sanitised.reason ?? 'Please revise your request.')
      return
    }

    if (!authenticated) {
      setError('Sign in to submit an account-linked privacy request.')
      return
    }

    setBusy(true)
    try {
      await submitOrbPrivacyRequest({ requestType, summary: sanitised.sanitised })
      setSummary('')
      setSuccess('Your request has been submitted. We will review it in line with applicable data protection requirements and pilot terms.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit request.')
    } finally {
      setBusy(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-6" data-orb-privacy-requests-auth-required>
        <p className="text-sm leading-6 text-[var(--orb-muted)]">
          Sign in to submit an account-linked privacy request. Alternatively, email{' '}
          <a href={`mailto:${ORB_PRIVACY_CONTACT_EMAIL}`} className="font-semibold text-[var(--orb-primary,#1677ff)]">
            {ORB_PRIVACY_CONTACT_EMAIL}
          </a>{' '}
          with the type of request only — do not include safeguarding narratives or child-identifiable details.
        </p>
        <Link href="/orb" className="mt-4 inline-block text-sm font-semibold text-[var(--orb-primary,#1677ff)] hover:underline">
          Return to ORB to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-6"
        data-orb-privacy-requests-form
      >
        <p className="text-xs leading-5 text-[var(--orb-muted)]" data-orb-privacy-request-disclaimer>
          We will review requests in line with applicable data protection requirements and pilot terms. Self-service
          deletion and instant export are not available in this pilot build.
        </p>
        <p className="mt-2 text-xs leading-5 text-amber-800" data-orb-privacy-request-safeguarding-warning>
          Do not include full safeguarding narratives, child names, dates of birth, addresses or formal record content
          in this form.
        </p>

        <label className="mt-4 block text-xs font-semibold text-[var(--orb-foreground)]" htmlFor="orb-privacy-request-type">
          Request type
        </label>
        <select
          id="orb-privacy-request-type"
          value={requestType}
          onChange={(event) => setRequestType(event.target.value as OrbPrivacyRequestType)}
          className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
          data-orb-privacy-request-type
        >
          {REQUEST_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-semibold text-[var(--orb-foreground)]" htmlFor="orb-privacy-request-summary">
          Brief summary
        </label>
        <textarea
          id="orb-privacy-request-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={4}
          maxLength={800}
          placeholder="Describe the type of request — e.g. delete saved outputs and account metadata. Do not paste record content."
          className="mt-1 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
          data-orb-privacy-request-summary
        />

        {error ? (
          <p className="mt-3 text-xs text-rose-700" role="alert" data-orb-privacy-request-error>
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-3 text-xs text-emerald-700" role="status" data-orb-privacy-request-success>
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-full bg-[var(--orb-primary,#1677ff)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          data-orb-privacy-request-submit
        >
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
      </form>

      {mine.length ? (
        <section className="rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-6" data-orb-privacy-requests-mine>
          <h2 className="text-sm font-bold">Your requests</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--orb-line)]/40 px-3 py-2 text-xs" data-orb-privacy-request-row>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{item.requestType.replace(/-/g, ' ')}</span>
                  <span className="text-[var(--orb-muted)]">{item.status}</span>
                </div>
                <p className="mt-1 text-[var(--orb-muted)]">{item.summary}</p>
                <p className="mt-1 text-[10px] text-[var(--orb-muted)]">{new Date(item.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
