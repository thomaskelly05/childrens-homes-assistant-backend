'use client'

import Link from 'next/link'
import {
  ClipboardCheck,
  ClipboardPlus,
  HeartPulse,
  ListChecks,
  Mic2,
  SearchCheck,
  ShieldAlert,
  UsersRound
} from 'lucide-react'

export type OperationalQuickActionsVariant = 'default' | 'care-hub'

export function OperationalQuickActions({
  selectedYoungPersonId,
  selectedYoungPersonName,
  variant = 'default'
}: {
  selectedYoungPersonId?: string
  selectedYoungPersonName?: string
  variant?: OperationalQuickActionsVariant
}) {
  const childId = selectedYoungPersonId ? encodeURIComponent(selectedYoungPersonId) : null
  const childName = selectedYoungPersonName || 'this child'

  const recordHubHref = childId ? `/record?child_id=${childId}` : '/record'

  const careHubActions = childId
    ? [
        { label: 'Record something', helper: 'Choose daily note, incident, safeguarding and more.', href: recordHubHref, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Write daily note', helper: 'Record the child’s day and what changed.', href: `/young-people/${childId}/daily-note/new`, icon: ClipboardPlus, cta: 'Start' },
        { label: 'Complete handover', helper: 'Prepare what the next adults need to understand.', href: `/young-people/${childId}/shift-handover/new`, icon: ClipboardCheck, cta: 'Start' },
        { label: 'Record incident', helper: 'Log what happened, adult response and repair.', href: `/young-people/${childId}/incidents/new`, icon: ShieldAlert, cta: 'Record' },
        { label: 'Add child voice', helper: 'Record wishes, feelings and “you said, we did”.', href: `/young-people/${childId}/child-voice/new`, icon: UsersRound, cta: 'Add' },
        { label: 'Review actions', helper: 'See follow-up actions that still need attention.', href: '/actions', icon: ListChecks, cta: 'Review' },
        { label: 'Ask ORB', helper: 'Get help with wording, risk, guidance or what to do next.', href: `/assistant/orb?scope=child&young_person_id=${childId}&q=${encodeURIComponent(`What should adults focus on for ${childName} today?`)}`, icon: Mic2, cta: 'Ask' }
      ]
    : [
        { label: 'Record something', helper: 'Choose what to record — notes, incidents, safeguarding and more.', href: recordHubHref, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Write daily note', helper: 'Record the child’s day and what changed.', href: '/record?type=daily-note', icon: ClipboardPlus, cta: 'Start' },
        { label: 'Complete handover', helper: 'Prepare what the next adults need to understand.', href: '/record?type=shift-handover', icon: ClipboardCheck, cta: 'Start' },
        { label: 'Record incident', helper: 'Log what happened, adult response and repair.', href: '/record?type=incidents', icon: ShieldAlert, cta: 'Record' },
        { label: 'Add child voice', helper: 'Choose a child, then record voice and wishes.', href: '/record?type=child-voice', icon: UsersRound, cta: 'Choose' },
        { label: 'Review actions', helper: 'See follow-up actions that still need attention.', href: '/actions', icon: ListChecks, cta: 'Review' },
        { label: 'Ask ORB', helper: 'Get help with wording, risk, guidance or what to do next.', href: '/assistant/orb?context=care-hub&q=What do I need to do next on shift?', icon: Mic2, cta: 'Ask' }
      ]

  const defaultActions = childId
    ? [
        { label: 'Record something', helper: 'Choose daily note, incident, safeguarding and more.', href: recordHubHref, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Write daily note', helper: 'Record the child’s day and what changed.', href: `/young-people/${childId}/daily-note/new`, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Wellbeing check', helper: 'Capture mood, routine, relationships and support.', href: `/young-people/${childId}/wellbeing-check/new`, icon: HeartPulse, cta: 'Open' },
        { label: 'Record incident', helper: 'Log what happened, adult response and repair.', href: `/young-people/${childId}/incidents/new`, icon: ShieldAlert, cta: 'Open' },
        { label: 'Child voice', helper: 'Record wishes, feelings and “you said, we did”.', href: `/young-people/${childId}/child-voice/new`, icon: UsersRound, cta: 'Open' },
        { label: 'Ask ORB', helper: 'Summarise journey, risks and next support.', href: `/assistant/orb?scope=child&young_person_id=${childId}&q=${encodeURIComponent(`Summarise ${childName} and what adults need to understand next`)}`, icon: Mic2, cta: 'Open' },
        { label: 'Evidence', helper: 'Open linked evidence and documents.', href: `/evidence?young_person_id=${childId}`, icon: SearchCheck, cta: 'Open' }
      ]
    : [
        { label: 'Record something', helper: 'Choose what to record — notes, incidents, safeguarding and more.', href: recordHubHref, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Care Hub', helper: 'Start with what needs attention now.', href: '/command-centre', icon: SearchCheck, cta: 'Open' },
        { label: 'Choose young person', helper: 'Open the child journey before recording.', href: '/young-people', icon: ClipboardPlus, cta: 'Open' },
        { label: 'Shift handover', helper: 'Prepare what the next adults need to know.', href: '/handover/current', icon: ClipboardCheck, cta: 'Open' },
        { label: 'Ask ORB', helper: 'Ask what changed, what needs review or what to do next.', href: '/assistant/orb?context=care-hub&q=What needs attention now?', icon: Mic2, cta: 'Open' }
      ]

  const actions = variant === 'care-hub' ? careHubActions : defaultActions

  return (
    <section data-testid="operational-quick-actions" className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">What do I need to do now?</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Tap an action to start recording, handover or ORB support.</p>
      <div className="mt-3 grid gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={`${action.label}-${action.href}`}
              href={action.href}
              aria-label={`${action.label}. ${action.helper}`}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition hover:border-blue-100 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black text-slate-800">{action.label}</span>
                <span className="mt-0.5 block text-[11px] font-bold leading-4 text-slate-500">{action.helper}</span>
              </span>
              <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white">{action.cta}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
