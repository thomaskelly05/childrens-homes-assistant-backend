'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { OrbLoginLegalFooter } from '@/components/orb-residential/orb-login-legal-footer'
import { orbStandaloneSignup, trackOrbAnalytics } from '@/lib/orb/orb-billing-client'
import { buildOrbFrontDoorUrl } from '@/lib/orb/orb-front-door-routing'
import { useAuth } from '@/contexts/auth-context'

export default function OrbSignupPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    trackOrbAnalytics('signup_viewed')
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await orbStandaloneSignup({ email, password, first_name: firstName, last_name: lastName })
      await login({ email, password, remember: true })
      const { instrumentUserSignup } = await import('@/lib/founder/telemetry/founder-telemetry-instrumentation')
      instrumentUserSignup('orb_residential')
      router.replace('/orb/setup')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#EEF2FF)] px-6 py-10">
      <div className="mx-auto max-w-lg rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-2xl">
        <h1 className="text-3xl font-black tracking-tight" data-orb-signup-title>
          Create your ORB Residential account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          For adults working in or around children&apos;s homes. ORB Residential does not access IndiCare OS records.
        </p>
        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="orb-signup-form">
          <label className="block text-sm font-semibold">
            First name
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3" />
          </label>
          <label className="block text-sm font-semibold">
            Last name
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3" />
          </label>
          <label className="block text-sm font-semibold">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3" data-testid="orb-signup-email" />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input type="password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3" data-testid="orb-signup-password" />
          </label>
          <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white" data-testid="orb-signup-submit">
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{' '}
          <Link href={buildOrbFrontDoorUrl('/orb')} className="font-bold text-indigo-700">
            Sign in
          </Link>
        </p>
        <div className="mt-8">
          <OrbLoginLegalFooter />
        </div>
      </div>
    </main>
  )
}
