'use client'

import {
  ACTION_POINTS_COPY,
  actionPointsTableMarkdown,
  normalizeStructuredActions,
  type OrbDictateActionPoint
} from '@/lib/orb/dictate/orb-dictate-action-points'
import { SOURCE_CHECK_COPY } from '@/lib/orb/dictate/orb-dictate-source-check'
import type { OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'

export function OrbDictateActionPointsPanel({
  actions,
  structuredActions,
  segments = []
}: {
  actions: string[]
  structuredActions?: OrbDictateActionPoint[]
  segments?: OrbDictateTranscriptSegment[]
}) {
  const points =
    structuredActions?.length ? structuredActions : normalizeStructuredActions(undefined, actions, segments)

  if (!points.length) return null

  return (
    <section className="rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] p-3" data-orb-dictate-action-points>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Action points</h3>
      <p className="mt-1 text-[10px] text-[var(--orb-muted)]">{ACTION_POINTS_COPY}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-[11px]">
          <thead>
            <tr className="border-b border-[var(--orb-line)]/40 text-[var(--orb-muted)]">
              <th className="py-1 pr-2 font-medium">Action</th>
              <th className="py-1 pr-2 font-medium">Owner</th>
              <th className="py-1 pr-2 font-medium">Deadline</th>
              <th className="py-1 pr-2 font-medium">Source</th>
              <th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id} className="border-b border-[var(--orb-line)]/20" data-orb-dictate-action-row>
                <td className="py-1.5 pr-2 align-top text-[var(--orb-foreground)]">{p.action}</td>
                <td className="py-1.5 pr-2 align-top text-[var(--orb-muted)]">{p.owner}</td>
                <td className="py-1.5 pr-2 align-top text-[var(--orb-muted)]">{p.deadline}</td>
                <td className="py-1.5 pr-2 align-top text-[var(--orb-muted)]">
                  {p.source_label ?? 'Not stated'}
                </td>
                <td className="py-1.5 align-top text-[var(--orb-muted)]">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {points.some((p) => p.management_oversight) ? (
        <p className="mt-2 text-[10px] text-amber-200/90" data-orb-dictate-management-oversight-prompt>
          One or more actions may need management oversight. Review safeguarding procedures before use.
        </p>
      ) : null}
      <p className="mt-2 text-[10px] text-[var(--orb-muted)]" data-orb-dictate-source-check-disclosure>
        {SOURCE_CHECK_COPY}
      </p>
    </section>
  )
}

export function OrbDictateActionPointsMarkdown({
  actions,
  structuredActions,
  segments
}: {
  actions: string[]
  structuredActions?: OrbDictateActionPoint[]
  segments?: OrbDictateTranscriptSegment[]
}) {
  const points =
    structuredActions?.length ? structuredActions : normalizeStructuredActions(undefined, actions, segments)
  return actionPointsTableMarkdown(points)
}
