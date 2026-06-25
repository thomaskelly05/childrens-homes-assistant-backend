'use client'

import { useState } from 'react'

import { AbuseBotsPanel } from '@/components/admin-command-centre/abuse-bots-panel'
import { AdminCommandCentreShell } from '@/components/admin-command-centre/admin-command-centre-shell'
import { AdminOverviewPanel } from '@/components/admin-command-centre/admin-overview-panel'
import { AuditLogPanel } from '@/components/admin-command-centre/audit-log-panel'
import { HomesPanel } from '@/components/admin-command-centre/homes-panel'
import { LiveUsagePanel } from '@/components/admin-command-centre/live-usage-panel'
import { MarketingPanel } from '@/components/admin-command-centre/marketing-panel'
import { OffboardingPanel } from '@/components/admin-command-centre/offboarding-panel'
import { OnboardingPanel } from '@/components/admin-command-centre/onboarding-panel'
import { ProvidersPanel } from '@/components/admin-command-centre/providers-panel'
import { SafetyFlagsPanel } from '@/components/admin-command-centre/safety-flags-panel'
import { SettingsPanel } from '@/components/admin-command-centre/settings-panel'
import { SupportPanel } from '@/components/admin-command-centre/support-panel'
import { UsersPanel } from '@/components/admin-command-centre/users-panel'
import type { AdminSectionId } from '@/lib/admin-command-centre/types'

function AdminSectionPanel({ section }: { section: AdminSectionId }) {
  switch (section) {
    case 'overview':
      return <AdminOverviewPanel />
    case 'users':
      return <UsersPanel />
    case 'providers':
      return <ProvidersPanel />
    case 'homes':
      return <HomesPanel />
    case 'live-usage':
      return <LiveUsagePanel />
    case 'safety-flags':
      return <SafetyFlagsPanel />
    case 'abuse-bots':
      return <AbuseBotsPanel />
    case 'onboarding':
      return <OnboardingPanel />
    case 'offboarding':
      return <OffboardingPanel />
    case 'marketing':
      return <MarketingPanel />
    case 'support':
      return <SupportPanel />
    case 'audit-log':
      return <AuditLogPanel />
    case 'settings':
      return <SettingsPanel />
    default:
      return <AdminOverviewPanel />
  }
}

export function AdminCommandCentrePage() {
  const [activeSection, setActiveSection] = useState<AdminSectionId>('overview')

  return (
    <AdminCommandCentreShell activeSection={activeSection} onSectionChange={setActiveSection}>
      <div data-testid={`admin-panel-${activeSection}`}>
        <AdminSectionPanel section={activeSection} />
      </div>
    </AdminCommandCentreShell>
  )
}
