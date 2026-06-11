'use client'

import { useMemo, useState } from 'react'
import {
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

export function OrbSavedOutputDetailActions({
  record,
  onNotice,
  onAskOrb,
  onSendToDictate,
  onOpenInOrbWrite,
  onUseInShiftBuilder,
  onReuseInChat,
  onRerun
}: {
  record: OrbSavedOutputRecord
  onNotice?: (message: string) => void
  onAskOrb?: (prompt: string) => void
  onSendToDictate?: (text: string) => void
  onOpenInOrbWrite?: () => void
  onUseInShiftBuilder?: (notes: string, focus?: string) => void
  onReuseInChat?: (prompt: string) => void
  onRerun?: (state: OrbSavedOutputRerunState) => void
}) {
  const [rerunNotice, setRerunNotice] = useState<string | null>(null)
  const rerun = useMemo(() => resolveSavedOutputRerun(record), [record])

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
      onNotice?.('No notes available for Shift Builder.')
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
    <div className="space-y-3" data-orb-saved-output-detail-actions>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
          data-orb-saved-output-copy
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy
        </button>
        <button
          type="button"
          onClick={() => void handleExport()}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
          data-orb-saved-output-export
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export .md
        </button>
        {(onAskOrb || onReuseInChat) ? (
          <button
            type="button"
            onClick={() => void handleAskOrb()}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-100"
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
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
            data-orb-saved-output-send-dictate
          >
            <Mic className="h-3.5 w-3.5" aria-hidden />
            Send to Dictate
          </button>
        ) : null}
        {onOpenInOrbWrite ? (
          <button
            type="button"
            onClick={onOpenInOrbWrite}
            className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-100"
            data-orb-saved-output-open-write
          >
            <PenLine className="h-3.5 w-3.5" aria-hidden />
            Open in ORB Write
          </button>
        ) : null}
        {onUseInShiftBuilder ? (
          <button
            type="button"
            onClick={handleShiftBuilder}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
            data-orb-saved-output-shift-builder
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Use in Shift Builder
          </button>
        ) : null}
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
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
            data-orb-saved-output-reuse-chat
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Reuse in chat
          </button>
        ) : null}
        {rerun ? (
          <button
            type="button"
            onClick={handleRerun}
            disabled={!rerun.available && !onRerun}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 disabled:opacity-40"
            data-orb-saved-output-rerun
            data-orb-saved-output-rerun-available={rerun.available ? 'true' : 'false'}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {rerun.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(markdown)
            onNotice?.('Full content copied.')
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
          data-orb-saved-output-copy-full
        >
          <PenLine className="h-3.5 w-3.5" aria-hidden />
          Copy full content
        </button>
      </div>

      {rerunNotice ? (
        <p className="text-xs text-amber-300/90" data-orb-saved-output-rerun-unavailable>
          {rerunNotice}
        </p>
      ) : rerun && !rerun.available ? (
        <p className="text-xs text-slate-500" data-orb-saved-output-rerun-unavailable>
          {rerun.reason}
        </p>
      ) : null}

      <OrbPrivacyNotice surface="export" className="text-left" />

      <ul className="space-y-1 text-[11px] leading-relaxed text-slate-500" data-orb-saved-output-boundary>
        {ORB_SAVED_OUTPUT_BOUNDARY_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
