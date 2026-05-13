import Link from 'next/link'

import { Card, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { MobileActionBar, OperationalPriorityBoard } from '@/components/operations/operational-cards'
import { RapidRecordingDrawer } from '@/components/operations/rapid-recording'
import { currentShift, rapidRecordingTypes } from '@/lib/operations/shift-data'

export default function CurrentShiftPage() {
  const shift = currentShift()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Current shift"
        title={`${shift.homeName} · ${shift.shiftType}`}
        description="Live shift board for welfare checks, room checks, incidents, safeguarding concerns, medication alerts, appointments, recording, handover and manager escalations."
        action={<Link href="/handover/current" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Prepare handover</Link>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Incidents" value={shift.stats.incidents} detail="Active or awaiting review" href="/incidents" entity={{ entity_type: 'incident' }} />
        <StatCard label="Safeguarding" value={shift.stats.safeguardingConcerns} detail="Review required, no auto conclusions" href="/safeguarding" entity={{ entity_type: 'safeguarding_concern' }} />
        <StatCard label="Medication alerts" value={shift.stats.medicationAlerts} detail="Missed or overdue administration" href="/medication" entity={{ entity_type: 'medication_record' }} />
        <StatCard label="Welfare checks" value={shift.stats.welfareChecksDue} detail="Children needing shift check-ins" href="/shifts/current" entity={{ entity_type: 'shift', entity_id: shift.id }} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <OperationalPriorityBoard cards={shift.cards} />
        <div className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Staff cards" title="Active staff" />
            <div className="space-y-3">
              {shift.activeStaff.map((staff) => (
                <Link key={staff.id} href={`/staff/${staff.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{staff.firstName} {staff.lastName}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">{staff.role}</p>
                    </div>
                    <StatusBadge value={staff.status} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="Rapid recording" title="Quick-add types" description="Small entries, mobile layouts and explicit chronology preview." />
            <div className="grid grid-cols-2 gap-2">
              {rapidRecordingTypes.map((type) => (
                <Link key={type.id} href={type.route} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-black text-slate-700">
                  {type.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <MobileActionBar />
      <RapidRecordingDrawer />
    </div>
  )
}
