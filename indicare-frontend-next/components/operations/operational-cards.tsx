import Link from 'next/link'
import { AlertTriangle, Bell, ClipboardCheck, FileText, ShieldAlert, UserCheck } from 'lucide-react'

import { Card, RiskBadge, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import type { OperationalCard } from '@/lib/operations/shift-data'

const iconByType = {
  'active incident': AlertTriangle,
  'missing episode': AlertTriangle,
  'safeguarding alert': ShieldAlert,
  'medication concern': Bell,
  'missing recording': FileText,
  'placement concern': UserCheck
}

export function OperationalPriorityBoard({ cards }: { cards: OperationalCard[] }) {
  return (
    <Card>
      <SectionHeader
        eyebrow="Live operational board"
        title="Current priorities"
        description="Permission-scoped operational cards with urgency, assignment, chronology context and workflow links."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = iconByType[card.type as keyof typeof iconByType] || ClipboardCheck
          return (
            <Link
              key={card.id}
              href={card.href}
              className="group rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:border-blue-100 hover:bg-white hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{card.type}</p>
                    <h3 className="mt-1 text-base font-black leading-5 text-slate-950">{card.title}</h3>
                  </div>
                </div>
                <RiskBadge value={card.urgency} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value={`score ${card.priorityScore}`} />
                {card.assignment ? <StatusBadge value={`assigned ${card.assignment}`} /> : null}
                <StatusBadge value="chronology context" />
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

export function MobileActionBar() {
  return (
    <div className="sticky bottom-28 z-20 mx-auto flex max-w-md gap-2 rounded-[24px] border border-white/70 bg-white/95 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:hidden">
      <Link href="/handover/current" className="flex-1 rounded-2xl bg-slate-950 px-3 py-3 text-center text-xs font-black text-white">Handover</Link>
      <Link href="/staff/me/recording" className="flex-1 rounded-2xl bg-blue-600 px-3 py-3 text-center text-xs font-black text-white">Record</Link>
      <Link href="/shifts/current" className="flex-1 rounded-2xl border border-slate-200 px-3 py-3 text-center text-xs font-black text-slate-700">Board</Link>
    </div>
  )
}
