import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceRisk } from '@/lib/os-api/workforce'

export default async function WorkforceRiskPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams
  const result = await getWorkforceRisk(query.staff_id)
  const risk = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce Intelligence"
        title="Workforce risk"
        description="Operational risk scoring for overdue supervisions, expired training, staffing instability, incidents, wellbeing indicators and practice concerns."
        action={<Link href="/staff/command-centre" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Command centre</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Home health" value={risk.home_health?.score ?? 'n/a'} detail={String(risk.home_health?.level || 'No level returned')} />
        <StatCard label="High risk staff" value={risk.home_health?.high_risk_staff ?? 0} detail="High or critical scores" />
        <StatCard label="Staff scored" value={risk.home_health?.staff_count ?? risk.staff_risks.length} detail="Visible workforce records" />
        <StatCard label="Alerts" value={risk.alerts.length} detail="Manager review required" />
      </section>
      <Card>
        <SectionHeader eyebrow="Risk engine" title="Staff operational risk scores" description="Scores remain reusable for inspection, reporting and ORB context." />
        <DataTable
          headers={['Staff', 'Score', 'Level', 'Signals']}
          rows={risk.staff_risks.map((item) => [
            item.staff?.title || item.staff?.name || `Staff #${item.staff?.id || 'unknown'}`,
            String(item.score ?? 'n/a'),
            <StatusBadge key="level" value={String(item.level || 'unknown')} />,
            JSON.stringify(item.signals || {})
          ])}
          empty={<EmptyState title="No workforce risk scores" description="Risk scoring needs staff, supervision and training records to produce a view." />}
        />
      </Card>
    </div>
  )
}
