'use client'

import { FormEvent, useState } from 'react'

import { fetchOrbResidential } from '@/components/orb-residential/orb-residential-api'

export default function OrbResidentialOnboardingPage() {
  const [roleLabel, setRoleLabel] = useState('')
  const [environment, setEnvironment] = useState('')
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await fetchOrbResidential('/orb/residential/onboarding/preferences', {
      method: 'POST',
      body: JSON.stringify({
        role_label: roleLabel,
        work_environment: environment,
        onboarding_completed: true,
      }),
    })
    setSaved(true)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Personalise ORB</h1>
      <label className="block text-sm">
        Your role
        <input className="mt-1 w-full rounded-lg border border-[#E5E7EB] p-2" value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} />
      </label>
      <label className="block text-sm">
        Work environment
        <input className="mt-1 w-full rounded-lg border border-[#E5E7EB] p-2" value={environment} onChange={(e) => setEnvironment(e.target.value)} />
      </label>
      <button type="submit" className="rounded-full bg-[#111827] px-5 py-2 text-sm text-white">
        Save preferences
      </button>
      {saved ? <p className="text-sm text-green-700">Saved.</p> : null}
    </form>
  )
}
