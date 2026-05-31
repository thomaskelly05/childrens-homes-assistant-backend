'use client'

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail } from 'lucide-react'

import { OrbAuthButton } from '@/components/orb-residential/ui/orb-auth-button'
import { OrbGlowHero } from '@/components/orb-residential/ui/orb-glow-hero'
import { orbNavyGradient, orbNavyPage } from '@/components/orb-residential/ui/orb-theme'
import { useAuth } from '@/contexts/auth-context'
import { fetchOrbAccess, orbOAuthStartUrl, trackOrbAnalytics } from '@/lib/orb/orb-billing-client'

const SETUP_RETURN = '/orb/setup'

function resolvePostLoginRoute(access: Awaited<ReturnType<typeof fetchOrbAccess>> | null) {
  if (!access?.onboarding_completed) return '/orb/setup'
  if (!access.can_use_orb && !access.trial?.active && !access.subscription?.active) return '/orb/billing'
  return '/orb'
}

function OrbLoginPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, status, refreshSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const returnUrl = searchParams.get('returnUrl') || SETUP_RETURN

  const oauth = useMemo(
    () => ({
      google: process.env.NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED === '1',
      microsoft: process.env.NEXT_PUBLIC_OAUTH_MICROSOFT_ENABLED === '1',
      apple: process.env.NEXT_PUBLIC_OAUTH_APPLE_ENABLED === '1'
    }),
    []
  )

  useEffect(() => {
    trackOrbAnalytics('login_viewed')
    const oauthError = searchParams.get('oauth_error')
    if (oauthError) setError(oauthError)
    if (searchParams.get('provider') === 'email') setShowEmailForm(true)
  }, [searchParams])

  async function afterAuth() {
    await refreshSession()
    try {
      const access = await fetchOrbAccess()
      router.replace(resolvePostLoginRoute(access))
    } catch {
      router.replace(returnUrl === '/orb' ? '/orb/setup' : returnUrl)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await login({ email, password, remember })
      if (response.authenticated) {
        await afterAuth()
        return
      }
      if (response.mfa_required) {
        router.replace(`/mfa?next=${encodeURIComponent(returnUrl)}`)
        return
      }
      setError(response.message || 'Sign-in could not be completed')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${orbNavyPage} ${orbNavyGradient} min-h-screen`} data-orb-login-page>
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-12 lg:px-12">
          <Link href="/" className="text-sm font-semibold text-white">
            ORB Residential
          </Link>
          <p className="mt-1 text-xs text-sky-300/80">Powered by IndiCare Intelligence</p>
          <h1 className="mt-10 text-3xl font-semibold tracking-tight text-white sm:text-4xl" data-orb-login-title>
            The professional AI copilot for children&apos;s homes
          </h1>
          <div className="mt-10 hidden lg:block">
            <OrbGlowHero compact />
          </div>
        </div>

        <div className="flex flex-col justify-center border-t border-white/5 px-6 py-12 lg:border-l lg:border-t-0 lg:px-12">
          <h2 className="text-xl font-semibold text-white">Sign in</h2>
          {error ? <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

          <div className="mt-6 space-y-2" data-orb-oauth-buttons>
            <OrbAuthButton
              provider="microsoft"
              href={oauth.microsoft ? orbOAuthStartUrl('microsoft', SETUP_RETURN) : undefined}
              disabled={!oauth.microsoft}
            >
              Continue with Microsoft
            </OrbAuthButton>
            <OrbAuthButton
              provider="google"
              href={oauth.google ? orbOAuthStartUrl('google', SETUP_RETURN) : undefined}
              disabled={!oauth.google}
              data-orb-oauth-google
            >
              {oauth.google ? 'Continue with Google' : 'Google sign-in not configured'}
            </OrbAuthButton>
            <OrbAuthButton
              provider="apple"
              href={oauth.apple ? orbOAuthStartUrl('apple', SETUP_RETURN) : undefined}
              disabled={!oauth.apple}
              data-orb-oauth-apple
            >
              Continue with Apple
            </OrbAuthButton>
            <button
              type="button"
              onClick={() => setShowEmailForm((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3.5 text-sm font-semibold text-white hover:border-sky-400/30"
              data-orb-oauth="email"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Continue with Email
            </button>
          </div>

          {showEmailForm ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit} data-testid="orb-login-form">
              <label className="block text-sm font-medium text-slate-300">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white"
                  data-testid="orb-login-email"
                  autoComplete="email"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white"
                  data-testid="orb-login-password"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={submitting || status === 'loading'}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                data-testid="orb-login-submit"
              >
                {submitting ? 'Signing in…' : 'Sign in with email'}
              </button>
            </form>
          ) : null}

          <p className="mt-8 text-sm text-slate-500">
            No account?{' '}
            <Link href="/orb/signup" className="font-semibold text-sky-400 hover:text-sky-300">
              Start free trial
            </Link>
          </p>
          <p className="mt-4 text-xs text-slate-600">
            <Link href="/" className="hover:text-slate-400">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function OrbLoginScreen() {
  return (
    <Suspense fallback={<div className={`${orbNavyPage} flex min-h-screen items-center justify-center`}>Loading…</div>}>
      <OrbLoginPanel />
    </Suspense>
  )
}
