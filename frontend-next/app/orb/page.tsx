import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OrbConversationExperience } from '@/components/orb-operational/orb-conversation-experience'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'

export default async function OrbPage({
  searchParams
}: {
  searchParams: Promise<{ scope?: string; young_person_id?: string; q?: string; prompt?: string; context?: string }>
}) {
  const query = await searchParams
  const childrenResult = await getServerOsYoungPeople()

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34rem),linear-gradient(180deg,#f8fafc,#eef6ff)] px-5 py-8 text-slate-950 md:px-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <LiveDataStatus result={childrenResult} />
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
