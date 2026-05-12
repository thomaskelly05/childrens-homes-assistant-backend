import { OSShell } from '@/components/os-shell'
import { ContextRail } from '@/components/context-rail'
import { WorkspaceHeader } from '@/components/workspace-header'
import { AssistantPanel } from '@/components/assistant-panel'
import { WorkspaceTabs } from '@/components/workspace-tabs'
import { OperationalStatusBar } from '@/components/operational-status-bar'
import { CommandCentrePanel } from '@/components/command-centre-panel'
import { LiveAlertsPanel } from '@/components/live-alerts-panel'
import { NotificationCentre } from '@/components/notification-centre'
import { SystemHealthPanel } from '@/components/system-health-panel'
import { CareOperatingStream } from '@/components/care-operating-stream'
import { loadChronologyContext } from '@/lib/api'

export default async function HomePage() {
  const context = await loadChronologyContext()

  return (
    <main className="min-h-screen bg-[#f3f6fb] text-slate-900">
      <OSShell rail={<ContextRail />}>
        <div className="mx-auto max-w-7xl space-y-6 px-2">
          <WorkspaceHeader />

          <OperationalStatusBar />

          <WorkspaceTabs />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <CareOperatingStream records={context.records} />
            </div>

            <div className="space-y-5">
              <AssistantPanel />
              <LiveAlertsPanel />
              <NotificationCentre />
              <CommandCentrePanel />
              <SystemHealthPanel />
            </div>
          </div>
        </div>
      </OSShell>
    </main>
  )
}
