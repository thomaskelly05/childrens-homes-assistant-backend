import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceProbation } from '@/lib/os-api/workforce'

export default async function ProbationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams
  const result = await getWorkforceProbation(query.staff_id)
  const probation = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adults / Staff"
        title="Probation"
        description="1 month, 3 month and 6 month probation review support with manager sign-off and support actions when concerns are raised."
        action={<Link href="/staff" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Staff dashboard</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Reviews" value={probation.reviews.length} detail="Probation review records" />
        <StatCard label="Milestones" value={probation.milestones.length} detail="1, 3 and 6 month support" />
        <StatCard label="Support actions" value={probation.support_actions.length} detail="Concerns raised" />
      </section>
      <Card>
        <SectionHeader eyebrow="Milestones" title="Probation review support" />
        <DataTable
          headers={['Milestone', 'Status', 'Manager sign-off']}
          rows={probation.milestones.map((item: any) => [
            item.label,
            <StatusBadge key="status" value={String(item.status || 'missing')} />,
            item.manager_sign_off_required ? 'Required' : 'Not required'
          ])}
          empty={<EmptyState title="No probation milestones returned" description="The service did not return probation milestone records." />}
        />
      </Card>
      <Card>
        <SectionHeader eyebrow="Reviews" title="Review records and support actions" />
        <DataTable
          headers={['Milestone', 'Review date', 'Status', 'Concerns']}
          rows={probation.reviews.map((review: any) => [
            review.milestone || review.review_type || 'Probation review',
            review.review_date || 'Not returned',
            <StatusBadge key="status" value={String(review.status || 'recorded')} />,
            review.concerns_raised ? 'Support action required' : 'No concerns returned'
          ])}
          empty={<EmptyState title="No probation reviews returned" description="Record 1, 3 and 6 month reviews to evidence probation support." />}
        />
      </Card>
    </div>
  )
}
