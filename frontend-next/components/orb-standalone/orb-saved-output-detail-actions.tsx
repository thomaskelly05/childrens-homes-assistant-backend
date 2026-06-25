'use client'

import { useMemo, useState } from 'react'
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  MessageSquare,
  Mic,
  PenLine,
  RefreshCw,
  Sparkles
} from 'lucide-react'

import { OrbPrivacyNotice } from '@/components/orb/privacy/orb-privacy-notice'
import {
  buildAskOrbAboutSavedOutputPrompt,
  buildSavedOutputExportMarkdown,
  downloadMarkdownFile,
  ORB_SAVED_OUTPUT_BOUNDARY_LINES,
  resolveSavedOutputRerun,
  type OrbSavedOutputRerunState
} from '@/lib/orb/orb-saved-output-adapters'
import { exportOrbSavedOutput, reuseOrbSavedOutput, type OrbSavedOutputRecord } from '@/lib/orb/standalone-client'

const RECORDS_ACTION_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-lg border border-sky-500/50 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-[var(--orb-mobile-ws-text,var(--orb-foreground))] hover:bg-sky-500/25'
const RECORDS_ACTION_SECONDARY =
  'inline-flex items-center gap-1 rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] px-2 py-1 text-xs text-[var(--orb-mobile-ws-text,var(--orb-foreground))] hover:bg-[var(--orb-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45'

