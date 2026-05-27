import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceInduction } from '@/lib/os-api/workforce'

export default async function InductionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams
  const result = await getWorkforceInduction(query.staff_id)
  const induction = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adults / Staff"
        title="Induction"
        description="Induction checklist and manager sign-off evidence for safer workforce onboarding."
        action={<Link href="/staff" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Staff dashboard</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Completed" value={induction.completed || 0} detail="Checklist items signed off" />
        <StatCard label="Total items" value={induction.total || 0} detail="Checklist records returned" />
        <StatCard label="Completion" value={induction.completion_percent === null ? 'N/A' : `${induction.completion_percent}%`} detail="Calculated from returned items" />
      </section>
      <Card>
        <SectionHeader eyebrow="Checklist" title="Induction evidence" description="Direct observations, home induction and required onboarding evidence appear here when records exist." />
        <DataTable
          headers={['Item', 'Category', 'Due', 'Status', 'Sign-off']}
          rows={(induction.items || []).map((item: any) => [
            item.title || 'Induction item',
            item.category || 'General',
            item.due_date || 'Not set',
            <StatusBadge key="status" value={String(item.status || 'pending')} />,
            item.signed_off_at ? 'Signed off' : 'Awaiting manager'
          ])}
          empty={<EmptyState title="No induction checklist returned" description="Checklist records are feature-ready but no live rows were returned." />}
        />
      </Card>
    </div>
  )
}
