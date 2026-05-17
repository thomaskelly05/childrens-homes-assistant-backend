import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, RecordTimeline, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getMeToday } from '@/lib/os-api/connect'

export default async function ProfilePage() {
  const result = await getMeToday()
  const today = result.data
  const adult = today.adult
  const initials = (adult.name || 'IC').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My profile"
        title={adult.name || 'My profile'}
        description="A warm professional profile for your role, home, preferences, recent work and today’s responsibilities."
        action={<Link href="/settings" className="rounded-2xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-sm">Account settings</Link>}
      />
      <LiveDataStatus result={result} />

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="bg-gradient-to-br from-white via-blue-50/70 to-white">
          <div className="flex flex-col items-center text-center">
            {adult.profile_photo ? (
              <div className="h-32 w-32 rounded-[36px] bg-cover bg-center shadow-xl shadow-blue-950/10" style={{ backgroundImage: `url(${adult.profile_photo})` }} aria-label="Profile photo" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-[36px] bg-gradient-to-br from-blue-600 to-slate-950 text-4xl font-black text-white shadow-xl shadow-blue-950/20">{initials}</div>
            )}
            <h2 className="mt-5 text-3xl font-black tracking-[-0.05em] text-slate-950">{adult.preferred_name || adult.name}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{adult.role || 'Role not returned'}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <StatusBadge value={today.home?.name || 'home not returned'} />
              <StatusBadge value={adult.email ? 'contact available' : 'contact not returned'} />
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <StatCard label="Handover items" value={today.handover?.summary?.total || 0} detail="Visible today" href="/handover/current" />
          <StatCard label="Unread Connect" value={today.connect?.count || 0} detail="Messages needing attention" href="/connect" />
          <StatCard label="Notifications" value={today.notifications?.unread || 0} detail="Unread notifications" href="/notifications" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="About me" title="Professional identity" description="Profile extension fields will appear here when saved to the backend." />
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Short bio', 'No bio has been returned yet.'],
              ['Professional strengths', 'No strengths have been returned yet.'],
              ['Therapeutic approach', 'No approach summary has been returned yet.'],
              ['Availability', 'No availability status has been returned yet.']
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Pinned workspace" title="Preferences" description="Dashboard preferences are schema-backed and critical safety widgets cannot be hidden." />
          <div className="flex flex-wrap gap-2">
            {((today.dashboard_preferences?.layout as Array<{ id: string; pinned?: boolean; locked?: boolean }> | undefined) || []).filter((item) => item.pinned !== false).map((item) => (
              <StatusBadge key={item.id} value={`${item.id.replaceAll('_', ' ')}${item.locked ? ' locked' : ''}`} />
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Recent activity" title="Records and activity" />
          <RecordTimeline items={(today.recent_activity || []).map((item, index) => ({
            id: String(item.id || index),
            title: String(item.title || item.type || 'Activity'),
            date: String(item.created_at || item.date || ''),
            body: String(item.summary || item.body || 'No summary returned.')
          }))} />
        </Card>
        <Card>
          <SectionHeader eyebrow="Key children" title="Assigned children" />
          <EmptyState title="No assigned children returned" description="Assigned or key children will appear here when the backend returns live allocation data." />
        </Card>
      </section>
    </div>
  )
}
