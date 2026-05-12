import { OSShell } from '@/components/os-shell'
import { ChronologyWorkspace } from '@/components/chronology-workspace'
import { ContextRail } from '@/components/context-rail'
import { OverviewMetrics } from '@/components/overview-metrics'
import { loadChronologyContext } from '@/lib/api'

export default async function HomePage() {
  const context = await loadChronologyContext()

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <OSShell rail={<ContextRail />}>
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              Children&apos;s home OS
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-slate-950">
              Today
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Live chronology and operational recording for the current young person.
            </p>
          </section>

          <OverviewMetrics />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ChronologyWorkspace records={context.records.slice(0, 12)} />
            <ContextRail />
          </div>
        </div>
      </OSShell>
    </main>
  )
}
