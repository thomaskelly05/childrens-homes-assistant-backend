'use client'

import { ExternalLink, Link2 } from 'lucide-react'

import {
  ORB_OFFICIAL_GUIDANCE_ENTRIES,
  officialGuidanceForRecordType
} from '@/lib/orb/knowledge/orb-official-guidance'
import type { OrbOfficialGuidanceEntry } from '@/lib/orb/knowledge/orb-knowledge-library-types'
import { resolveOrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types'

export function OrbKnowledgeOfficialGuidanceSection({
  recordTypeFilter,
  onUseWithOrb,
  onLinkRecordType
}: {
  recordTypeFilter?: OrbRecordingRecordTypeId | string
  onUseWithOrb?: (entry: OrbOfficialGuidanceEntry) => void
  onLinkRecordType?: (recordTypeId: string) => void
}) {
  const entries = recordTypeFilter
    ? officialGuidanceForRecordType(recordTypeFilter)
    : [...ORB_OFFICIAL_GUIDANCE_ENTRIES]

  return (
    <section className="space-y-3" data-orb-knowledge-official-guidance>
      <p className="text-xs text-[var(--orb-muted)]">
        Curated UK government and inspection sources — metadata and links only. Statutory text is not
        copied here. Changes require human review; built-in entries do not auto-update.
      </p>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-3"
            data-orb-official-guidance-entry={entry.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--orb-foreground)]">{entry.title}</p>
              <span
                className="rounded-full border border-[var(--orb-line)] px-2 py-0.5 text-[10px] capitalize text-[var(--orb-muted)]"
                data-orb-official-guidance-status={entry.approval_status}
              >
                {entry.approval_status.replace(/_/g, ' ')}
              </span>
            </div>
            <dl className="mt-2 grid gap-1 text-[10px] text-[var(--orb-muted)]" data-orb-official-guidance-metadata>
              <div>
                <dt className="inline font-medium text-[var(--orb-foreground)]">Publisher: </dt>
                <dd className="inline">{entry.publisher}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-[var(--orb-foreground)]">Type: </dt>
                <dd className="inline capitalize">{entry.source_type.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-[var(--orb-foreground)]">Jurisdiction: </dt>
                <dd className="inline">{entry.jurisdiction}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-[var(--orb-foreground)]">Last checked: </dt>
                <dd className="inline">{entry.last_checked_at}</dd>
              </div>
              {entry.related_topics.length ? (
                <div>
                  <dt className="inline font-medium text-[var(--orb-foreground)]">Topics: </dt>
                  <dd className="inline">{entry.related_topics.join(' · ')}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-2.5 py-1 text-[10px] font-medium"
                data-orb-official-guidance-open-source
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                Open source
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--orb-primary)] px-2.5 py-1 text-[10px] font-medium text-white"
                data-orb-official-guidance-use-with-orb
                onClick={() => onUseWithOrb?.(entry)}
              >
                Use with ORB
              </button>
              {entry.related_record_type_ids[0] ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-2.5 py-1 text-[10px]"
                  data-orb-official-guidance-link-record-type
                  onClick={() => onLinkRecordType?.(entry.related_record_type_ids[0])}
                >
                  <Link2 className="h-3 w-3" aria-hidden />
                  Link to {resolveOrbRecordingRecordType({ recordTypeId: entry.related_record_type_ids[0] }).label}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
