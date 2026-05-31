'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { useAuth } from '@/contexts/auth-context'
import {
  ORB_SAFETY_VERSION,
  acceptOrbSafety,
  fetchOrbAccess,
  saveOrbOnboarding,
  trackOrbAnalytics
} from '@/lib/orb/orb-billing-client'

const ROLE_OPTIONS = [
  'Residential Support Worker',
  'Senior Residential Support Worker',
  'Deputy Manager',
  'Registered Manager',
  'Responsible Individual',
  'Other Professional'
]

export function OrbSetupScreen() {
  const router = useRouter()
  const { status, user } = useAuth()
  const [name, setName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [safetyAccepted, setSafetyAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    trackOrbAnalytics('onboarding_started')
    if (status === 'unauthenticated') {
      router.replace('/orb/login?returnUrl=/orb/setup')
    }
  }, [status, router])

  useEffect(() => {
    if (user?.first_name) setName((current) => current || user.first_name || '')
  }, [user?.first_name])

  async function finish(event: FormEvent) {
    event.preventDefault()
    if (!safetyAccepted) {
      setError('Please acknowledge the safety statement to continue.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (roleLabel || name.trim()) {
        await saveOrbOnboarding({
          role_label: roleLabel || undefined,
          work_environment: name.trim() || undefined,
          onboarding_completed: true
        })
      }
      await acceptOrbSafety(ORB_SAFETY_VERSION)
      trackOrbAnalytics('onboarding_completed')
      const access = await fetchOrbAccess().catch(() => null)
      if (access && !access.can_use_orb && !access.trial?.active) {
        router.replace('/orb/billing')
      } else {
        router.replace('/orb')
      }
    } catch {
      setError('Could not save setup. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400/40 focus:outline-none'

  return (
    <OrbShell showOsLink={false}>
      <div className="mx-auto max-w-lg py-8" data-orb-setup>
        <h1 className="text-2xl font-semibold text-white">Optional profile setup</h1>
        <p className="mt-2 text-sm text-slate-400">
          Add only what helps ORB tailor answers. You can ask your first question without completing this.
        </p>

        <form onSubmit={finish} className="mt-8 space-y-5">
          <label className="block text-sm text-slate-300">
            Your name <span className="text-slate-600">(optional)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="name" />
          </label>

          <fieldset>
            <legend className="text-sm text-slate-300">
              Your role <span className="text-slate-600">(optional)</span>
            </legend>
            <div className="mt-2 space-y-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleLabel(role)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    roleLabel === role
                      ? 'border-sky-400/50 bg-sky-500/10 text-white'
                      : 'border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                  data-orb-onboarding-role={role}
                >
                  {role}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Before using ORB</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              ORB supports professional judgement. It does not replace safeguarding procedures, managers, emergency
              services, local protocols or legal advice. If there is immediate risk of harm, follow your
              organisation&apos;s procedures and contact emergency services where required.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={safetyAccepted}
                onChange={(e) => setSafetyAccepted(e.target.checked)}
                className="mt-1"
                data-orb-safety-checkbox
              />
              <span>I understand</span>
            </label>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <OrbButton className="w-full" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Continue to ORB'}
          </OrbButton>
          <Link
            href="/orb"
            className="block text-center text-sm text-slate-500 hover:text-sky-300"
            data-orb-setup-skip
          >
            Set this up later — ask ORB now
          </Link>
        </form>
      </div>
    </OrbShell>
  )
}
