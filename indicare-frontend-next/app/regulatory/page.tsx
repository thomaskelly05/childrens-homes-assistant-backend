import Link from 'next/link'

import { Card, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { frameworkLabel, getRegulatoryReferences } from '@/lib/regulatory-framework/selectors'
import { RegulatoryFramework } from '@/lib/regulatory-framework/types'

const frameworks: RegulatoryFramework[] = ['children_homes_regulations_2015', 'quality_standards', 'sccif', 'reg44', 'reg45', 'lac_review', 'ofsted_evidence']

export default function RegulatoryFrameworkPage() {
  const references = getRegulatoryReferences()

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Regulatory framework" title="Operational regulatory alignment layer" description="Children's home regulations, Quality Standards, SCCIF judgement areas and report evidence expectations mapped to records, chronology, actions and evidence. This supports operational alignment and does not provide legal advice." />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="References" value={references.length} />
        <StatCard label="Children Homes regs" value={getRegulatoryReferences('children_homes_regulations_2015').length} />
        <StatCard label="Quality Standards" value={getRegulatoryReferences('quality_standards').length} />
        <StatCard label="SCCIF areas" value={getRegulatoryReferences('sccif').length} />
      </section>
      {frameworks.map((framework) => {
        const items = getRegulatoryReferences(framework)
        if (!items.length) return null
        return (
          <Card key={framework}>
            <SectionHeader eyebrow={frameworkLabel(framework)} title={`${items.length} operational references`} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((reference) => (
                <Link key={reference.id} href={`/regulatory/${reference.id}`} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{reference.code}</span>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{reference.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{reference.plainEnglish}</p>
                </Link>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
