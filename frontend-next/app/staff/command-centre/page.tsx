import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { CognitionPromptStack, OperationalBarChart, OperationalSignalGrid, WellbeingRing } from '@/components/indicare/operational-cognition-widgets'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceCommandCentre } from '@/lib/os-api/workforce'
import { valueFromRecord } from '@/lib/operational/cognition-metrics'

export default async function WorkforceCommandCentrePage() {
  const result = await getWorkforceCommandCentre()
  const centre = result.data
  const staffingLevel = valueFromRecord(centre.staffing_instability || {}, ['level', 'status', 'risk_level'], centre.alerts.length ? 'Review' : 'Stable')
  const workforceSignals = [
    { label: 'Workload posture', value: staffingLevel, detail: `${centre.alerts.length} workforce alert${centre.alerts.length === 1 ? '' : 's'}`, tone: centre.alerts.length ? 'amber' as const : 'emerald' as const },
    { label: 'Staffing consistency', value: valueFromRecord(centre.staffing_instability || {}, ['consistency', 'score'], centre.practice_concerns.length ? 'Review' : 'Stable'), detail: 'From Workforce OS staffing instability', tone: 'blue' as const },
    { label: 'Wellbeing prompts', value: centre.wellbeing_alerts.length, detail: 'Support indicators for leadership visibility', tone: centre.wellbeing_alerts.length ? 'amber' as const : 'emerald' as const },
    { label: 'Recognition', value: centre.recognition.length, detail: 'Positive evidence returned by Workforce OS', tone: 'purple' as const }
  ]
  const pressureData = [
    { label: 'Alerts', value: centre.alerts.length },
    { label: 'Practice', value: centre.practice_concerns.length },
    { label: 'Wellbeing', value: centre.wellbeing_alerts.length },
    { label: 'Recognition', value: centre.recognition.length }
  ]

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
      <OperationalSignalGrid signals={workforceSignals} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OperationalBarChart title="Workforce pressure and support" data={pressureData} />
        <div className="grid gap-4">
          <WellbeingRing label="Workforce support" value={Math.max(0, 100 - centre.wellbeing_alerts.length * 14 - centre.practice_concerns.length * 8)} detail={`${centre.wellbeing_alerts.length} wellbeing alert${centre.wellbeing_alerts.length === 1 ? '' : 's'}`} tone={centre.wellbeing_alerts.length ? 'amber' : 'emerald'} />
          <WellbeingRing label="Practice consistency" value={Math.max(0, 100 - centre.alerts.length * 10)} detail={`${centre.alerts.length} open alert${centre.alerts.length === 1 ? '' : 's'}`} tone="blue" />
        </div>
      </section>
      <CognitionPromptStack
        title="Reflective supervision prompts"
        prompts={[
          'What is the impact of current workload posture on consistency for children?',
          'Which staff member may need relational support before performance support?',
          'What should leadership notice about recognition, wellbeing and recording quality?',
          'Which workforce evidence would strengthen SCCIF leadership visibility?'
        ]}
        action={<Link href="/orb?scope=workforce" className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Ask ORB</Link>}
      />
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