export function OrbSavedOutputDetailActions({
  record,
  onNotice,
  onAskOrb,
  onSendToDictate,
  onOpenInOrbWrite,
  onUseInShiftBuilder,
  onReuseInChat,
  onArchive,
  onFinalise,
  onRerun,
  mobileStacked = false
}: {
  record: OrbSavedOutputRecord
  onNotice?: (message: string) => void
  onAskOrb?: (prompt: string) => void
  onSendToDictate?: (text: string) => void
  onOpenInOrbWrite?: () => void
  onUseInShiftBuilder?: (notes: string, focus?: string) => void
  onReuseInChat?: (prompt: string) => void
  onArchive?: () => void
  onFinalise?: () => void
  onRerun?: (state: OrbSavedOutputRerunState) => void
  mobileStacked?: boolean
}) {
  const [rerunNotice, setRerunNotice] = useState<string | null>(null)
  const rerun = useMemo(() => resolveSavedOutputRerun(record), [record])
  const isFinalised =
    record.metadata?.finalised === true || record.metadata?.workspace_status === 'finalised'

  const markdown = record.content_markdown || record.summary || ''

  async function handleCopy() {
    const text = markdown || buildSavedOutputExportMarkdown(record)
    await navigator.clipboard.writeText(text)
    onNotice?.('Copied to clipboard.')
  }

  async function handleExport() {
    try {
      const exported = await exportOrbSavedOutput(record.id, 'markdown')
      downloadMarkdownFile(exported.filename, exported.content)
      onNotice?.('Markdown downloaded.')
    } catch {
      const fallback = buildSavedOutputExportMarkdown(record)
      downloadMarkdownFile(record.title, fallback)
      onNotice?.('Markdown downloaded (local export).')
    }
  }

  async function handleAskOrb() {
    if (onAskOrb) {
      onAskOrb(buildAskOrbAboutSavedOutputPrompt(record))
      return
    }
    if (onReuseInChat) {
      try {
        const reuse = await reuseOrbSavedOutput(record.id, 'help me improve this saved output')
        onReuseInChat(reuse.suggested_prompt)
      } catch {
        onReuseInChat(buildAskOrbAboutSavedOutputPrompt(record))
      }
    }
  }

  function handleSendToDictate() {
    const text = markdown.trim()
    if (!text) {
      onNotice?.('No content to send to Dictate.')
      return
    }
    onSendToDictate?.(text)
  }

  function handleShiftBuilder() {
    const notes = String(record.metadata?.source_text || markdown).trim()
    if (!notes) {
      onNotice?.('No notes available for handover planning.')
      return
    }
    const focus = String(record.metadata?.focus || '')
    onUseInShiftBuilder?.(notes, focus || undefined)
  }

  function handleRerun() {
    if (!rerun) return
    if (!rerun.available) {
      setRerunNotice(rerun.reason || 'Re-run is not available for this output.')
      return
    }
    if (onRerun) {
      onRerun(rerun)
      return
    }
    setRerunNotice(rerun.reason || 'Re-run is not available from this view.')
  }

  return (
    <div className="space-y-3" data-orb-saved-output-detail-actions data-orb-records-detail-actions-mobile={mobileStacked ? 'true' : undefined}>
      {onOpenInOrbWrite ? (
        <button
          type="button"
          onClick={onOpenInOrbWrite}
          className={`${RECORDS_ACTION_PRIMARY} w-full justify-center sm:w-auto`}
          data-orb-saved-output-open-write
        >
          <PenLine className="h-4 w-4" aria-hidden />
          Open in ORB Write
        </button>
      ) : null}

      <div className={`flex flex-wrap gap-2 ${mobileStacked ? 'grid grid-cols-2' : ''}`}>
        {onReuseInChat ? (
          <button
            type="button"
            onClick={async () => {
              try {
                const reuse = await reuseOrbSavedOutput(record.id)
                onReuseInChat(reuse.suggested_prompt)
              } catch {
                onReuseInChat(buildAskOrbAboutSavedOutputPrompt(record))
              }
            }}
            className={RECORDS_ACTION_SECONDARY}
            data-orb-saved-output-reuse-chat
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Reuse in Chat
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={RECORDS_ACTION_SECONDARY}
          data-orb-saved-output-copy
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy
        </button>
        <button
          type="button"
          onClick={() => void handleExport()}
          className={RECORDS_ACTION_SECONDARY}
          data-orb-saved-output-export
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export
        </button>
        {onArchive ? (
          <button
            type="button"
            onClick={onArchive}
            className={RECORDS_ACTION_SECONDARY}
            data-orb-saved-output-archive
          >
            <Archive className="h-3.5 w-3.5" aria-hidden />
            Archive
          </button>
        ) : null}
        {onFinalise ? (
          <button
            type="button"
            onClick={onFinalise}
            disabled={isFinalised}
            className={RECORDS_ACTION_SECONDARY}
            data-orb-saved-output-finalise
            data-orb-saved-output-finalise-disabled={isFinalised ? 'true' : 'false'}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Finalise
          </button>
        ) : null}
        {(onAskOrb || onReuseInChat) ? (
          <button
            type="button"
            onClick={() => void handleAskOrb()}
            className={RECORDS_ACTION_SECONDARY}
            data-orb-saved-output-ask-orb
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            Ask ORB about this
          </button>
        ) : null}
        {onSendToDictate ? (
          <button
            type="button"
            onClick={handleSendToDictate}
            className={RECORDS_ACTION_SECONDARY}
            data-orb-saved-output-send-dictate
          >
            <Mic className="h-3.5 w-3.5" aria-hidden />
            Send to Dictate
          </button>
        ) : null}
        {onUseInShiftBuilder ? (
          <button
            type="button"
            onClick={handleShiftBuilder}
            className={RECORDS_ACTION_SECONDARY}
            data-orb-saved-output-shift-builder
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Create handover plan
          </button>
        ) : null}
        {rerun ? (
          <button
            type="button"
            onClick={handleRerun}
            disabled={!rerun.available && !onRerun}
            className={RECORDS_ACTION_SECONDARY}
            data-orb-saved-output-rerun
            data-orb-saved-output-rerun-available={rerun.available ? 'true' : 'false'}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {rerun.label}
          </button>
        ) : null}
      </div>

      {rerunNotice ? (
        <p className="text-xs text-amber-900 dark:text-amber-100" data-orb-saved-output-rerun-unavailable>
          {rerunNotice}
        </p>
      ) : rerun && !rerun.available ? (
        <p className="text-xs text-[var(--orb-read-text-secondary,#374151)]" data-orb-saved-output-rerun-unavailable>
          {rerun.reason}
        </p>
      ) : null}

      <OrbPrivacyNotice surface="export" className="text-left" />

      <ul
        className="space-y-1 text-[11px] leading-relaxed text-[var(--orb-read-text-secondary,#374151)]"
        data-orb-saved-output-boundary
      >
        {ORB_SAVED_OUTPUT_BOUNDARY_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
