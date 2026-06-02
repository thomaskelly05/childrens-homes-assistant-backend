'use client'

import { useCallback, useMemo, useState } from 'react'
import { ClipboardList, Copy, FileText, Loader2, MessageSquare, PenLine, Sparkles } from 'lucide-react'

import { OrbIntelligenceOutput } from '@/components/orb-standalone/orb-intelligence-output'
import { OrbOutputSaveActions } from '@/components/orb-standalone/orb-output-save-actions'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  formatShiftBuilderMarkdown,
  ORB_SHIFT_BUILDER_BOUNDARY_LINES,
  SHIFT_BUILDER_CONTEXT_TAGS,
  SHIFT_BUILDER_FOCUS_MODES,
  shiftBuilderDisplayTitle,
  shiftBuilderToOutputView,
  type OrbShiftBuilderFocus,
  type OrbShiftBuilderResult
} from '@/lib/orb/shift-builder'
import { runOrbShiftBuilder } from '@/lib/orb/standalone-client'
import type { StandaloneProject } from '@/lib/orb/standalone-local-store'

export function OrbShiftBuilderPanel({
  open,
  onClose,
  onInsertIntoChat,
  onReuseInChat,
  onOpenDictate,
  onAskOrbImprove,
  onOpenSavedOutputs,
  projects,
  activeProjectId,
  activeProjectName,
  residentialSurface = false,
  initialNotes,
  initialFocus
}: {
  open: boolean
  onClose: () => void
  onInsertIntoChat?: (text: string) => void
  onReuseInChat?: (prompt: string) => void
  onOpenDictate?: (transcript: string) => void
  onAskOrbImprove?: (markdown: string, title: string) => void
  onOpenSavedOutputs?: () => void
  projects?: StandaloneProject[]
  activeProjectId?: string
  activeProjectName?: string
  residentialSurface?: boolean
  initialNotes?: string
  initialFocus?: OrbShiftBuilderFocus
}) {
  const [shiftNotes, setShiftNotes] = useState(initialNotes || '')
  const [handoverText, setHandoverText] = useState('')
  const [chatOutput, setChatOutput] = useState('')
  const [childContext, setChildContext] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [focus, setFocus] = useState<OrbShiftBuilderFocus>(initialFocus || 'full_shift_plan')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OrbShiftBuilderResult | null>(null)
  const [copyNote, setCopyNote] = useState<string | null>(null)

  const hasInput = Boolean(shiftNotes.trim() || handoverText.trim() || chatOutput.trim())

  const displayTitle = useMemo(() => {
    if (!result) return null
    return shiftBuilderDisplayTitle(result.focus, result.title)
  }, [result])

  const outputView = useMemo(() => {
    if (!result || !displayTitle) return null
    return shiftBuilderToOutputView(result, displayTitle)
  }, [displayTitle, result])

  const runGenerate = useCallback(async () => {
    const notes = shiftNotes.trim()
    const handover = handoverText.trim()
    const chat = chatOutput.trim()
    if (!notes && !handover && !chat) {
      setError('Add shift notes, a pasted handover or ORB chat output first.')
      return
    }
    setLoading(true)
    setError(null)
    setCopyNote(null)
    try {
      const generated = await runOrbShiftBuilder({
        shift_notes: notes || handover || chat,
        handover_text: handover || undefined,
        chat_output: chat || undefined,
        context_tags: selectedTags,
        focus,
        child_context: childContext.trim() || undefined
      })
      setResult(generated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shift Builder could not generate a plan.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [chatOutput, childContext, focus, handoverText, selectedTags, shiftNotes])

  function toggleTag(id: string) {
    setSelectedTags((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id]
    )
  }

  function handleContinueInChat() {
    if (!result || !displayTitle) return
    const markdown = formatShiftBuilderMarkdown(result, displayTitle)
    onInsertIntoChat?.(markdown)
    onReuseInChat?.(`Continue improving this shift plan (${displayTitle}):\n\n`)
  }

  function handleAskOrbImprove() {
    if (!result || !displayTitle) return
    const markdown = formatShiftBuilderMarkdown(result, displayTitle)
    if (onAskOrbImprove) {
      onAskOrbImprove(markdown, displayTitle)
      return
    }
    onReuseInChat?.(`Ask ORB to improve this shift plan:\n\n${markdown.slice(0, 2000)}`)
  }

  function handleSendToDictate() {
    if (!result || !displayTitle) return
    onOpenDictate?.(formatShiftBuilderMarkdown(result, displayTitle))
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Shift Builder"
      subtitle="Turn rough shift notes into priorities, handover, actions and reflection."
      onClose={onClose}
      panelId="shift_builder"
      ariaLabel="ORB Shift Builder"
      footer="ORB Residential — Powered by IndiCare Intelligence. Shift Builder uses only what you paste."
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <div className="orb-shift-builder-panel space-y-4 p-4" data-orb-shift-builder-panel>
        <ul
          className="orb-doc-glass-card space-y-1 rounded-xl border border-[var(--orb-line)] px-3 py-2.5 text-[11px] leading-5 text-[var(--orb-muted)]"
          data-orb-shift-builder-boundary
        >
          {ORB_SHIFT_BUILDER_BOUNDARY_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {!hasInput && !result ? (
          <div
            className="orb-doc-glass-card rounded-xl border border-dashed border-[var(--orb-line)] px-4 py-8 text-center"
            data-orb-shift-builder-empty
          >
            <ClipboardList className="mx-auto h-8 w-8 text-[var(--orb-muted)]" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--orb-foreground)]">No shift notes yet</p>
            <p className="mt-1 text-xs text-[var(--orb-muted)]">
              Paste rough notes, handover text or ORB chat output, then generate.
            </p>
          </div>
        ) : null}

        <label className="block text-xs font-semibold text-[var(--orb-muted)]">
          Rough shift notes
          <textarea
            data-orb-shift-notes-input
            value={shiftNotes}
            onChange={(e) => setShiftNotes(e.target.value)}
            rows={5}
            placeholder="What happened on shift — facts, child presentation, staff response…"
            className="orb-doc-input mt-1 w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]"
          />
        </label>

        <label className="block text-xs font-semibold text-[var(--orb-muted)]">
          Pasted handover (optional)
          <textarea
            data-orb-shift-handover-input
            value={handoverText}
            onChange={(e) => setHandoverText(e.target.value)}
            rows={3}
            placeholder="Previous handover or incoming notes…"
            className="orb-doc-input mt-1 w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]"
          />
        </label>

        <label className="block text-xs font-semibold text-[var(--orb-muted)]">
          Copied ORB chat output (optional)
          <textarea
            data-orb-shift-chat-input
            value={chatOutput}
            onChange={(e) => setChatOutput(e.target.value)}
            rows={3}
            placeholder="Paste a prior ORB answer to reshape into a shift plan…"
            className="orb-doc-input mt-1 w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]"
          />
        </label>

        <label className="block text-xs font-semibold text-[var(--orb-muted)]">
          Optional context (not live records)
          <textarea
            value={childContext}
            onChange={(e) => setChildContext(e.target.value)}
            rows={2}
            placeholder="e.g. two young people on unit, one on care plan review…"
            className="orb-doc-input mt-1 w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]"
          />
        </label>

        <div className="space-y-2" data-orb-shift-context-tags>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--orb-muted)]">
            Context tags (optional)
          </p>
          <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Shift context tags">
            {SHIFT_BUILDER_CONTEXT_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                role="option"
                aria-selected={selectedTags.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  selectedTags.includes(tag.id)
                    ? 'border-sky-400/40 bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                    : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
                }`}
                data-orb-shift-context-tag={tag.id}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2" data-orb-shift-focus-selector>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--orb-muted)]">
            Output focus
          </p>
          <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Shift Builder focus modes">
            {SHIFT_BUILDER_FOCUS_MODES.map((item) => (
              <button
                key={item.focus}
                type="button"
                role="option"
                aria-selected={focus === item.focus}
                onClick={() => setFocus(item.focus)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  focus === item.focus
                    ? 'border-sky-400/40 bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                    : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
                }`}
                data-orb-shift-focus={item.focus}
                title={item.description}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={loading || !hasInput}
          onClick={() => void runGenerate()}
          className="orb-doc-primary-btn inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed"
          data-orb-generate-shift-plan
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          Generate shift plan
        </button>

        {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
        {copyNote ? <p className="text-xs font-medium text-[#0369A1]">{copyNote}</p> : null}

        {result && outputView ? (
          <div className="space-y-4 border-t border-[var(--orb-line)] pt-4" data-orb-shift-builder-result>
            <OrbIntelligenceOutput
              output={outputView}
              onCopy={() => setCopyNote('Copied markdown to clipboard.')}
            />
            {projects?.length ? (
              <OrbOutputSaveActions
                output={outputView}
                suggestedType="intelligence_note"
                suggestedTitle={displayTitle || result.title}
                suggestedTags={['shift_builder', result.focus]}
                projects={projects}
                activeProjectId={activeProjectId}
                activeProjectName={activeProjectName}
                createdFrom="shift_builder"
                onReuseInChat={onReuseInChat}
                onNotice={setCopyNote}
              />
            ) : (
              <p className="text-[11px] text-[var(--orb-muted)]" data-orb-save-unavailable>
                Sign in and open a project to save outputs — copy and export are still available.
              </p>
            )}
            <div className="flex flex-wrap gap-2" data-orb-shift-output-actions>
              <button
                type="button"
                onClick={() => {
                  if (!displayTitle) return
                  void navigator.clipboard.writeText(formatShiftBuilderMarkdown(result, displayTitle))
                  setCopyNote('Copied markdown.')
                }}
                className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                data-orb-copy-shift-output
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!displayTitle) return
                  const blob = new Blob([formatShiftBuilderMarkdown(result, displayTitle)], {
                    type: 'text/markdown;charset=utf-8'
                  })
                  const url = URL.createObjectURL(blob)
                  const anchor = document.createElement('a')
                  anchor.href = url
                  anchor.download = `${displayTitle.replace(/[^\w\s-]/g, '').slice(0, 48) || 'shift-plan'}.md`
                  anchor.click()
                  URL.revokeObjectURL(url)
                  setCopyNote('Exported markdown file.')
                }}
                className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                data-orb-export-shift-output
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Export
              </button>
              <button
                type="button"
                onClick={handleAskOrbImprove}
                className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                data-orb-ask-orb-improve-shift
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                Ask ORB to improve this
              </button>
              {onOpenDictate ? (
                <button
                  type="button"
                  onClick={handleSendToDictate}
                  className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  data-orb-send-shift-to-dictate
                >
                  <PenLine className="h-3.5 w-3.5" aria-hidden />
                  Send to Dictate
                </button>
              ) : null}
              {onInsertIntoChat ? (
                <button
                  type="button"
                  onClick={handleContinueInChat}
                  className="orb-doc-secondary-btn rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  data-orb-continue-shift-in-chat
                >
                  Continue in ORB chat
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </OrbStandalonePanelShell>
  )
}
