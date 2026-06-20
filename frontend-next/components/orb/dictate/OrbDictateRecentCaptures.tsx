'use client'

import { useEffect, useState } from 'react'

import {
  ORB_DICTATE_RECENT_CAPTURES_EMPTY,
  ORB_DICTATE_RECENT_CAPTURES_TITLE,
  ORB_DICTATE_RECENT_CAPTURE_STATUS_LABELS
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  listOrbDictateRecentCaptures,
  type OrbDictateRecentCaptureRow
} from '@/lib/orb/dictate/orb-dictate-drafts'
import { templateLabelForNoteType } from '@/lib/orb/dictate/orb-dictate-studio-templates'

function formatCaptureWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function OrbDictateRecentCaptures() {
  const [rows, setRows] = useState<OrbDictateRecentCaptureRow[]>([])

  useEffect(() => {
    setRows(listOrbDictateRecentCaptures())
  }, [])

  return (
    <section
      className="orb-dictate-recent-captures rounded-2xl border border-[var(--orb-line)]/10 bg-[var(--orb-surface)]/40 p-4"
      data-orb-dictate-recent-captures
    >
      <h3 className="text-xs font-semibold text-[var(--orb-muted)]" data-orb-dictate-recent-captures-title>
        {ORB_DICTATE_RECENT_CAPTURES_TITLE}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-[11px] text-[var(--orb-muted)]" data-orb-dictate-recent-captures-empty>
          {ORB_DICTATE_RECENT_CAPTURES_EMPTY}
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5" role="list">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-[var(--orb-line)]/10 bg-white/70 px-3 py-2 text-[11px]"
              data-orb-dictate-recent-capture-item={row.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--orb-foreground)]">{row.title}</p>
                <p className="mt-0.5 text-[var(--orb-muted)]">
                  {formatCaptureWhen(row.updated_at)}
                  {row.note_type ? ` · ${templateLabelForNoteType(row.note_type)}` : ''}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full bg-[var(--orb-surface)] px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
                data-orb-dictate-recent-capture-status={row.status}
              >
                {ORB_DICTATE_RECENT_CAPTURE_STATUS_LABELS[row.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
