'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { OrbStepCard } from '@/components/orb-residential/ui/orb-step-card'
import { useAuth } from '@/contexts/auth-context'
import {
  ORB_SAFETY_VERSION,
  acceptOrbSafety,
  fetchOrbAccess,
  saveOrbOnboarding,
  trackOrbAnalytics
} from '@/lib/orb/orb-billing-client'

const TOTAL_STEPS = 5

const ROLE_OPTIONS = [
  'Residential Support Worker',
  'Senior Residential Support Worker',
  'Deputy Manager',
  'Registered Manager',
  'Responsible Individual',
  'Consultant / Quality Lead',
  'Other Professional'
]

const SUPPORT_OPTIONS = [
  'Recording',
  'Safeguarding',
  'Ofsted',
  'Templates',
  'Learning',
  'Leadership',
  'Locality Risk'
]

const ANSWER_STYLES = ['Simple', 'Balanced', 'Detailed', 'Manager-level', 'RI-level']

export function OrbSetupScreen() {
  const router = useRouter()
  const { status } = useAuth()
  const [step, setStep] = useState(1)
  const [roleLabel, setRoleLabel] = useState('')
  const [homeName, setHomeName] = useState('')
  const [postcode, setPostcode] = useState('')
  const [localAuthority, setLocalAuthority] = useState('')
  const [policeForce, setPoliceForce] = useState('')
  const [region, setRegion] = useState('')
  const [homeType, setHomeType] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [presentingNeeds, setPresentingNeeds] = useState('')
  const [supportFocus, setSupportFocus] = useState<string[]>([])
  const [answerStyle, setAnswerStyle] = useState('Balanced')
  const [safetyAccepted, setSafetyAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    trackOrbAnalytics('onboarding_started')
    if (status === 'unauthenticated') {
      router.replace('/orb/login?returnUrl=/orb/setup')
    }
  }, [status, router])

  function toggleSupport(item: string) {
    setSupportFocus((current) =>
      current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
    )
  }

  async function finish(event: FormEvent) {
    event.preventDefault()
    if (!safetyAccepted) {
      setError('Please acknowledge the safety statement to continue.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await saveOrbOnboarding({
        role_label: roleLabel,
        work_environment: [homeName, homeType, ageRange].filter(Boolean).join(' · '),
        preferred_support_style: answerStyle,
        onboarding_completed: true,
        home_profile: {
          home_name: homeName,
          postcode,
          local_authority: localAuthority,
          police_force: policeForce,
          region,
          home_type: homeType,
          age_range: ageRange,
          main_presenting_needs: presentingNeeds
        },
        preferences: {
          support_focus: supportFocus,
          answer_style: answerStyle,
          default_safeguarding_prompts: supportFocus.includes('Safeguarding'),
          default_ofsted_reg44_lens: supportFocus.includes('Ofsted'),
          default_recording_prompts: supportFocus.includes('Recording')
        }
      })
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
      <div className="mx-auto max-w-xl py-6" data-orb-setup>
        {step === 1 ? (
          <OrbStepCard step={1} total={TOTAL_STEPS} title="Your role">
            <p className="mb-4 text-sm text-slate-400">This helps ORB tailor tone and depth — not live OS records.</p>
            <div className="space-y-2">
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
            <OrbButton className="mt-6 w-full" onClick={() => roleLabel && setStep(2)} disabled={!roleLabel}>
              Continue
            </OrbButton>
          </OrbStepCard>
        ) : null}

        {step === 2 ? (
          <OrbStepCard step={2} total={TOTAL_STEPS} title="Your home profile">
            <p className="mb-4 text-sm text-slate-400">
              Helps ORB tailor locality risk, templates and safeguarding prompts. This is not live OS care record
              access.
            </p>
            <div className="space-y-3 text-sm">
              <label className="block text-slate-300">
                Home name
                <input value={homeName} onChange={(e) => setHomeName(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-slate-300">
                Postcode
                <input value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-slate-300">
                Local authority
                <input value={localAuthority} onChange={(e) => setLocalAuthority(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-slate-300">
                Police force
                <input value={policeForce} onChange={(e) => setPoliceForce(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-slate-300">
                Region
                <input value={region} onChange={(e) => setRegion(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-slate-300">
                Home type
                <input value={homeType} onChange={(e) => setHomeType(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-slate-300">
                Age range
                <input value={ageRange} onChange={(e) => setAgeRange(e.target.value)} className={inputClass} />
              </label>
              <label className="block text-slate-300">
                Main presenting needs
                <input value={presentingNeeds} onChange={(e) => setPresentingNeeds(e.target.value)} className={inputClass} />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <OrbButton variant="secondary" onClick={() => setStep(1)}>
                Back
              </OrbButton>
              <OrbButton className="flex-1" onClick={() => setStep(3)}>
                Continue
              </OrbButton>
            </div>
          </OrbStepCard>
        ) : null}

        {step === 3 ? (
          <OrbStepCard step={3} total={TOTAL_STEPS} title="How should ORB support you?">
            <div className="flex flex-wrap gap-2">
              {SUPPORT_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleSupport(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    supportFocus.includes(item)
                      ? 'bg-sky-500/30 text-sky-100'
                      : 'bg-white/[0.06] text-slate-400'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <OrbButton variant="secondary" onClick={() => setStep(2)}>
                Back
              </OrbButton>
              <OrbButton className="flex-1" onClick={() => setStep(4)}>
                Continue
              </OrbButton>
            </div>
          </OrbStepCard>
        ) : null}

        {step === 4 ? (
          <OrbStepCard step={4} total={TOTAL_STEPS} title="Preferred answer style">
            <div className="space-y-2">
              {ANSWER_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setAnswerStyle(style)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm ${
                    answerStyle === style
                      ? 'border-sky-400/50 bg-sky-500/10 text-white'
                      : 'border-white/10 text-slate-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <OrbButton variant="secondary" onClick={() => setStep(3)}>
                Back
              </OrbButton>
              <OrbButton className="flex-1" onClick={() => setStep(5)}>
                Continue
              </OrbButton>
            </div>
          </OrbStepCard>
        ) : null}

        {step === 5 ? (
          <OrbStepCard step={5} total={TOTAL_STEPS} title="Safety acknowledgement">
            <p className="text-sm leading-relaxed text-slate-300">
              ORB supports professional judgement. It does not replace safeguarding procedures, emergency services,
              managers, local protocols or legal advice.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={safetyAccepted}
                onChange={(e) => setSafetyAccepted(e.target.checked)}
                className="mt-1"
                data-orb-safety-checkbox
              />
              <span>I understand and accept</span>
            </label>
            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
            <form onSubmit={finish} className="mt-6 flex gap-3">
              <OrbButton variant="secondary" type="button" onClick={() => setStep(4)}>
                Back
              </OrbButton>
              <OrbButton className="flex-1" type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Enter ORB'}
              </OrbButton>
            </form>
          </OrbStepCard>
        ) : null}
      </div>
    </OrbShell>
  )
}
