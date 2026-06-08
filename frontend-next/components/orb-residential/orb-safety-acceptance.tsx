'use client'

import { FormEvent, useCallback, useMemo, useState } from 'react'

import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'
import { useOrbAppearance } from '@/components/orb-standalone/use-orb-appearance'
import { ORB_SAFETY_VERSION, acceptOrbSafety } from '@/lib/orb/orb-billing-client'
import { getOrbThemeCssVariables } from '@/lib/orb/orb-theme'

export const ORB_SAFETY_INTRO =
  'ORB supports residential childcare professionals, but it does not replace professional judgement, safeguarding procedures, managers, emergency services or legal advice.'

export const ORB_SAFETY_STATEMENTS = [
  'I understand ORB is guidance and recording support, not a replacement for professional judgement.',
  'I understand urgent safeguarding concerns must follow my home’s safeguarding policy and local safeguarding procedures.',
  'I understand I must review, edit and approve ORB outputs before using them in professional records.',
  'I understand ORB Residential does not access live IndiCare OS care records.'
] as const

type StatementKey = (typeof ORB_SAFETY_STATEMENTS)[number]

function emptyStatementState(): Record<StatementKey, boolean> {
  return ORB_SAFETY_STATEMENTS.reduce(
    (state, statement) => {
      state[statement] = false
      return state
    },
    {} as Record<StatementKey, boolean>
  )
}

/** Full-screen ORB Residential safety acceptance gate — shown when authenticated but safety is pending. */
export function OrbSafetyAcceptance({
  onAccepted,
  onBackToSignIn
}: {
  onAccepted: () => void
  onBackToSignIn?: () => void
}) {
  const { resolvedTheme } = useOrbAppearance()
  const themeClass = resolvedTheme === 'light' ? 'orb-login-root--light' : 'orb-login-root--dark'
  const [statements, setStatements] = useState(emptyStatementState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAccepted = useMemo(
    () => ORB_SAFETY_STATEMENTS.every((statement) => statements[statement]),
    [statements]
  )

  const handleBackToSignIn = useCallback(() => {
    onBackToSignIn?.()
  }, [onBackToSignIn])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!allAccepted) {
      setError('Please confirm all safety statements to continue.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await acceptOrbSafety(ORB_SAFETY_VERSION)
      onAccepted()
    } catch {
      setError('Could not save your safety acceptance. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`orb-residential-root orb-auth-loading-root ${themeClass} flex min-h-[100dvh] min-h-[100svh] items-center justify-center overflow-y-auto`}
      data-orb-safety-acceptance
      data-orb-residential="true"
      style={{
        ...getOrbThemeCssVariables(resolvedTheme),
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      role="dialog"
      aria-labelledby="orb-safety-acceptance-title"
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="orb-auth-loading-inner my-auto flex w-full max-w-lg flex-col gap-5 px-6 py-8"
      >
        <div className="flex flex-col items-center text-center">
          <OrbHeroSphere className="scale-[0.55] sm:scale-[0.65]" />
          <h1
            id="orb-safety-acceptance-title"
            className="mt-4 text-lg font-semibold text-[var(--orb-text,#f8fafc)]"
          >
            Before using ORB Residential
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--orb-muted,#94a3b8)]" data-orb-safety-intro>
            {ORB_SAFETY_INTRO}
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--orb-line)]/30 bg-white/[0.03] p-4">
          {ORB_SAFETY_STATEMENTS.map((statement, index) => (
            <label
              key={statement}
              className="flex items-start gap-3 text-left text-sm leading-relaxed text-[var(--orb-text,#f8fafc)]"
              data-orb-safety-statement={index + 1}
            >
              <input
                type="checkbox"
                checked={statements[statement]}
                onChange={(event) =>
                  setStatements((current) => ({ ...current, [statement]: event.target.checked }))
                }
                className="mt-1"
                data-orb-safety-checkbox={index + 1}
              />
              <span>{statement}</span>
            </label>
          ))}
        </div>

        {error ? (
          <p className="text-center text-sm text-red-400" data-orb-safety-error role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex w-full flex-col gap-2">
          <button
            type="submit"
            className="orb-login-submit rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            data-orb-safety-accept
            disabled={submitting || !allAccepted}
          >
            {submitting ? 'Saving…' : 'Accept and continue'}
          </button>
          <button
            type="button"
            className="rounded-2xl border border-[var(--orb-line)]/40 px-5 py-2.5 text-sm font-semibold text-[var(--orb-text,#f8fafc)]"
            data-orb-safety-back-to-sign-in
            onClick={handleBackToSignIn}
          >
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  )
}
