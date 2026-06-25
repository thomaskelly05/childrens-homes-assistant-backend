'use client'

import { DEMO_HOMES } from '@/lib/admin-command-centre/demo-data'

import { AdminActionButton, AdminTableShell } from './admin-action-button'
import { AdminSectionCard } from './admin-section-card'
import { AdminStatusBadge } from './admin-status-badge'

export function HomesPanel() {
  return (
    <AdminSectionCard
      eyebrow="Homes"
      title="Registered homes"
      description="Children's home registrations, managers and station activity — operational metadata only."
    >
      <AdminTableShell
        headers={[
          'Home',
          'Provider',
          'Manager',
          'Status',
          'Users',
          'Stations',
          'Onboarding',
          'Risk',
          'Actions'
        ]}
      >
        {DEMO_HOMES.map((home) => (
          <tr key={home.id} className="hover:bg-white/[0.02]">
            <td className="px-4 py-3 font-semibold text-white">{home.name}</td>
            <td className="px-4 py-3 text-slate-400">{home.provider}</td>
            <td className="px-4 py-3 text-slate-300">{home.registeredManager}</td>
            <td className="px-4 py-3">
              <AdminStatusBadge status={home.status} />
            </td>
            <td className="px-4 py-3 text-slate-300">{home.usersCount}</td>
            <td className="px-4 py-3 text-slate-400">{home.activeStations.join(', ')}</td>
            <td className="px-4 py-3 text-slate-400">{home.onboardingStatus}</td>
            <td className="px-4 py-3">
              {home.riskFlags.length ? (
                home.riskFlags.map((flag) => (
                  <AdminStatusBadge key={flag} status="high">
                    {flag}
                  </AdminStatusBadge>
                ))
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                <AdminActionButton kind="assign-manager" />
                <AdminActionButton kind="disable-home" />
              </div>
            </td>
          </tr>
        ))}
      </AdminTableShell>
    </AdminSectionCard>
  )
}
