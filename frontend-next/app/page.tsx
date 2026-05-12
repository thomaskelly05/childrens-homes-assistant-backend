import { OperationalSidebar } from '@/components/operational-sidebar'
import { AssistantPanel } from '@/components/assistant-panel'
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
      <div className="grid min-h-screen xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <OperationalSidebar />

        <section className="border-r border-slate-200/70 px-6 py-6 xl:px-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
                Oak House · Evening shift
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.07em] text-slate-950">
                Jamie&apos;s journey
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-500">
                Live care operating stream combining chronology, safeguarding, assistant insights, continuity and operational oversight.
              </p>
            </div>

            <CareOperatingStream records={context.records} />
          </div>
        </section>

        <aside className="space-y-5 bg-[#f7f9fc] px-5 py-6">
          <AssistantPanel />
          <LiveAlertsPanel />
          <NotificationCentre />
          <CommandCentrePanel />
          <SystemHealthPanel />
        </aside>
      </div>
    </main>
  )
}
