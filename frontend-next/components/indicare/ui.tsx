import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { RiskLevel } from '@/lib/indicare/types'
import { getEntityActions, type EntityRouteInput } from '@/lib/navigation/entity-resolver'

type BadgeTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'red' | 'purple'

const toneClasses: Record<BadgeTone, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  blue: 'border-blue-100 bg-blue-50 text-blue-700',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-100 bg-amber-50 text-amber-800',
  red: 'border-red-100 bg-red-50 text-red-700',
  purple: 'border-purple-100 bg-purple-50 text-purple-700'
}

export function Card({ children, className = '', ...props }: { children: ReactNode; className?: string } & ComponentPropsWithoutRef<'section'>) {
  return (
    <section {...props} className={`rounded-[30px] bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)] ring-1 ring-white/80 backdrop-blur ${className}`}>
      {children}
    </section>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <section className="rounded-[36px] bg-white/90 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
    </section>
  )
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  )
}

export function StatusBadge({ value }: { value: string }) {
  const lower = value.toLowerCase()
  const tone: BadgeTone = lower.includes('active') || lower.includes('operational')
    ? 'emerald'
    : lower.includes('overdue') || lower.includes('critical')
      ? 'red'
      : lower.includes('review') || lower.includes('monitoring')
        ? 'amber'
        : lower.includes('draft')
          ? 'blue'
          : 'slate'

  return <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${toneClasses[tone]}`}>{value}</span>
}

export function RiskBadge({ value }: { value: RiskLevel }) {
  const tone: Record<RiskLevel, BadgeTone> = {
    low: 'emerald',
    medium: 'amber',
    high: 'red',
    critical: 'purple'
  }

  return <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${toneClasses[tone[value]]}`}>{value}</span>
}

export function StatCard({
  label,
  value,
  detail,
  href,
  entity
}: {
  label: string
  value: string | number
  detail?: string
  href?: string
  entity?: EntityRouteInput
}) {
  const actions = entity ? getEntityActions(entity).slice(0, 3) : []
  const content = (
    <article className="group relative h-full rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-xl">
      {href ? <Link href={href} className="absolute inset-0 rounded-[26px]" aria-label={`Open ${label}`} /> : null}
      <strong className="block text-3xl font-black tracking-[-0.06em] text-slate-950">{value}</strong>
      <span className="mt-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {detail ? <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p> : null}
      {actions.length ? (
        <div className="relative z-10 mt-4 flex flex-wrap gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
          {actions.map((action) => (
            <Link
              key={`${action.id}-${action.route}`}
              href={action.route}
              className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700"
            >
              {action.id === 'workspace' ? 'Open' : action.id}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  )

  return content
}

export function AlertCard({
  title,
  body,
  href,
  entity
}: {
  title: string
  body: string
  href?: string
  entity?: EntityRouteInput
}) {
  const actions = entity ? getEntityActions(entity).slice(0, 4) : []
  const content = (
    <article className="group relative rounded-2xl border border-amber-100 bg-amber-50/80 p-4 transition hover:border-amber-200 hover:bg-amber-50">
      {href ? <Link href={href} className="absolute inset-0 rounded-2xl" aria-label={`Open ${title}`} /> : null}
      <strong className="block text-sm font-black text-amber-950">{title}</strong>
      <p className="mt-2 text-sm leading-6 text-amber-800">{body}</p>
      {actions.length ? (
        <div className="relative z-10 mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.id}-${action.route}`}
              href={action.route}
              className="rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800"
            >
              {action.id === 'workspace' ? 'Open source' : action.id}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  )

  return content
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[30px] bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-8 text-center shadow-[0_14px_36px_rgba(15,23,42,0.05)] ring-1 ring-white/80">
      <h3 className="text-xl font-black tracking-[-0.03em] text-slate-900">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">{description}</p>
    </div>
  )
}

export function DataTable({
  headers,
  rows,
  empty
}: {
  headers: string[]
  rows: ReactNode[][]
  empty: ReactNode
}) {
  if (!rows.length) return <>{empty}</>

  return (
    <div className="overflow-x-auto rounded-[24px] border border-slate-100">
      <table className="min-w-[720px] divide-y divide-slate-100 text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          <tr>{headers.map((header) => <th key={header} scope="col" className="px-4 py-4">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4 text-slate-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RecordTimeline({
  items
}: {
  items: Array<{ id: string; title: string; date: string; body: string; href?: string }>
}) {
  if (!items.length) {
    return <EmptyState title="No timeline records" description="No records match this timeline yet." />
  }

  return (
    <div className="relative space-y-4 before:absolute before:left-4 before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-slate-200">
      {items.map((item) => {
        const content = (
          <article className="relative pl-11">
            <div className="absolute left-0 top-5 h-8 w-8 rounded-full border border-blue-100 bg-blue-50" />
            <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
              <span className="text-xs font-bold text-slate-400">{item.date}</span>
              <h3 className="mt-2 text-lg font-black tracking-[-0.03em] text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          </article>
        )

        return item.href ? <Link key={item.id} href={item.href}>{content}</Link> : <div key={item.id}>{content}</div>
      })}
    </div>
  )
}

export function ActionButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5">
      {children}
    </Link>
  )
}
