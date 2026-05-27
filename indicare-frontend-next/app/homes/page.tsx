import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { ContextSurface, HomeHeartbeatSurface, WorkspaceStack } from '@/components/indicare/operational-surfaces'
import { EmptyState, SectionHeader } from '@/components/indicare/ui'
import { getWorkspaceBundle, text } from '@/lib/os-api/bundles'

export default async function HomesPage() {
  const result = await getWorkspaceBundle()
  const home = result.data.home || {}
  const homeId = home.id || result.data.identity?.home_id

  return (
    <WorkspaceStack>
      <HomeHeartbeatSurface>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Homes</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.07em] text-slate-950">Home heartbeat</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">Open the real operational heartbeat for homes visible to your provider/home scope.</p>
      </HomeHeartbeatSurface>
      <LiveDataStatus result={result} />
      <ContextSurface>
        <SectionHeader eyebrow="Visible home" title="Your current home" />
        {homeId ? (
          <Link href={`/homes/${encodeURIComponent(String(homeId))}`} className="block rounded-[26px] bg-slate-50 p-6 text-xl font-black tracking-[-0.03em] text-slate-950">
            {text(home, ['name', 'home_name', 'title'], `Home ${homeId}`)}
          </Link>
        ) : (
          <EmptyState title="No home returned" description="Homes will appear here when your authenticated session includes a real home scope." />
        )}
      </ContextSurface>
    </WorkspaceStack>
  )
}
