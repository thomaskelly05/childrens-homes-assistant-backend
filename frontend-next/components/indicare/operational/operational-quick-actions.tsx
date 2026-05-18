'use client'

import Link from 'next/link'
import { ClipboardPlus, FilePlus2, Mic2, SearchCheck } from 'lucide-react'

export function OperationalQuickActions({
  selectedYoungPersonId,
  selectedYoungPersonName
}: {
  selectedYoungPersonId?: string
  selectedYoungPersonName?: string
}) {
  const childId = selectedYoungPersonId ? encodeURIComponent(selectedYoungPersonId) : null
  const actions = childId ? [
    { label: 'Daily note', href: `/young-people/${childId}/daily-note/new`, icon: ClipboardPlus },
    { label: 'New record', href: `/young-people/${childId}/records/new`, icon: FilePlus2 },
    { label: 'Ask ORB', href: `/assistant?q=${encodeURIComponent(`Summarise ${selectedYoungPersonName || 'this child'} and the current operational risks`)}`, icon: Mic2 },
    { label: 'Evidence', href: `/evidence?young_person_id=${childId}`, icon: SearchCheck }
  ] : [
    { label: 'Command centre', href: '/command-centre', icon: SearchCheck },
    { label: 'Choose child', href: '/young-people', icon: ClipboardPlus },
    { label: 'Ask ORB', href: '/assistant', icon: Mic2 }
  ]

  return (
    <section data-testid="operational-quick-actions" className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quick actions</p>
      <div className="mt-3 grid gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={`${action.label}-${action.href}`} href={action.href} className="flex min-h-11 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-800">
              <Icon className="h-4 w-4" aria-hidden />
              {action.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
