import { InspectionReadinessWorkspace } from '@/components/inspection-readiness/inspection-readiness-workspace'

export default function InspectionReadinessPage() {
  return (
    <main
      data-testid="inspection-readiness-page"
      className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6"
    >
      <header className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
          Intelligence
        </p>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Inspection readiness</h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Prepare Reg 44, Reg 45 and SCCIF evidence support packs using safe operational evidence. This
          does not predict inspection outcomes or determine compliance.
        </p>
      </header>
      <InspectionReadinessWorkspace />
    </main>
  )
}
