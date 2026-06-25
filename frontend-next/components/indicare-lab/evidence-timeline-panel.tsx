'use client'

import { Clock, Database } from 'lucide-react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { formatLabDate } from '@/lib/indicare-lab/build-brief'
import {
  LAB_AUDIT_EVENT_TYPE_LABELS,
  STORAGE_CLASSIFICATION_LABELS
} from '@/lib/indicare-lab/governance/types'
import type { EvidenceTimelineEntry } from '@/lib/indicare-lab/storage/lab-storage-types'

const ENTRY_TYPE_LABELS: Record<EvidenceTimelineEntry['entryType'], string> = {
  'audit-event': 'Audit',
  'review-event': 'Review event',
  pattern: 'Pattern',
  suggestion: 'Suggestion',
  'build-brief': 'Build brief',
  'founder-decision': 'Founder decision',
  'benchmark-run': 'Benchmark run'
}

const CLASSIFICATION_TONE: Record<string, string> = {
  redacted: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  synthetic: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  'metadata-only': 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  'full-text-enabled': 'border-rose-400/30 bg-rose-500/10 text-rose-200'
}

type EvidenceTimelinePanelProps = {
  entries: EvidenceTimelineEntry[]
  storageMode: string
}

export function EvidenceTimelinePanel({ entries, storageMode }: EvidenceTimelinePanelProps) {
  return (
    <LabSectionCard
      id="evidence-timeline"
      eyebrow="Phase 7"
      title="Evidence timeline"
      description="Chronological audit trail of captured shadow review events, patterns, suggestions, build briefs, founder decisions and benchmark runs."
      action={
        <div className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
          <Database className="h-3.5 w-3.5" aria-hidden />
          Storage: {storageMode}
        </div>
      }
    >
      {entries.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500"
          data-testid="evidence-timeline-empty"
        >
          No persistent evidence captured yet. Once shadow review, benchmarks or founder actions run,
          the governance timeline will appear here.
        </div>
      ) : (
        <ol className="space-y-3" data-testid="evidence-timeline-list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              data-testid={`timeline-entry-${entry.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        {ENTRY_TYPE_LABELS[entry.entryType]}
                      </span>
                      {entry.isDemo ? (
                        <span className="rounded-full border border-slate-400/30 bg-slate-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Demo
                        </span>
                      ) : null}
                      {entry.isSynthetic ? (
                        <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-200">
                          Synthetic
                        </span>
                      ) : null}
                      {entry.storageClassification ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                            CLASSIFICATION_TONE[entry.storageClassification] ??
                            'border-white/10 bg-white/5 text-slate-400'
                          }`}
                        >
                          {STORAGE_CLASSIFICATION_LABELS[entry.storageClassification]}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-white">{entry.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{entry.summary}</p>
                    {entry.entryType === 'audit-event' ? (
                      <p className="mt-1 text-[10px] text-slate-500">
                        {LAB_AUDIT_EVENT_TYPE_LABELS[
                          entry.summary as keyof typeof LAB_AUDIT_EVENT_TYPE_LABELS
                        ] ?? entry.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{formatLabDate(entry.createdAt)}</p>
                  <p className="mt-1 font-mono text-[10px]">{entry.targetId}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </LabSectionCard>
  )
}
