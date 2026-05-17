import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { PageHeader, StatCard } from '@/components/indicare/ui'
import { getSchemaLiveResource } from '@/lib/os-api/schema-live'

function valuePreview(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 160)
  return String(value).slice(0, 160)
}

export default async function SchemaLiveResourcePage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params
  const result = await getSchemaLiveResource(resource, { limit: 50 })
  const data = result.data
  if (result.source === 'live' && !data.resource) notFound()
  const columns = Array.from(new Set(data.items.flatMap((item) => Object.keys(item)))).slice(0, 8)
  const context = data.regulatory_context

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live schema resource"
        title={resource.replaceAll('_', ' ')}
        description="A live database-backed endpoint. Sensitive fields are redacted, access is scoped, and the resource is tagged against children’s homes regulatory context."
        action={<Link href="/schema-live" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Back to coverage</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Rows loaded" value={data.items.length} detail={`Limit ${data.limit || 50}`} />
        <StatCard label="Relation" value={data.relation_type || 'Resource'} />
        <StatCard label="Domain" value={context.domain.replaceAll('_', ' ')} />
        <StatCard label="SCCIF" value={context.sccif_area} />
      </section>
      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Regulatory alignment</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{context.quality_standard}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">Linked regulations: {context.regulations.join(', ')}. This endpoint should be used as an evidence source for live records, not demo or static data.</p>
      </article>
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">Live records</h2>
          <p className="mt-1 text-sm text-slate-500">Showing the first {columns.length} available safe columns.</p>
        </div>
        {data.items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((column) => <th key={column} className="px-4 py-3 font-black text-slate-500">{column}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item, index) => (
                  <tr key={String(item.id || index)}>
                    {columns.map((column) => <td key={column} className="max-w-[260px] px-4 py-3 align-top text-slate-700">{valuePreview(item[column])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-sm font-semibold text-slate-500">No live records returned for this resource and current access scope.</div>
        )}
      </section>
    </div>
  )
}
