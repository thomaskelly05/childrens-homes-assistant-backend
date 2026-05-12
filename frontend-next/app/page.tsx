import { OSShell } from '@/components/os-shell'
import { ChronologyWorkspace } from '@/components/chronology-workspace'
import { ContextRail } from '@/components/context-rail'
import { OverviewMetrics } from '@/components/overview-metrics'
import { WorkspaceHeader } from '@/components/workspace-header'
import { AssistantPanel } from '@/components/assistant-panel'
import { WorkspaceTabs } from '@/components/workspace-tabs'
import { OperationalStatusBar } from '@/components/operational-status-bar'
import { CommandCentrePanel } from '@/components/command-centre-panel'
import { LiveAlertsPanel } from '@/components/live-alerts-panel'
import { NotificationCentre } from '@/components/notification-centre'
import { RecentActivityFeed } from '@/components/recent-activity-feed'
import { SystemHealthPanel } from '@/components/system-health-panel'
import { loadChronologyContext } from '@/lib/api'

export default async function HomePage() {
  const context = await loadChronologyContext()

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <OSShell rail={<ContextRail />}>
        <div className="mx-auto max-w-6xl space-y-6">
          <WorkspaceHeader />

          <OperationalStatusBar />

          <WorkspaceTabs />

          <OverviewMetrics />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <ChronologyWorkspace records={context.records.slice(0, 12)} />
              <RecentActivityFeed />
            </div>

            <div className="space-y-6">
              <ContextRail />
              <AssistantPanel />
              <CommandCentrePanel />
              <LiveAlertsPanel />
              <NotificationCentre />
              <SystemHealthPanel />
            </div>
          </div>
        </div>
      </OSShell>
    </main>
  )
}
