import { OSShell } from '@/components/os-shell'
import { ChronologyWorkspace } from '@/components/chronology-workspace'
import { ContextRail } from '@/components/context-rail'
import { OverviewMetrics } from '@/components/overview-metrics'
import { WorkspaceHeader } from '@/components/workspace-header'
import { AssistantPanel } from '@/components/assistant-panel'
import { loadChronologyContext } from '@/lib/api'

export default async function HomePage() {
  const context = await loadChronologyContext()

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <OSShell rail={<ContextRail />}>
        <div className="mx-auto max-w-6xl space-y-6">
          <WorkspaceHeader />

          <OverviewMetrics />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ChronologyWorkspace records={context.records.slice(0, 12)} />

            <div className="space-y-6">
              <ContextRail />
              <AssistantPanel />
            </div>
          </div>
        </div>
      </OSShell>
    </main>
  )
}
