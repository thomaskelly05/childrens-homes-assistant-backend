import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceCommandCentre } from '@/lib/os-api/workforce'

export default async function WorkforceCommandCentrePage() {
  const result = await getWorkforceCommandCentre()
  const centre = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce Intelligence"
        title="Workforce command centre"
        description="Role-aware manager view of workforce alerts, practice concerns, wellbeing, staffing instability, recognition and inspection readiness."
        action={<Link href="/staff" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Staff dashboard</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Role scope" value={centre.role_scope || 'self'} detail="Backend role-aware visibility" />
        <StatCard label="Open alerts" value={centre.alerts.length} detail="Risk, quality and incident signals" />
        <StatCard label="Wellbeing alerts" value={centre.wellbeing_alerts.length} detail="Workforce support indicators" />
        <StatCard label="Recognition" value={centre.recognition.length} detail="Positive workforce evidence" />
      </section>
      <Card>
        <SectionHeader eyebrow="Live alerts" title="Operational workforce alerts" description="Combines workforce risk, recording quality, wellbeing and practice concern signals." />
        <DataTable
          headers={['Type', 'Severity', 'Title', 'Detail']}
          rows={centre.alerts.map((alert) => [
            String(alert.type || 'alert'),
            <StatusBadge key="severity" value={String(alert.severity || 'info')} />,
            String(alert.title || 'Workforce alert'),
            JSON.stringify(alert.detail || {})
          ])}
          empty={<EmptyState title="No workforce alerts" description="No command centre alerts were returned for the current role and home." />}
        />
      </Card>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Staffing stability" title="Home workforce health" />
          <DataTable
            headers={['Signal', 'Value']}
            rows={Object.entries(centre.staffing_instability || {}).map(([key, value]) => [key.replaceAll('_', ' '), String(value)])}
            empty={<EmptyState title="No staffing health returned" description="The risk engine did not return a home health score." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Inspection" title="Workforce evidence readiness" />
          <p className="text-sm leading-7 text-slate-600">{String(centre.inspection_readiness?.summary || 'No inspection readiness summary returned.')}</p>
        </Card>
      </section>
    </div>
  )
}
