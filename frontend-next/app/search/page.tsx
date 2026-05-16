import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getOperationalSearch } from '@/lib/os-api/platform'

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; young_person_id?: string; state_type?: string; safeguarding?: string; evidence_gaps?: string; regulation?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''
  const result = await getOperationalSearch({
    query,
    young_person_id: params.young_person_id,
    state_type: params.state_type,
    unresolved_only: true,
    safeguarding_relevant: params.safeguarding === 'true',
    evidence_gaps_only: params.evidence_gaps === 'true',
    regulation: params.regulation,
    limit: 50
  })
  const results = result.data.results

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Unified search"
        title="Operational intelligence lookup"
        description="Search across operational states, chronology, safeguarding, documents, evidence and actions using one backend contract."
      />
      <LiveDataStatus result={result} />
      <Card>
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]" action="/search">
          <input name="q" defaultValue={query} placeholder="Search operational states, evidence, chronology or regulations" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-100" />
          <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Search</button>
        </form>
      </Card>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Results" value={results.length} detail="Unified operational results" />
        <StatCard label="Operational states" value={results.filter((item) => item.resultType === 'operational_state').length} detail="Review indicators" />
        <StatCard label="Evidence linked" value={results.filter((item) => item.evidenceLinks.length).length} detail="Evidence relationships visible" />
        <StatCard label="Regulation mapped" value={results.filter((item) => item.regulationRelevance.length).length} detail="Regulatory relevance visible" />
      </section>
      <Card>
        <SectionHeader eyebrow="Results" title="Unified operational results" description="Results use cautious language and link back to source workspaces where available." />
        <DataTable
          headers={['Result', 'Type', 'Priority', 'Why']}
          rows={results.map((item) => [
            item.href ? <Link key={item.id} href={item.href} className="font-black text-slate-950 hover:text-blue-700">{item.title}</Link> : item.title,
            item.resultType.replaceAll('_', ' '),
            <StatusBadge key={item.id} value={item.priority} />,
            item.summary
          ])}
          empty={<EmptyState title={query ? 'No matching operational results' : 'Search to begin'} description="Use a child, evidence, safeguarding, regulation or workflow term to search operational records." />}
        />
      </Card>
    </div>
  )
}
