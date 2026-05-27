'use client'

import Link from 'next/link'

import { StatusChip, riskTone } from '@/components/os/status-chip'

export type OsChildCardPerson = {
  id: string
  displayName: string
  preferredName?: string
  riskLevel?: string
  placementStatus?: string
  currentState?: string
  photoUrl?: string
  homeName?: string
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'YP'
  )
}

export function ChildCard({ person, href }: { person: OsChildCardPerson; href: string }) {
  const name = person.preferredName || person.displayName
  const state = person.currentState || person.placementStatus || 'Current placement'
  const risk = person.riskLevel || 'not recorded'

  return (
    <Link
      href={href}
      prefetch={false}
      data-testid={`os-child-card-${person.id}`}
      className="group block overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_22px_56px_rgba(37,99,235,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
    >
      <div className="flex items-stretch gap-0">
        <div className="flex w-24 shrink-0 items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-sky-800 text-2xl font-black text-white md:w-28">
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </div>
        <div className="min-w-0 flex-1 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">Open profile</p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">{name}</h3>
          {person.preferredName && person.preferredName !== person.displayName ? (
            <p className="mt-0.5 text-sm text-slate-500">Legal name: {person.displayName}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusChip label={state} tone="blue" />
            <StatusChip label={`Risk: ${risk}`} tone={riskTone(risk)} />
          </div>
          {person.homeName ? <p className="mt-3 text-xs font-semibold text-slate-500">{person.homeName}</p> : null}
          <p className="mt-4 text-sm font-black text-sky-700 group-hover:underline">Open workspace →</p>
        </div>
      </div>
    </Link>
  )
}
