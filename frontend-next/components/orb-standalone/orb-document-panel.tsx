'use client'

import { useCallback, useState } from 'react'
import { Copy, FileText, Loader2 } from 'lucide-react'

import {
  OrbIntelligenceOutput,
  understandingToIntelligenceOutput
} from '@/components/orb-standalone/orb-intelligence-output'
import { OrbOutputSaveActions } from '@/components/orb-standalone/orb-output-save-actions'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import type { StandaloneProject } from '@/lib/orb/standalone-local-store'
import {
  analyseOrbStandaloneDocument,
  type OrbDocumentAnalysisMode,
  type OrbDocumentUnderstanding,
  uploadOrbStandaloneDocument
} from '@/lib/orb/standalone-client'

type DocumentTab = 'analyse' | 'action_plan' | 'briefing' | 'compare'
type InputTab = 'paste' | 'upload'

const TAB_MODES: Record<DocumentTab, OrbDocumentAnalysisMode> = {
  analyse: 'explain',
  action_plan: 'action_plan',
  briefing: 'manager_briefing',
  compare: 'policy_comparison'
}

const TABS: { id: DocumentTab; label: string }[] = [
  { id: 'analyse', label: 'Analyse' },
  { id: 'action_plan', label: 'Action plan' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'compare', label: 'Compare' }
]

