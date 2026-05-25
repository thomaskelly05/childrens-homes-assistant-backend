import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { StaffAccessControls } from '@/components/settings/staff-access-controls'
import { getWorkforceDashboard, getWorkforceNavigation } from '@/lib/os-api/workforce'

export default async function StaffPage() {
  const dashboardResult = await getWorkforceDashboard()
  const navigationResult = await getWorkforceNavigation()
  const dashboard = dashboardResult.data
  const modules = navigationResult.data.modules
  const staff = dashboard.training.matrix.map((row) => row.staff)
  const enabledModules = modules.filter((item) => item.enabled)
  const hiddenModules = modules.filter((item) => !item.enabled)
  const intelligence = dashboard.intelligence
  const health = intelligence?.risk?.home_health
  const quality = intelligence?.recording_quality?.home_trends
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adults / Staff"
        title="Workforce dashboard"
        description="Manager-facing Reg 13 view of supervision, training, probation, safer recruitment, wellbeing, staffing sufficiency, recording quality and inspection evidence. Open a staff member for their adult working-life profile."
        action={<Link href="/staff/all" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">All staff</Link>}
      />
      <LiveDataStatus result={dashboardResult} />
      <StaffAccessControls />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Visible staff" value={dashboard.staff_count} detail="Returned by Workforce Journey OS" />
        <StatCard label="Training due / expired" value={(dashboard.training.summary.due || 0) + (dashboard.training.summary.expired || 0)} detail="Mandatory role matrix" href="/staff/training-matrix" />
        <StatCard label="Supervisions" value={dashboard.supervision.records.length} detail="Draft, submit, review, return, archive" href="/staff/supervision" />
        <StatCard label="Inspection evidence" value={dashboard.evidence.items.length} detail="Reg 13 and SCCIF leadership links" href="/staff/evidence" />
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Workforce health" value={health?.score ?? 'n/a'} detail={health?.level ? `Home health is ${health.level}` : 'Risk engine waiting for records'} href="/staff/risk" />
        <StatCard label="Practice quality" value={quality?.average_score ?? 'n/a'} detail={`${quality?.records_reviewed ?? 0} recordings reviewed`} href="/staff/recording-quality" />
        <StatCard label="Chronology events" value={intelligence?.chronology?.summary?.total ?? 0} detail="Supervision, training, concerns and evidence" href="/staff/command-centre" />
        <StatCard label="Relational indicators" value={intelligence?.relationships?.home_view?.tracked_relationships ?? 0} detail="Consistency and relational safety" href="/staff/relationships" />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {dashboard.alerts.map((alert) => (
          <Card key={alert.id} className={alert.count ? 'ring-amber-100' : ''}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{alert.severity}</p>
                <h2 className="mt-2 text-lg font-black tracking-[-0.03em] text-slate-950">{alert.label}</h2>
              </div>
              <StatusBadge value={alert.count ? `${alert.count} open` : 'clear'} />
            </div>
          </Card>
        ))}
      </section>
      <Card>
        <SectionHeader eyebrow="Adults / Staff menu" title="Workforce operating system" description="Incomplete modules stay feature-flagged until their workflows are safe to expose." />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {enabledModules.map((item) => (
            <Link key={item.id} href={item.href} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 transition hover:bg-blue-100">{item.label}</Link>
          ))}
          {hiddenModules.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-400" title={item.reason || undefined}>{item.label}</div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Dashboard detail" title="Staff team" description="Each staff profile opens the adult working-life dashboard (shift, actions, training, supervision, probation, handover, wellbeing and workforce journey) with safe summaries only." />
        <DataTable
          headers={['Name', 'Role', 'Status', 'Open profile', 'Inspection evidence']}
          rows={staff.map((member) => [
            <Link key={member.id} href={`/staff/${encodeURIComponent(member.id)}`} className="font-black text-slate-950 hover:text-blue-700">{member.title}</Link>,
            member.role || member.raw?.role || 'Role not returned',
            <StatusBadge key="status" value={member.status || 'active'} />,
            <div key="queues" className="flex flex-wrap gap-2">
              <Link href={`/staff/${encodeURIComponent(member.id)}`} className="font-bold text-blue-700">Adult working-life profile</Link>
              <Link href={`/staff/${encodeURIComponent(member.id)}/workspace`} className="font-bold text-blue-700">Workspace</Link>
            </div>,
            'Reg 13 and SCCIF leadership and management'
          ])}
          empty={<EmptyState title="No staff found" description="No staff records match your current filters." />}
        />
      </Card>
    </div>
  )
}
