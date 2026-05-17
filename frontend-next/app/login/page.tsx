'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShieldCheck, Sparkles } from 'lucide-react'

import { useAuth } from '@/contexts/auth-context'

function LoginPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(searchParams.get('expired') ? 'Your session expired. Please sign in again.' : null)
  const [submitting, setSubmitting] = useState(false)

  function redirectToMfa(response: Awaited<ReturnType<typeof login>>) {
    const returnUrl = searchParams.get('returnUrl') || '/home'
    const target = response.mfa_setup_required || response.mfa_enabled === false ? '/mfa-setup' : '/mfa'
    router.replace(`${target}?next=${encodeURIComponent(returnUrl)}`)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      const response = await login({ email, password, remember })

      if (response.authenticated) {
        const returnUrl = searchParams.get('returnUrl') || '/home'
        router.replace(returnUrl)
        return
      }

      if (response.mfa_required) {
        setNotice(response.message || 'Password accepted. Continue to multi-factor verification.')
        redirectToMfa(response)
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700 shadow-sm backdrop-blur">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Secure IndiCare OS
          </div>
          <div>
            <h1 className="max-w-3xl text-5xl font-black tracking-[-0.07em] text-slate-950 md:text-7xl">
              Sign in to the care command workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Role-aware access for children&apos;s homes, supported accommodation, Ofsted evidence, assistant workflows and auditable care records.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {['JWT sessions', 'RBAC navigation', 'Audit-ready access'].map((item) => (
              <div key={item} className="rounded-[24px] border border-white/80 bg-white/75 p-5 text-sm font-black text-slate-700 shadow-sm backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur-xl md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-blue-700 text-sm font-black text-white">IC</div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">IndiCare OS</p>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">Authentication</h2>
            </div>
          </div>

          {notice ? (
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-800">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
              {error}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit} data-testid="login-form">
            <label className="block" htmlFor="login-email">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Email</span>
              <input
                id="login-email"
                data-testid="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="block" htmlFor="login-password">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Password</span>
              <input
                id="login-password"
                data-testid="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Keep me signed in on this device
            </label>

            <button
              type="submit"
              data-testid="login-submit"
              disabled={submitting || status === 'loading'}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-[24px] border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Live workspace</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in with your provider-issued account. Demo credentials are not shown on live routes.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-black text-slate-500">Loading sign-in...</div>}>
      <LoginPanel />
    </Suspense>
  )
}
