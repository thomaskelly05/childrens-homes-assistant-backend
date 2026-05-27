import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard } from '@/components/indicare/ui'
import { getWorkforceDashboard } from '@/lib/os-api/workforce'

export default async function StaffEvidencePage() {
  const result = await getWorkforceDashboard()
  const evidence = result.data.evidence

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adults / Staff"
        title="Staff evidence"
        description="Inspection-ready workforce evidence linking staff records to Reg 13 and SCCIF leadership and management."
        action={<Link href="/staff/evidence/new" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Create evidence</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Evidence items" value={evidence.items.length} detail="Workforce evidence table" />
        <StatCard label="Regulation links" value={evidence.regulation_links.length} detail="Reg 13 and SCCIF" />
        <StatCard label="Inspection area" value="Leadership" detail="SCCIF leadership and management" />
      </section>
      <Card>
        <SectionHeader eyebrow="Evidence engine" title="Inspection readiness links" description="Staff evidence is linked through the same OS evidence/audit path used by existing documents, tasks and workflow review where the tables are present." />
        <DataTable
          headers={['Title', 'Type', 'Staff', 'Summary']}
          rows={evidence.items.map((item: any) => [
            item.title || 'Workforce evidence',
            item.evidence_type || item.source_table || 'staff evidence',
            item.staff_id || 'Not returned',
            item.summary || 'No summary returned'
          ])}
          empty={<EmptyState title="No workforce evidence returned" description="Create staff evidence or complete supervision/training/probation workflows to populate inspection readiness." />}
        />
      </Card>
    </div>
  )
}
