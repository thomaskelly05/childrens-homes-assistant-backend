'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  ORB_COMMON_NEEDS,
  ORB_ROLE_OPTIONS,
  ORB_SAFETY_STATEMENTS,
  ORB_SAFETY_VERSION,
  acceptOrbSafety,
  saveOrbOnboarding,
  trackOrbAnalytics
} from '@/lib/orb/orb-billing-client'
import { useAuth } from '@/contexts/auth-context'

type Step = 1 | 2 | 3 | 4

export default function OrbOnboardingPage() {
  const router = useRouter()
  const { status } = useAuth()
  const [step, setStep] = useState<Step>(1)
  const [displayName, setDisplayName] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [commonNeeds, setCommonNeeds] = useState<string[]>([])
  const [answerLength, setAnswerLength] = useState('balanced')
  const [tone, setTone] = useState('warm professional')
  const [safetyAccepted, setSafetyAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    trackOrbAnalytics('onboarding_started')
    if (status === 'unauthenticated') {
      router.replace('/orb/login?returnUrl=/orb/onboarding')
    }
  }, [status, router])

  function toggleNeed(need: string) {
    setCommonNeeds((current) => (current.includes(need) ? current.filter((item) => item !== need) : [...current, need]))
  }

  async function finish(event: FormEvent) {
    event.preventDefault()
    if (!safetyAccepted) {
      setError('Please accept the safety statements to continue.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await saveOrbOnboarding({
        role_label: roleLabel,
        work_environment: `${serviceType} · ${ageRange}`.trim(),
        preferred_support_style: tone,
        onboarding_completed: true,
        preferences: {
          display_name: displayName,
          answer_length: answerLength,
          tone,
          common_needs: commonNeeds,
          default_safeguarding_prompts: true,
          default_ofsted_reg44_lens: true,
          default_recording_prompts: true,
          academy_nvq_support: true,
          voice_read_aloud_preference: 'optional'
        }
      })
      await acceptOrbSafety(ORB_SAFETY_VERSION)
      trackOrbAnalytics('onboarding_completed')
      router.replace('/orb/access')
    } catch {
      setError('Could not save onboarding. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC,#EEF2FF)] px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">ORB onboarding · step {step} of 4</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Welcome to ORB Residential</h1>
        <p className="mt-2 text-sm text-slate-600">ORB Residential does not access IndiCare OS records.</p>

        {step === 1 ? (
          <section className="mt-8 space-y-4">
            <label className="block text-sm font-semibold">
              Your name / display name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3" placeholder="Optional — used in greetings" />
            </label>
            <label className="block text-sm font-semibold">
              Your role
              <select value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3" data-orb-onboarding-role>
                <option value="">Select role</option>
                {ORB_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setStep(2)} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
              Continue
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-8 space-y-4">
            <label className="block text-sm font-semibold">
              Service type
              <input value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3" placeholder="e.g. children's home, supported accommodation" />
            </label>
            <label className="block text-sm font-semibold">
              Age range supported
              <input value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3" placeholder="e.g. 8–17" />
            </label>
            <fieldset>
              <legend className="text-sm font-semibold">Common needs</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ORB_COMMON_NEEDS.map((need) => (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleNeed(need)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${commonNeeds.includes(need) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {need}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-2xl border px-5 py-3 text-sm font-bold">
                Back
              </button>
              <button type="button" onClick={() => setStep(3)} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="mt-8 space-y-4">
            <label className="block text-sm font-semibold">
              Answer length
              <select value={answerLength} onChange={(e) => setAnswerLength(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3">
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Tone
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="mt-2 w-full rounded-2xl border px-4 py-3">
                <option value="warm professional">Warm professional</option>
                <option value="direct and practical">Direct and practical</option>
                <option value="reflective supervision">Reflective supervision</option>
              </select>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="rounded-2xl border px-5 py-3 text-sm font-bold">
                Back
              </button>
              <button type="button" onClick={() => setStep(4)} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <form className="mt-8 space-y-4" onSubmit={finish}>
            <fieldset data-orb-safety-acceptance>
              <legend className="text-sm font-semibold">Safety and data</legend>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                {ORB_SAFETY_STATEMENTS.map((statement) => (
                  <li key={statement}>{statement}</li>
                ))}
              </ul>
              <label className="mt-4 flex items-start gap-3 text-sm">
                <input type="checkbox" checked={safetyAccepted} onChange={(e) => setSafetyAccepted(e.target.checked)} required data-orb-safety-checkbox />
                <span>I accept these statements</span>
              </label>
            </fieldset>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)} className="rounded-2xl border px-5 py-3 text-sm font-bold">
                Back
              </button>
              <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
                {submitting ? 'Saving…' : 'Finish onboarding'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  )
}
