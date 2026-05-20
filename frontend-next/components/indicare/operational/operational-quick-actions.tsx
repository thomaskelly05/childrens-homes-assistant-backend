'use client'

import Link from 'next/link'
import { ClipboardCheck, ClipboardPlus, FilePlus2, HeartPulse, Mic2, SearchCheck, ShieldAlert, UsersRound } from 'lucide-react'

export function OperationalQuickActions({
  selectedYoungPersonId,
  selectedYoungPersonName
}: {
  selectedYoungPersonId?: string
  selectedYoungPersonName?: string
}) {
  const childId = selectedYoungPersonId ? encodeURIComponent(selectedYoungPersonId) : null
  const childName = selectedYoungPersonName || 'this child'
  const actions = childId ? [
    { label: 'Write daily note', helper: 'Record the child’s day and what changed.', href: `/young-people/${childId}/daily-note/new`, icon: ClipboardPlus },
    { label: 'Wellbeing check', helper: 'Capture mood, routine, relationships and support.', href: `/young-people/${childId}/wellbeing-check/new`, icon: HeartPulse },
    { label: 'Record incident', helper: 'Log what happened, adult response and repair.', href: `/young-people/${childId}/incidents/new`, icon: ShieldAlert },
    { label: 'Child voice', helper: 'Record wishes, feelings and “you said, we did”.', href: `/young-people/${childId}/child-voice/new`, icon: UsersRound },
    { label: 'Ask ORB', helper: 'Summarise journey, risks and next support.', href: `/orb?scope=child&young_person_id=${childId}&q=${encodeURIComponent(`Summarise ${childName} and what adults need to understand next`)}`, icon: Mic2 },
    { label: 'Evidence', helper: 'Open linked evidence and documents.', href: `/evidence?young_person_id=${childId}`, icon: SearchCheck }
  ] : [
    { label: 'Care Hub', helper: 'Start with what needs attention now.', href: '/command-centre', icon: SearchCheck },
    { label: 'Choose young person', helper: 'Open the child journey before recording.', href: '/young-people', icon: ClipboardPlus },
    { label: 'Shift handover', helper: 'Prepare what the next adults need to know.', href: '/young-people', icon: ClipboardCheck },
    { label: 'Ask ORB', helper: 'Ask what changed, what needs review or what to do next.', href: '/orb?context=care-hub&q=What needs attention now?', icon: Mic2 }
  ]

  return (
    <section data-testid="operational-quick-actions" className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">What do I need to do now?</p>
      <div className="mt-3 grid gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={`${action.label}-${action.href}`} href={action.href} className="flex min-h-12 items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-800">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="block">{action.label}</span>
                <span className="mt-0.5 block text-[11px] font-bold leading-4 text-slate-500">{action.helper}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
