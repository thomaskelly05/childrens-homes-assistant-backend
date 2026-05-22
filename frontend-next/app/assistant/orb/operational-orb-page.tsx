import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OrbConversationExperience } from '@/components/orb-operational/orb-conversation-experience'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'

export default async function OperationalOrbPage({
  searchParams
}: {
  searchParams: Promise<{ scope?: string; young_person_id?: string; q?: string; prompt?: string; context?: string; voice?: string }>
}) {
  const query = await searchParams
  const childrenResult = await getServerOsYoungPeople()
  const voiceMode = query.voice === '1'

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34rem),linear-gradient(180deg,#f8fafc,#eef6ff)] px-5 py-8 text-slate-950 md:px-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <LiveDataStatus result={childrenResult} />

        <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-white shadow-xl shadow-blue-100/40">
          <div className="bg-[linear-gradient(135deg,#0f172a,#1e3a8a,#2563eb)] px-6 py-6 text-white md:px-8">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-200">
              OS ORB Runtime
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-[-0.06em] md:text-5xl">
                  One operational cognition system
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-blue-100">
                  ORB can help with IndiCare OS work and everyday questions. Care questions use scoped records, citations and review guardrails; general, web and productivity questions do not pretend to use care records.
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
          initialScope={query.scope}
          initialYoungPersonId={query.young_person_id}
          initialPrompt={query.q || query.prompt || (query.context ? `Review the ${query.context.replaceAll('-', ' ')} context.` : undefined)}
        />
      </div>
    </main>
  )
}
