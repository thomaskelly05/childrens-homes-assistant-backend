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

import {
  childActionsHref,
  childDailyNoteHref,
  childIncidentHref,
  childKeyworkHref,
  childOrbHref,
  childRecordHref,
  childVoiceHref
} from '@/lib/navigation/scope-routes'

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
  const childId = selectedYoungPersonId ? String(selectedYoungPersonId) : null
  void selectedYoungPersonName

  const recordHubHref = childId ? childRecordHref(childId) : '/record'
  const actionsHref = childId ? childActionsHref(childId) : '/select-scope'
  const orbHref = childId
    ? childOrbHref(childId, 'record_quality_review')
    : '/assistant/orb?mode=general_operational_question'

  const careHubActions = childId
    ? [
        { label: 'Record something', helper: 'Choose daily note, incident, safeguarding and more.', href: recordHubHref, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Write daily note', helper: 'Record the child’s day and what changed.', href: childDailyNoteHref(childId), icon: ClipboardPlus, cta: 'Start' },
        { label: 'Complete handover', helper: 'Prepare what the next adults need to understand.', href: `/handover?child_id=${encodeURIComponent(childId)}`, icon: ClipboardCheck, cta: 'Start' },
        { label: 'Record incident', helper: 'Log what happened, adult response and repair.', href: childIncidentHref(childId), icon: ShieldAlert, cta: 'Record' },
        { label: 'Add child voice', helper: 'Record wishes, feelings and “you said, we did”.', href: childVoiceHref(childId), icon: UsersRound, cta: 'Add' },
        { label: 'Review actions', helper: 'See follow-up actions that still need attention.', href: actionsHref, icon: ListChecks, cta: 'Review' },
        { label: 'Ask ORB', helper: 'Get help with wording, risk, guidance or what to do next.', href: orbHref, icon: Mic2, cta: 'Ask' }
      ]
    : [
        { label: 'Record something', helper: 'Choose what to record — notes, incidents, safeguarding and more.', href: recordHubHref, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Write daily note', helper: 'Record the child’s day and what changed.', href: '/record?type=daily-note', icon: ClipboardPlus, cta: 'Start' },
        { label: 'Complete handover', helper: 'Prepare what the next adults need to understand.', href: '/handover', icon: ClipboardCheck, cta: 'Start' },
        { label: 'Record incident', helper: 'Log what happened, adult response and repair.', href: '/record?type=incident', icon: ShieldAlert, cta: 'Record' },
        { label: 'Add child voice', helper: 'Choose a child, then record voice and wishes.', href: '/record?type=child-voice', icon: UsersRound, cta: 'Choose' },
        { label: 'Choose scope', helper: 'Select a home and child before reviewing actions.', href: '/select-scope', icon: ListChecks, cta: 'Open' },
        { label: 'Ask ORB', helper: 'Get help with wording, risk, guidance or what to do next.', href: orbHref, icon: Mic2, cta: 'Ask' }
      ]

  const defaultActions = childId
    ? [
        { label: 'Record something', helper: 'Choose daily note, incident, safeguarding and more.', href: recordHubHref, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Write daily note', helper: 'Record the child’s day and what changed.', href: childDailyNoteHref(childId), icon: ClipboardPlus, cta: 'Open' },
        { label: 'Keywork', helper: 'Record keywork and direct work with the child.', href: childKeyworkHref(childId), icon: HeartPulse, cta: 'Open' },
        { label: 'Record incident', helper: 'Log what happened, adult response and repair.', href: childIncidentHref(childId), icon: ShieldAlert, cta: 'Open' },
        { label: 'Child voice', helper: 'Record wishes, feelings and “you said, we did”.', href: childVoiceHref(childId), icon: UsersRound, cta: 'Open' },
        { label: 'Ask ORB', helper: 'Summarise journey, risks and next support.', href: orbHref, icon: Mic2, cta: 'Open' },
        { label: 'Documents', helper: 'Open linked documents for this child.', href: `/documents?child_id=${encodeURIComponent(childId)}`, icon: SearchCheck, cta: 'Open' }
      ]
    : [
        { label: 'Record something', helper: 'Choose what to record — notes, incidents, safeguarding and more.', href: recordHubHref, icon: ClipboardPlus, cta: 'Open' },
        { label: 'Choose scope', helper: 'Select a home and child before recording.', href: '/select-scope', icon: ClipboardPlus, cta: 'Open' },
        { label: 'Shift handover', helper: 'Prepare what the next adults need to know.', href: '/handover', icon: ClipboardCheck, cta: 'Open' },
        { label: 'Ask ORB', helper: 'Ask what changed, what needs review or what to do next.', href: orbHref, icon: Mic2, cta: 'Open' }
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
              prefetch={false}
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
