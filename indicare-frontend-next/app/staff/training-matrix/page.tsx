import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceTrainingMatrix } from '@/lib/os-api/workforce'

export default async function TrainingMatrixPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams
  const result = await getWorkforceTrainingMatrix(query.staff_id)
  const matrix = result.data.matrix
  const summary = result.data.summary

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adults / Staff"
        title="Training matrix"
        description="Mandatory training by role, with completed, due, expired and missing statuses, expiry dates and evidence links where returned."
        action={<Link href="/staff" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Staff dashboard</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Completed" value={summary.completed || 0} detail="Current evidence" />
        <StatCard label="Due soon" value={summary.due || 0} detail="Expires within 60 days" />
        <StatCard label="Expired" value={summary.expired || 0} detail="Past expiry date" />
        <StatCard label="Missing" value={summary.missing || 0} detail="No evidence returned" />
      </section>
      <Card>
        <SectionHeader eyebrow="Matrix" title="Role-based mandatory training" description="Provider and manager views share one backend calculation to avoid duplicate compliance logic." />
        <DataTable
          headers={['Staff', 'Role', 'Training', 'Status', 'Expiry', 'Evidence']}
          rows={matrix.flatMap((row) => row.items.map((item) => [
            <Link key="staff" href={`/staff/${encodeURIComponent(row.staff.id)}`} className="font-black text-slate-950 hover:text-blue-700">{row.staff.title}</Link>,
            row.role,
            item.training_name,
            <StatusBadge key="status" value={item.status} />,
            item.expiry_date || 'Not returned',
            item.evidence ? 'Evidence linked' : 'No evidence'
          ]))}
          empty={<EmptyState title="No training matrix returned" description="The backend returned no role requirements or staff training records." />}
        />
      </Card>
    </div>
  )
}
