import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'
import { EmptyState, RiskBadge, StatusBadge } from '@/components/indicare/ui'
import { getServerOsYoungPeople } from '@/lib/os-api/server-workspaces'

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.BACKEND_URL ||
  'https://api.indicare.co.uk'
).replace(/\/+$/, '')

function childName(person: Record<string, any>) {
  return String(person.preferredName || person.preferred_name || person.displayName || person.display_name || person.firstName || person.first_name || 'Young person')
}

function normalisePhotoPath(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'Not returned yet' || raw === 'null' || raw === 'undefined') return ''
  if (raw.startsWith('data:image/')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.startsWith('/')) return `${API_BASE}${raw}`
  return ''
}

function childPhoto(person: Record<string, any>) {
  return normalisePhotoPath(person.photoUrl || person.photo_url || person.profile_photo_path || person.profilePhotoPath || person.profile_photo_url || person.image_url || person.avatar_url)
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'YP'
}

export default async function YoungPeoplePage() {
  const peopleResult = await getServerOsYoungPeople()
  const people = peopleResult.data

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32rem),linear-gradient(180deg,#f8fafc,#eef6ff)] px-5 py-8 text-slate-950 md:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[36px] bg-white/82 p-7 shadow-xl shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur md:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-700">Children</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.07em] text-slate-950 md:text-6xl">Choose a young person</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">Select a child to enter their scoped profile. Chronology, plans, documents, reports and ORB context stay focused on that young person after selection.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-[24px] bg-blue-50 px-5 py-4 text-sm font-black text-blue-800 ring-1 ring-blue-100">
              {people.length} child profile{people.length === 1 ? '' : 's'} available
            </div>
            <OrbInlineHint
              label="Ask ORB about child journey"
              href="/assistant/orb?mode=child_journey_summary"
              tone="cyan"
            />
          </div>
        </div>

        <div className="mt-5">
          <LiveDataStatus result={peopleResult} />
        </div>

        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => {
            const name = childName(person as any)
            const photo = childPhoto(person as any)
            const risk = String(person.riskLevel || (person as any).summary_risk_level || (person as any).risk_level || 'medium')
            const status = String(person.placementStatus || (person as any).placement_status || person.status || 'active')
            const keyWorker = String((person as any).keyWorkerName || (person as any).key_worker_name || person.keyWorkerId || 'Key worker not returned')
            const id = String(person.id)
            const journeyHref = `/young-people/${encodeURIComponent(id)}/journey`
            const profileHref = `/young-people/${encodeURIComponent(id)}`
            return (
              <article key={id} className="group overflow-hidden rounded-[34px] bg-white shadow-lg shadow-slate-200/70 ring-1 ring-white transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200/50">
                <Link href={journeyHref} className="block">
                  <div className="relative h-72 bg-slate-200">
                    {photo ? (
                      <img src={photo} alt={name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="eager" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 via-sky-400 to-cyan-200 text-6xl font-black text-white">{initials(name)}</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-5">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">Open journey</p>
                      <h2 className="mt-1 text-3xl font-black tracking-[-0.05em] text-white">{name}</h2>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5">
                    <div className="flex flex-wrap gap-2">
                      <RiskBadge value={risk as any} />
                      <StatusBadge value={status} />
                    </div>
                    <p className="text-sm leading-6 text-slate-600">Enter the ORB-guided child journey workspace for recording, chronology and review.</p>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Key worker: {keyWorker}</p>
                  </div>
                </Link>
                <div className="border-t border-slate-100 px-5 pb-5">
                  <Link href={profileHref} className="text-xs font-black uppercase tracking-[0.14em] text-blue-700 hover:underline">
                    Full profile →
                  </Link>
                </div>
              </article>
            )
          })}
        </section>

        {!people.length ? (
          <div className="mt-8 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-slate-100">
            <EmptyState title="No young people are available" description="No children are visible for your account yet. Check that your user is linked to a home or has provider-level access to homes with child records." />
          </div>
        ) : null}
      </section>
    </main>
  )
}