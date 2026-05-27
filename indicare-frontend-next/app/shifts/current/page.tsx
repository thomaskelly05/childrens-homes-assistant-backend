import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import {
  homeActionsHref,
  homeHandoverHref,
  homeRecordingAlertsHref,
  homeSafeguardingHref,
  homeStaffOnShiftHref,
  homeWorkspaceHref
} from '@/lib/navigation/scope-routes'
import { getCommandCentre } from '@/lib/os-api/platform'

type SearchParams = Promise<{ home_id?: string }>

export default async function CurrentShiftPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const homeId = params.home_id

  if (homeId) {
    const routes = {
      workspace: homeWorkspaceHref(homeId),
      handover: homeHandoverHref(homeId),
      alerts: homeRecordingAlertsHref(homeId),
      safeguarding: homeSafeguardingHref(homeId),
      actions: homeActionsHref(homeId),
      staff: homeStaffOnShiftHref(homeId)
    }

    return (
      <div data-testid="shifts-current-scoped-page" className="space-y-6">
        <PageHeader
          eyebrow="Current shift"
          title="Staff on shift"
          description="Home-scoped shift view. Global command centre data is not loaded — open links below for this home only."
          action={
            <Link prefetch={false} href={routes.workspace} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">
              Home workspace
            </Link>
          }
        />
        <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
          Live workforce roster filtering by home is partial on this route — use Staff profiles and Handover for operational follow-up.
        </p>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Handover" value="—" detail="Scoped handover workspace" href={routes.handover} entity={{ entity_type: 'handover' }} />
          <StatCard label="Recording alerts" value="—" detail="Home-scoped alerts" href={routes.alerts} entity={{ entity_type: 'recording_alert' }} />
          <StatCard label="Actions" value="—" detail="Home-scoped actions" href={routes.actions} entity={{ entity_type: 'action' }} />
        </section>
        <Card>
          <SectionHeader eyebrow="Home scope" title="Shift links" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { label: 'Safeguarding / ISN', href: routes.safeguarding },
              { label: 'Staff', href: routes.staff },
              { label: 'Handover', href: routes.handover },
              { label: 'Recording alerts', href: routes.alerts }
            ].map((item) => (
              <Link
                key={item.label}
                prefetch={false}
                href={item.href}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-800 hover:bg-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const commandResult = await getCommandCentre()
  const command = commandResult.data

  return (
    <div data-testid="shifts-current-page" className="space-y-6">
      <PageHeader
        eyebrow="Current shift"
        title="Current shift"
        description="Provider-wide shift board. For a single home, open Staff on shift from the home workspace to avoid loading unrelated homes."
        action={
          <Link prefetch={false} href="/handover" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">
            Prepare handover
          </Link>
        }
      />
      <LiveDataStatus result={commandResult} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Incidents" value={command.chronology.filter((event) => event.sourceType === 'incident').length} detail="Returned by live chronology" href="/incidents" entity={{ entity_type: 'incident' }} />
        <StatCard label="Safeguarding" value={command.safeguarding.length} detail="Review required, no auto conclusions" href="/safeguarding" entity={{ entity_type: 'safeguarding_concern' }} />
        <StatCard label="Medication records" value={command.chronology.filter((event) => event.sourceType === 'medication').length} detail="Returned by live chronology" href="/medication" entity={{ entity_type: 'medication_record' }} />
        <StatCard label="Open actions" value={command.actions.filter((action) => action.status !== 'completed').length} detail="Actions needing attention" href="/select-scope" entity={{ entity_type: 'action' }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <SectionHeader eyebrow="Priority" title="Operational attention" />
          {command.attention.length ? (
            <div className="space-y-3">
              {command.attention.map((card) => (
                <Link key={card.id} prefetch={false} href={card.href} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm font-black text-slate-950">{card.title}</strong>
                    <StatusBadge value={card.status} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No live attention items" description="No shift priority cards were derived from live OS records." />
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Staff cards" title="Active staff" />
            <div className="space-y-3">
              {command.workforce.length ? (
                command.workforce.map((staff) => (
                  <Link key={staff.id} prefetch={false} href={`/staff/${staff.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-950">{staff.title}</h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">{staff.summary}</p>
                      </div>
                      <StatusBadge value={staff.status || 'active'} />
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState title="No staff cards" description="Workforce cards were not returned for this shift view." />
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
