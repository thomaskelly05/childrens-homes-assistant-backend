'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Copy, FileText, Loader2, MessageSquare, PenLine, Sparkles } from 'lucide-react'

import {
  OrbPremiumButton,
  OrbPremiumPill,
  OrbPremiumTextarea,
  OrbStudioEmptyState,
  OrbStudioGrid,
  OrbStudioPage,
  OrbStudioPanel,
  OrbStudioPrimaryAction
} from '@/components/orb/premium'
import { ORB_PREMIUM_ACTION_LABELS } from '@/components/orb/premium/orb-premium-theme'
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

/** Deprecated from primary nav; capability now lives in Chat/Templates/ORB Write/Dictate. */
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

  useEffect(() => {
    if (!open) return
    if (initialNotes) setShiftNotes(initialNotes)
    if (initialFocus) setFocus(initialFocus)
  }, [open, initialNotes, initialFocus])

  const hasInput = Boolean(shiftNotes.trim() || handoverText.trim() || chatOutput.trim())

  const combinedSourceNotes = useMemo(() => {
    return [shiftNotes.trim(), handoverText.trim(), chatOutput.trim()].filter(Boolean).join('\n\n')
  }, [shiftNotes, handoverText, chatOutput])

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
      <OrbStudioPage
        studioId="shift_builder"
        trustStrip={
          <ul className="space-y-1" data-orb-shift-builder-boundary>
            {ORB_SHIFT_BUILDER_BOUNDARY_LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        }
        primaryAction={
          <OrbStudioPrimaryAction
            disabled={loading || !hasInput}
            onClick={() => void runGenerate()}
            working={loading}
            className="w-full"
            data-orb-generate-shift-plan
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {ORB_PREMIUM_ACTION_LABELS.generateShiftPlan}
          </OrbStudioPrimaryAction>
        }
        advanced={
          <>
            <label className="block text-xs font-semibold text-[var(--orb-muted)]">
              Pasted handover (optional)
              <OrbPremiumTextarea
                data-orb-shift-handover-input
                value={handoverText}
                onChange={(e) => setHandoverText(e.target.value)}
                rows={3}
                placeholder="Previous handover or incoming notes…"
                className="orb-doc-input mt-1"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-[var(--orb-muted)]">
              Copied ORB chat output (optional)
              <OrbPremiumTextarea
                data-orb-shift-chat-input
                value={chatOutput}
                onChange={(e) => setChatOutput(e.target.value)}
                rows={3}
                placeholder="Paste a prior ORB answer to reshape into a shift plan…"
                className="orb-doc-input mt-1"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-[var(--orb-muted)]">
              Optional context (not live records)
              <OrbPremiumTextarea
                value={childContext}
                onChange={(e) => setChildContext(e.target.value)}
                rows={2}
                placeholder="e.g. two young people on unit, one on care plan review…"
                className="orb-doc-input mt-1"
              />
            </label>
            <div className="mt-3 space-y-2" data-orb-shift-context-tags>
              <p className="text-xs font-medium text-[var(--orb-muted)]">Context tags (optional)</p>
              <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Shift context tags">
                {SHIFT_BUILDER_CONTEXT_TAGS.map((tag) => (
                  <OrbPremiumPill
                    key={tag.id}
                    active={selectedTags.includes(tag.id)}
                    onClick={() => toggleTag(tag.id)}
                    data-orb-shift-context-tag={tag.id}
                  >
                    {tag.label}
                  </OrbPremiumPill>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-2" data-orb-shift-focus-selector>
              <p className="text-xs font-medium text-[var(--orb-muted)]">Output focus</p>
              <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Shift Builder focus modes">
                {SHIFT_BUILDER_FOCUS_MODES.map((item) => (
                  <OrbPremiumPill
                    key={item.focus}
                    active={focus === item.focus}
                    onClick={() => setFocus(item.focus)}
                    data-orb-shift-focus={item.focus}
                    title={item.description}
                  >
                    {item.label}
                  </OrbPremiumPill>
                ))}
              </div>
            </div>
          </>
        }
      >
        <OrbStudioGrid columns={result ? 2 : 1}>
          <OrbStudioPanel title="Shift notes" subtitle="Paste what happened on shift" panelId="shift-input">
            {!hasInput && !result ? (
              <OrbStudioEmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="No shift notes yet"
                description="Paste rough notes, handover text or ORB chat output, then generate a draft."
              />
            ) : null}

            <label className="block text-xs font-semibold text-[var(--orb-muted)]">
              Rough shift notes
              <OrbPremiumTextarea
                data-orb-shift-notes-input
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                rows={8}
                placeholder="What happened on shift — facts, child presentation, staff response…"
                className="orb-doc-input mt-1"
              />
            </label>

            {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
            {copyNote ? <p className="mt-2 text-xs font-medium text-[#0369A1]">{copyNote}</p> : null}
          </OrbStudioPanel>

          {result && outputView ? (
          <OrbStudioPanel title="Handover preview" subtitle="Generated shift plan" panelId="shift-output">
          <div className="space-y-4" data-orb-shift-builder-result>
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
                saveExtras={{
                  source_feature: 'shift_builder',
                  brain_metadata: result.brain_metadata,
                  source_text: combinedSourceNotes || undefined,
                  focus: result.focus
                }}
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
                  {ORB_PREMIUM_ACTION_LABELS.continueInChat}
                </button>
              ) : null}
            </div>
          </div>
          </OrbStudioPanel>
        ) : null}
        </OrbStudioGrid>
      </OrbStudioPage>
    </OrbStandalonePanelShell>
  )
}
