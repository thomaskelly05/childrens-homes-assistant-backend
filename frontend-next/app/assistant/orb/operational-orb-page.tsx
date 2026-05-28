import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OrbConversationExperience } from '@/components/orb-operational/orb-conversation-experience'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'

export default async function OperationalOrbPage({
  searchParams
}: {
  searchParams: Promise<{
    scope?: string
    young_person_id?: string
    home_id?: string
    mode?: string
    q?: string
    prompt?: string
    context?: string
    voice?: string
  }>
}) {
  const query = await searchParams
  const childrenResult = await getServerOsYoungPeople()
  const voiceMode = query.voice === '1'
  const initialScope =
    query.scope || (query.context === 'child' ? 'child' : query.context === 'home' ? 'home' : undefined)

  return (
    <main
      data-testid="orb-operational-mobile-layout"
      className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34rem),linear-gradient(180deg,#f8fafc,#eef6ff)] px-4 py-5 pb-[calc(120px+env(safe-area-inset-bottom))] text-slate-950 md:px-10 md:py-8 md:pb-10"
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <LiveDataStatus result={childrenResult} />

        <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-white shadow-xl shadow-blue-100/40">
          <div className="bg-[linear-gradient(135deg,#0f172a,#1e3a8a,#2563eb)] px-6 py-6 text-white md:px-8">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-200">
              IndiCare OS ORB
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-[-0.06em] md:text-5xl">
                  Operational cognition
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-blue-100">
                  Uses permissioned OS and CareHub context — records, chronology, dashboards and young person scope when authorised. For standalone recording help without OS records, use{' '}
                  <a href="/orb" className="underline decoration-blue-200/80 underline-offset-4">
                    ORB Care Companion
                  </a>
                  .
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
                  Runtime mode
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {voiceMode ? 'Voice-first operational cognition' : 'Typed operational cognition'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <OrbConversationExperience
          childrenOptions={childrenResult.data}
          initialScope={initialScope}
          initialYoungPersonId={query.young_person_id}
          initialHomeId={query.home_id}
          initialOperationalMode={query.mode}
          initialPrompt={query.q || query.prompt || (query.context ? `Review the ${query.context.replaceAll('-', ' ')} context.` : undefined)}
        />
      </div>
    </main>
  )
}
