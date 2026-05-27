import Link from 'next/link'

import { AlertCard, Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'

type EvidenceItem = {
  id: string
  type: string
  title: string
  date: string
  summary: string
}

type GuidanceItem = {
  title: string
  body: string
  evidence: EvidenceItem[]
}

export function RiskIntelligenceHeader({
  eyebrow,
  title,
  description,
  youngPersonId
}: {
  eyebrow: string
  title: string
  description: string
  youngPersonId: string
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={<Link href={`/young-people/${youngPersonId}`} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Back to record</Link>}
    />
  )
}

export function CalmIntelligenceGrid({ items }: { items: GuidanceItem[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {items.map((item) => (
        <article key={item.title} className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <StatusBadge value="review recommended" />
          <h3 className="mt-4 text-lg font-black text-slate-950">{item.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.evidence.length ? `${item.evidence.length} evidence link(s)` : 'no evidence found'}</p>
        </article>
      ))}
    </div>
  )
}

export function EvidenceTable({ evidence }: { evidence: EvidenceItem[] }) {
  return (
    <DataTable
      headers={['Date', 'Type', 'Evidence', 'Summary']}
      rows={evidence.map((item) => [item.date, item.type, item.title, item.summary])}
      empty={<EmptyState title="No scoped evidence" description="No visible records match this intelligence view." />}
    />
  )
}

export function PromptList({ prompts }: { prompts: string[] }) {
  return (
    <div className="space-y-3">
      {prompts.map((prompt) => <AlertCard key={prompt} title="Human review prompt" body={prompt} />)}
    </div>
  )
}

export function RiskIntelligenceShell({
  stats,
  primary,
  prompts,
  evidence,
  children
}: {
  stats: Array<{ label: string; value: string | number; detail: string }>
  primary: GuidanceItem[]
  prompts: string[]
  evidence: EvidenceItem[]
  children?: React.ReactNode
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => <StatCard key={item.label} label={item.label} value={item.value} detail={item.detail} />)}
      </section>
      <Card>
        <SectionHeader eyebrow="Evidence-led support" title="Current review picture" description="Records indicate, pattern suggests and review recommended language keeps this as decision support." />
        <CalmIntelligenceGrid items={primary} />
      </Card>
      {children}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <SectionHeader eyebrow="Scoped chronology" title="Evidence links" />
          <EvidenceTable evidence={evidence} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Manager oversight" title="Review prompts" />
          <PromptList prompts={prompts} />
        </Card>
      </section>
    </>
  )
}
