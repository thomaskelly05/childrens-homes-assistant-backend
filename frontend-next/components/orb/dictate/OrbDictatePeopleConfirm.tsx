'use client'

import {
  ORB_DICTATE_PEOPLE_CONFIRM_DISCLAIMER,
  ORB_DICTATE_PEOPLE_CONFIRM_TITLE,
  ORB_DICTATE_SPEAKER_DETECTION_NOTE
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  createManualPersonConfirmItem,
  orbDictatePersonConfirmStatusLabel,
  type OrbDictatePersonConfirmItem,
  type OrbDictatePersonRole
} from '@/lib/orb/dictate/orb-dictate-people-identification'

const ROLE_OPTIONS: Array<{ value: OrbDictatePersonRole; label: string }> = [
  { value: 'child', label: 'Child' },
  { value: 'staff', label: 'Staff' },
  { value: 'registered_manager', label: 'Registered Manager' },
  { value: 'parent_family', label: 'Parent / family' },
  { value: 'professional', label: 'Professional' },
  { value: 'unknown', label: 'Unknown' }
]

export function OrbDictatePeopleConfirm({
  items,
  prominent = false,
  interactive = false,
  onItemsChange
}: {
  items: OrbDictatePersonConfirmItem[]
  prominent?: boolean
  interactive?: boolean
  onItemsChange?: (items: OrbDictatePersonConfirmItem[]) => void
}) {
  const visibleItems = items.filter((item) => !item.removed)
  if (!visibleItems.length && !interactive) return null

  const updateItem = (id: string, patch: Partial<OrbDictatePersonConfirmItem>) => {
    if (!onItemsChange) return
    onItemsChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const addPerson = () => {
    if (!onItemsChange) return
    onItemsChange([...items, createManualPersonConfirmItem('Person')])
  }

  return (
    <section
      className={`orb-dictate-people-confirm rounded-xl border border-[var(--orb-line)]/25 ${
        prominent
          ? 'bg-[var(--orb-surface)]/90 p-4 shadow-sm ring-1 ring-[var(--orb-line)]/15'
          : 'bg-[var(--orb-surface)]/60 p-3'
      }`}
      data-orb-dictate-people-confirm
      data-orb-dictate-people-confirm-surface="neutral"
    >
      <h4
        className={`font-semibold text-[var(--orb-foreground)] ${prominent ? 'text-sm' : 'text-xs'}`}
        data-orb-dictate-people-confirm-title
      >
        {ORB_DICTATE_PEOPLE_CONFIRM_TITLE}
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-[var(--orb-foreground)]/80" data-orb-dictate-people-confirm-disclaimer>
        {ORB_DICTATE_PEOPLE_CONFIRM_DISCLAIMER}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-speaker-detection-note>
        {ORB_DICTATE_SPEAKER_DETECTION_NOTE}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {visibleItems.map((item) => (
          <li
            key={item.id}
            className={`rounded-lg border px-3 py-2.5 ${
              item.confirmed
                ? 'border-emerald-200/80 bg-emerald-50/50'
                : 'border-[var(--orb-line)]/20 bg-white'
            }`}
            data-orb-dictate-people-confirm-item={item.id}
            data-orb-dictate-people-confirm-row
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              {interactive && onItemsChange ? (
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  disabled={item.confirmed}
                  className="orb-dictate-people-confirm-label min-w-[10rem] flex-1 rounded-lg border border-[var(--orb-line)]/20 bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/35"
                  data-orb-dictate-people-confirm-label
                  aria-label={`Edit label for ${item.label}`}
                />
              ) : (
                <span className="text-sm font-medium text-[var(--orb-foreground)]">{item.label}</span>
              )}
              <span
                className="rounded-full border border-[var(--orb-line)]/25 bg-[var(--orb-surface)]/80 px-2 py-0.5 text-[11px] font-medium text-[var(--orb-foreground)]/75"
                data-orb-dictate-people-confirm-status={item.status}
              >
                {item.confirmed ? 'Confirmed by adult' : orbDictatePersonConfirmStatusLabel(item.status)}
              </span>
            </div>

            {item.detail ? (
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--orb-muted)]">{item.detail}</p>
            ) : null}
            {item.basis ? (
              <p className="mt-1 text-[10px] text-[var(--orb-muted)]" data-orb-dictate-people-basis>
                Basis: {item.basis}
              </p>
            ) : null}
            {item.sourceSnippet ? (
              <p className="mt-1 text-[10px] italic text-[var(--orb-muted)]" data-orb-dictate-people-source-snippet>
                “{item.sourceSnippet}”
              </p>
            ) : null}

            {interactive && onItemsChange ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`orb-dictate-people-role-${item.id}`}>
                  Role for {item.label}
                </label>
                <select
                  id={`orb-dictate-people-role-${item.id}`}
                  value={item.role ?? 'unknown'}
                  disabled={item.confirmed}
                  onChange={(e) => updateItem(item.id, { role: e.target.value as OrbDictatePersonRole })}
                  className="orb-dictate-people-confirm-role rounded-lg border border-[var(--orb-line)]/25 bg-white px-2 py-1 text-xs font-medium text-[var(--orb-foreground)]"
                  data-orb-dictate-people-confirm-role
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={item.confirmed}
                  className="orb-dictate-secondary-action rounded-lg border border-[var(--orb-primary)]/30 bg-[var(--orb-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--orb-foreground)] disabled:opacity-60"
                  data-orb-dictate-people-confirm-confirm
                  onClick={() => updateItem(item.id, { confirmed: true, status: 'appears_to_include', confidence: 'confirmed' })}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="orb-dictate-secondary-action rounded-lg border border-[var(--orb-line)]/30 bg-white px-2.5 py-1 text-xs font-medium text-[var(--orb-foreground)]"
                  data-orb-dictate-people-confirm-remove
                  onClick={() => updateItem(item.id, { removed: true })}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {interactive && onItemsChange ? (
        <button
          type="button"
          className="mt-3 rounded-lg border border-[var(--orb-line)]/30 bg-white px-3 py-1.5 text-xs font-medium text-[var(--orb-foreground)]"
          data-orb-dictate-people-add
          onClick={addPerson}
        >
          Add person
        </button>
      ) : null}
    </section>
  )
}
