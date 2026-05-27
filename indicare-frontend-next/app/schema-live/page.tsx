import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader, StatCard } from '@/components/indicare/ui'
import { getSchemaLiveResources } from '@/lib/os-api/schema-live'

function groupByDomain(resources: Awaited<ReturnType<typeof getSchemaLiveResources>>['data']) {
  return resources.reduce<Record<string, typeof resources>>((groups, resource) => {
    const domain = resource.regulatory_context?.domain || 'operations'
    groups[domain] = groups[domain] || []
    groups[domain].push(resource)
    return groups
  }, {})
}

export default async function SchemaLivePage() {
  const resources = await getSchemaLiveResources()
  const byDomain = groupByDomain(resources.data)
  const restricted = resources.data.filter((resource) => resource.restricted).length
  const childCentred = resources.data.filter((resource) => resource.regulatory_context?.active_child_only).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live schema"
        title="Regulated live endpoint coverage"
        description="Every public schema resource is discoverable through a live API endpoint, grouped against children's homes regulations, Quality Standards and SCCIF areas. Demo data is not used here."
      />
      <LiveDataStatus result={resources} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Live resources" value={resources.data.length} detail="Tables, views and materialised views" />
        <StatCard label="Child-centred" value={childCentred} detail="Resources with young person context" />
        <StatCard label="Manager restricted" value={restricted} detail="Leadership or sensitive resources" />
        <StatCard label="Domains" value={Object.keys(byDomain).length} detail="Regulatory groupings" />
      </section>
      <section className="space-y-5">
        {Object.entries(byDomain).map(([domain, items]) => (
          <article key={domain} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{domain.replaceAll('_', ' ')}</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">{items[0]?.regulatory_context?.quality_standard || 'Operational records'}</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">SCCIF: {items[0]?.regulatory_context?.sccif_area || 'leadership and management'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">{items.length} endpoints</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.slice(0, 36).map((resource) => (
                <Link key={resource.name} href={`/schema-live/${resource.name}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-[1px] hover:bg-white hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="break-words text-sm font-black text-slate-900">{resource.name}</h3>
                    {resource.restricted ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">Restricted</span> : null}
                  </div>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{resource.relation_type}</p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">{resource.regulatory_context.regulations.join(', ')}</p>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
