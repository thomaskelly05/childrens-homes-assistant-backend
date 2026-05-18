import Image from 'next/image'
import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { EmptyState, RiskBadge, StatusBadge } from '@/components/indicare/ui'
import { text } from '@/lib/os-api/bundles'
import { getServerWorkspaceBundle } from '@/lib/os-api/server-bundles'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'YP'
}

function childName(child: Record<string, any>) {
  return text(child, ['preferred_name', 'preferredName', 'first_name', 'firstName', 'display_name', 'displayName'], 'Young person')
}

function childPhoto(child: Record<string, any>) {
  return text(child, ['photo_url', 'photoUrl', 'profile_photo_path', 'profilePhotoPath', 'profile_photo_url', 'image_url', 'avatar_url'], '')
}

export default async function WorkspacePage() {
  const result = await getServerWorkspaceBundle()
  const bundle = result.data
  const identity = bundle.identity || {}
  const home = bundle.home || {}
  const displayName = text(identity, ['preferred_name', 'display_name', 'email'], 'there')
  const homeName = text(home, ['name', 'home_name', 'title'], identity.home_id ? `Home ${identity.home_id}` : 'your home')
  const children = [...bundle.children.priority, ...bundle.children.favourites, ...bundle.children.visible]
  const uniqueChildren = children.filter((child, index, arr) => arr.findIndex((other) => String(other.id) === String(child.id)) === index)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32rem),linear-gradient(180deg,#f8fafc,#eef6ff)] px-5 py-8 text-slate-950 md:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[36px] bg-white/82 p-7 shadow-xl shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-700">IndiCare child selector</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.07em] text-slate-950 md:text-6xl">Good to see you, {displayName}.</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">Select a young person to enter their scoped profile for {homeName}. No operational areas are shown until a child is selected.</p>
            </div>
            <div className="rounded-[24px] bg-blue-50 px-5 py-4 text-sm font-black text-blue-800 ring-1 ring-blue-100">
              {uniqueChildren.length} child profile{uniqueChildren.length === 1 ? '' : 's'} available
            </div>
          </div>
        </div>

        <div className="mt-5">
          <LiveDataStatus result={result} />
        </div>

        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {uniqueChildren.map((child) => {
            const name = childName(child)
            const photo = childPhoto(child)
            const risk = text(child, ['summary_risk_level', 'risk_level', 'riskLevel', 'current_risk_level'], 'medium')
            const status = text(child, ['placement_status', 'placementStatus', 'status'], 'active')
            const childId = String(child.id)
            return (
              <Link key={childId} href={`/young-people/${encodeURIComponent(childId)}`} className="group overflow-hidden rounded-[34px] bg-white shadow-lg shadow-slate-200/70 ring-1 ring-white transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200/50">
                <div className="relative h-72 bg-slate-200">
                  {photo ? (
                    <Image src={photo} alt={name} fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 via-sky-400 to-cyan-200 text-6xl font-black text-white">{initials(name)}</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">Open profile</p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.05em] text-white">{name}</h2>
                  </div>
                </div>
                <div className="grid gap-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    <RiskBadge value={risk as any} />
                    <StatusBadge value={status} />
                  </div>
                  <p className="text-sm leading-6 text-slate-600">Enter a child-scoped workspace. Daily notes, risk, care planning, documents, reports and ORB context stay focused on this young person.</p>
                </div>
              </Link>
            )
          })}
        </section>

        {!uniqueChildren.length ? (
          <div className="mt-8 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-slate-100">
            <EmptyState title="No young people are available yet" description="The server-authenticated workspace bundle returned no child records for your current schema scope." />
          </div>
        ) : null}
      </section>
    </main>
  )
}