export function OrbDocumentPanel({
  open,
  onClose,
  onInsertIntoChat,
  onDocumentContext,
  onRunDeepResearch,
  onRunDocumentAnalysisAgent,
  onOpenSavedOutputs,
  initialText,
  projects,
  activeProjectId,
  activeProjectName,
  onReuseInChat,
  residentialSurface = false
}: {
  open: boolean
  onClose: () => void
  onInsertIntoChat?: (text: string) => void
  onDocumentContext?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  onRunDeepResearch?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  onRunDocumentAnalysisAgent?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  onOpenSavedOutputs?: () => void
  initialText?: string
  projects?: StandaloneProject[]
  activeProjectId?: string
  activeProjectName?: string
  onReuseInChat?: (prompt: string) => void
  residentialSurface?: boolean
}) {
  const [title, setTitle] = useState('Uploaded document')
  const [sourceType, setSourceType] = useState('user_uploaded')
  const [text, setText] = useState(initialText || '')
  const [inputTab, setInputTab] = useState<InputTab>('paste')
  const [tab, setTab] = useState<DocumentTab>('analyse')
  const [mode, setMode] = useState<OrbDocumentAnalysisMode>('explain')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [understanding, setUnderstanding] = useState<OrbDocumentUnderstanding | null>(null)
  const [copyNote, setCopyNote] = useState<string | null>(null)
  const [closeAfterAnalyse, setCloseAfterAnalyse] = useState(false)

  const hasContent = Boolean(text.trim() || sourceId)

  function selectTab(next: DocumentTab) {
    setTab(next)
    setMode(TAB_MODES[next])
  }

  const runAnalyse = useCallback(async () => {
    const body = text.trim()
    if (!body && !sourceId) {
      setError('Paste or upload document text first.')
      return
    }
    setLoading(true)
    setError(null)
    setCopyNote(null)
    try {
      const result = await analyseOrbStandaloneDocument({
        mode,
        source_id: sourceId || undefined,
        title: title.trim() || 'Document',
        text: sourceId ? undefined : body
      })
      setUnderstanding(result.understanding)
      onDocumentContext?.({
        text: text.trim(),
        title: title.trim() || result.understanding.title,
        sourceId: sourceId || result.understanding.source_id || null
      })
      if (closeAfterAnalyse) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [closeAfterAnalyse, mode, onClose, onDocumentContext, sourceId, text, title])

  async function handleFileUpload(file: File) {
    setLoading(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
      const content_base64 = btoa(binary)
      const uploaded = await uploadOrbStandaloneDocument({
        title: file.name.replace(/\.[^.]+$/, '') || title,
        content_base64,
        file_name: file.name,
        content_type: file.type || undefined,
        source_type: sourceType
      })
      setSourceId(uploaded.source_id)
      setTitle(uploaded.title)
      setCopyNote(`Indexed ${uploaded.chunk_count} passages in Knowledge Library.`)
      onDocumentContext?.({ text: text.trim(), title: uploaded.title, sourceId: uploaded.source_id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  function docContext() {
    return {
      text: text.trim(),
      title: title.trim() || understanding?.title || 'Document',
      sourceId: sourceId || understanding?.source_id || null
    }
  }

  function formatForChat(): string {
    if (!understanding) return ''
    const parts = [
      `# ${understanding.title}`,
      understanding.plain_english_summary,
      understanding.key_themes?.length ? `\nThemes: ${understanding.key_themes.join(', ')}` : '',
      understanding.safety_notice ? `\n${understanding.safety_notice}` : ''
    ]
    const actions = understanding.action_plan?.actions || []
    if (actions.length) {
      parts.push('\n## Actions (draft)')
      for (const a of actions) {
        parts.push(`- [${a.priority}] ${a.action}`)
      }
    }
    return parts.filter(Boolean).join('\n')
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Documents"
      subtitle="Analyse uploaded or pasted documents — policies, guidance, inspection letters, templates and contracts. For quality-review of your own recording, use Review."
      onClose={onClose}
      panelId="documents"
      ariaLabel="ORB documents"
      footer="Documents analysed here are standalone ORB Residential documents. They are not saved to live IndiCare OS records unless you choose to save them."
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <div className="orb-document-panel space-y-4 p-4" data-orb-document-panel>
        <p className="orb-doc-glass-card rounded-xl border border-[var(--orb-line)] px-3 py-2.5 text-[11px] leading-5 text-[var(--orb-muted)]">
          Documents analysed here are not saved to live IndiCare OS records unless you choose to save them.
        </p>

        {!hasContent && !understanding ? (
          <div
            className="orb-doc-glass-card rounded-xl border border-dashed border-[var(--orb-line)] px-4 py-8 text-center"
            data-orb-document-empty
          >
            <FileText className="mx-auto h-8 w-8 text-[var(--orb-muted)]" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--orb-foreground)]">No document yet</p>
            <p className="mt-1 text-xs text-[var(--orb-muted)]">Paste text or upload a file to analyse with ORB.</p>
          </div>
        ) : null}

        <div
          className="flex flex-wrap gap-1 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-1"
          role="tablist"
          aria-label="Document actions"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => selectTab(item.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === item.id
                  ? 'border border-sky-400/30 bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                  : 'text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          className="flex gap-1 rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-0.5"
          role="tablist"
          aria-label="Input method"
        >
          {(
            [
              { id: 'paste' as const, label: 'Paste text' },
              { id: 'upload' as const, label: 'Upload file' }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={inputTab === item.id}
              onClick={() => setInputTab(item.id)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                inputTab === item.id
                  ? 'bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                  : 'text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {inputTab === 'upload' ? (
          <label className="orb-doc-upload-zone flex cursor-pointer flex-col items-center justify-center rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-4 py-6 text-center hover:bg-[var(--orb-surface-hover)]">
            <span className="text-sm font-semibold text-[var(--orb-foreground)]">Upload file</span>
            <span className="mt-1 text-xs text-[var(--orb-muted)]">.txt, .md, .pdf, .docx</span>
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFileUpload(file)
              }}
            />
          </label>
        ) : null}

        <label className="block text-xs font-semibold text-[var(--orb-muted)]">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="orb-doc-input mt-1 w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]"
          />
        </label>
        {inputTab === 'paste' ? (
          <label className="block text-xs font-semibold text-[var(--orb-muted)]">
            Document text
            <textarea
              data-orb-doc-paste
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Paste policy, inspection notes, or guidance…"
              className="orb-doc-input mt-1 w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]"
            />
          </label>
        ) : null}

        <label className="flex items-center gap-2 text-xs text-[var(--orb-muted)]">
          <input
            type="checkbox"
            checked={closeAfterAnalyse}
            onChange={(e) => setCloseAfterAnalyse(e.target.checked)}
            className="rounded border-[var(--orb-line)]"
          />
          Close panel after analysis
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || !hasContent}
            onClick={() => void runAnalyse()}
            className="orb-doc-primary-btn inline-flex flex-1 min-w-[10rem] items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed"
            data-orb-analyse-document
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
            Analyse document
          </button>
          <button
            type="button"
            disabled={loading || !hasContent}
            onClick={() => {
              selectTab('action_plan')
              void runAnalyse()
            }}
            className="orb-doc-secondary-btn rounded-xl border px-3 py-2.5 text-xs font-semibold disabled:cursor-not-allowed"
            data-orb-create-action-plan
          >
            Create action plan
          </button>
        </div>

        {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
        {copyNote ? <p className="text-xs font-medium text-[#0369A1]">{copyNote}</p> : null}

        {understanding ? (
          <div className="space-y-4 border-t border-[#CBD5E1] pt-4">
            <OrbIntelligenceOutput
              output={understandingToIntelligenceOutput(understanding)}
              onCopy={() => setCopyNote('Copied markdown to clipboard.')}
            />
            {projects?.length ? (
              <OrbOutputSaveActions
                output={understandingToIntelligenceOutput(understanding)}
                suggestedType={
                  mode === 'action_plan'
                    ? 'action_plan'
                    : mode === 'manager_briefing'
                      ? 'manager_briefing'
                      : mode === 'staff_briefing'
                        ? 'staff_briefing'
                        : 'document_review'
                }
                suggestedTitle={understanding.title}
                projects={projects}
                activeProjectId={activeProjectId}
                activeProjectName={activeProjectName}
                createdFrom="document_analysis"
                createdFromId={understanding.source_id || undefined}
                onReuseInChat={onReuseInChat}
                onNotice={setCopyNote}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(formatForChat())
                  setCopyNote('Copied markdown.')
                }}
                className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy markdown
              </button>
              {onInsertIntoChat ? (
                <button
                  type="button"
                  onClick={() => onInsertIntoChat(formatForChat())}
                  className="orb-doc-secondary-btn rounded-lg border px-3 py-1.5 text-xs font-semibold"
                >
                  Insert into chat
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </OrbStandalonePanelShell>
  )
}
