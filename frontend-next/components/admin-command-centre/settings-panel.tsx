'use client'

import { AdminSectionCard } from './admin-section-card'

const SETTINGS_PLACEHOLDERS = [
  {
    id: 'mfa',
    label: 'Require MFA for admin access',
    value: 'Enabled (placeholder)',
    note: 'Action wiring pending'
  },
  {
    id: 'session-timeout',
    label: 'Admin session timeout',
    value: '8 hours (placeholder)',
    note: 'Action wiring pending'
  },
  {
    id: 'rate-limits',
    label: 'Platform rate limits',
    value: 'Standard tier (placeholder)',
    note: 'Action wiring pending'
  },
  {
    id: 'safety-thresholds',
    label: 'Safety flag thresholds',
    value: 'Default (placeholder)',
    note: 'Action wiring pending'
  },
  {
    id: 'demo-visibility',
    label: 'Demo data visibility',
    value: 'Development mode — placeholder data shown',
    note: 'Controlled by ADMIN_COMMAND_CENTRE_DATA_MODE'
  },
  {
    id: 'admin-roles',
    label: 'Admin role management',
    value: 'Founder/admin only (Phase 1)',
    note: 'Future: dedicated admin roles separate from founder'
  }
]

export function SettingsPanel() {
  return (
    <AdminSectionCard
      eyebrow="Settings"
      title="Admin configuration"
      description="Platform admin settings — placeholders until backend configuration APIs are wired."
    >
      <div className="space-y-3">
        {SETTINGS_PLACEHOLDERS.map((setting) => (
          <div
            key={setting.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4"
            data-testid={`admin-setting-${setting.id}`}
          >
            <div>
              <p className="font-semibold text-white">{setting.label}</p>
              <p className="mt-1 text-sm text-slate-400">{setting.value}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">{setting.note}</span>
          </div>
        ))}
      </div>
    </AdminSectionCard>
  )
}
