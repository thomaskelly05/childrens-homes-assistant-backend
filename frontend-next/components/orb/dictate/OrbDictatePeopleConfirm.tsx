'use client'

import { ORB_DICTATE_PEOPLE_CONFIRM_TITLE } from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  orbDictatePersonConfirmStatusLabel,
  type OrbDictatePersonConfirmItem
} from '@/lib/orb/dictate/orb-dictate-people-identification'

export function OrbDictatePeopleConfirm({ items }: { items: OrbDictatePersonConfirmItem[] }) {
  if (!items.length) return null

  return (
    <section
      className="orb-dictate-people-confirm rounded-xl border border-[var(--orb-line)]/12 bg-[var(--orb-surface)]/40 p-3"
      data-orb-dictate-people-confirm
    >
      <h4 className="text-xs font-semibold text-[var(--orb-foreground)]" data-orb-dictate-people-confirm-title>
        {ORB_DICTATE_PEOPLE_CONFIRM_TITLE}
      </h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-[var(--orb-line)]/10 bg-white/80 px-2.5 py-2"
            data-orb-dictate-people-confirm-item={item.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--orb-foreground)]">{item.label}</span>
              <span
                className="text-[10px] text-[var(--orb-muted)]"
                data-orb-dictate-people-confirm-status={item.status}
              >
                {orbDictatePersonConfirmStatusLabel(item.status)}
              </span>
            </div>
            {item.detail ? (
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--orb-muted)]">{item.detail}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
