'use client'

import { useEffect, useState } from 'react'

import { getStaffProfileOsDashboard, type StaffProfileOsDashboard } from '@/lib/os-api/staff-profile-os'

import { StaffProfileOsHeader } from './staff-profile-os-header'
import { StaffProfileOsOrbLinks, StaffProfileOsQuickCards } from './staff-profile-os-actions'
import { StaffProfileOsSafetyNote } from './staff-profile-os-safety-note'
import { StaffProfileOsSectionBlock } from './staff-profile-os-section'

export function StaffProfileOsDashboard({ staffId }: { staffId: string }) {
  const [dashboard, setDashboard] = useState<StaffProfileOsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getStaffProfileOsDashboard(staffId).then((result) => {
      if (!active) return
      if (result.ok && result.data) {
        setDashboard(result.data)
        setError(null)
      } else {
        setError(result.error || 'Staff profile OS unavailable')
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [staffId])

  if (loading) {
    return (
      <p data-testid="staff-profile-os-loading" className="text-sm font-semibold text-slate-500">
        Loading adult working-life profile…
      </p>
    )
  }

  if (!dashboard) {
    return (
      <p data-testid="staff-profile-os-unavailable" className="text-sm font-semibold text-slate-600">
        {error || 'Staff profile OS summary is unavailable. Use linked workforce areas below.'}
      </p>
    )
  }

  return (
    <div data-testid="staff-profile-os-dashboard" className="space-y-6">
      <StaffProfileOsHeader overview={dashboard.overview} />
      <StaffProfileOsSafetyNote notice={dashboard.privacy_notice} />
      <StaffProfileOsQuickCards dashboard={dashboard} />
      {dashboard.recommendations.length ? (
        <ul className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm font-semibold text-amber-950">
          {dashboard.recommendations.map((rec) => (
            <li key={rec} className="list-disc ml-4">
              {rec}
            </li>
          ))}
        </ul>
      ) : null}
      <StaffProfileOsOrbLinks prompts={dashboard.orb_prompts} />
      <div className="space-y-4">
        {dashboard.sections.map((section) => (
          <StaffProfileOsSectionBlock key={section.id} section={section} />
        ))}
      </div>
    </div>
  )
}
