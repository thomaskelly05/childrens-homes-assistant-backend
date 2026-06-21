'use client'

import {
  ORB_DICTATE_PEOPLE_CONFIRM_DISCLAIMER,
  ORB_DICTATE_PEOPLE_CONFIRM_TITLE,
  ORB_DICTATE_SPEAKER_DETECTION_NOTE
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  orbDictatePersonConfirmStatusLabel,
  type OrbDictatePersonConfirmItem
} from '@/lib/orb/dictate/orb-dictate-people-identification'

export function OrbDictatePeopleConfirm({
  items,
  prominent = false
}: {
  items: OrbDictatePersonConfirmItem[]
  prominent?: boolean
}) {
  if (!items.length) return null

  return (
    <section
      className={`orb-dictate-people-confirm rounded-xl border border-[var(--orb-line)]/12 ${
        prominent ? 'bg-amber-50/60 p-4 ring-1 ring-amber-200/40' : 'bg-[var(--orb-surface)]/40 p-3'
      }`}
      data-orb-dictate-people-confirm
    >
      <h4
        className={`font-semibold text-[var(--orb-foreground)] ${prominent ? 'text-sm' : 'text-xs'}`}
        data-orb-dictate-people-confirm-title
      >
        {ORB_DICTATE_PEOPLE_CONFIRM_TITLE}
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-people-confirm-disclaimer>
        {ORB_DICTATE_PEOPLE_CONFIRM_DISCLAIMER}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-speaker-detection-note>
        {ORB_DICTATE_SPEAKER_DETECTION_NOTE}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--orb-line)]/10 bg-white/90 px-3 py-2"
            data-orb-dictate-people-confirm-item={item.id}
          >
            <span className="text-sm font-medium text-[var(--orb-foreground)]">{item.label}</span>
            <span
              className="rounded-full border border-[var(--orb-line)]/20 px-2 py-0.5 text-[11px] text-[var(--orb-muted)]"
              data-orb-dictate-people-confirm-status={item.status}
            >
              {orbDictatePersonConfirmStatusLabel(item.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
