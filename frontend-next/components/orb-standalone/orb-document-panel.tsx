'use client'

import { useCallback, useState } from 'react'
import { Copy, FileText, Loader2 } from 'lucide-react'

import {
  OrbIntelligenceOutput,
  understandingToIntelligenceOutput
} from '@/components/orb-standalone/orb-intelligence-output'
import { OrbOutputSaveActions } from '@/components/orb-standalone/orb-output-save-actions'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
/** Action plan rendering: orb-action-plan (via orb-intelligence-output) */
import type { StandaloneProject } from '@/lib/orb/standalone-local-store'
import {
  analyseOrbStandaloneDocument,
  type OrbDocumentAnalysisMode,
  type OrbDocumentUnderstanding,
  uploadOrbStandaloneDocument
} from '@/lib/orb/standalone-client'

type DocumentTab = 'analyse' | 'action_plan' | 'briefing' | 'compare'

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
  onReuseInChat
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
}) {
  const [title, setTitle] = useState('Uploaded document')
  const [sourceType, setSourceType] = useState('user_uploaded')
  const [text, setText] = useState(initialText || '')
  const [tab, setTab] = useState<DocumentTab>('analyse')
  const [mode, setMode] = useState<OrbDocumentAnalysisMode>('explain')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [understanding, setUnderstanding] = useState<OrbDocumentUnderstanding | null>(null)
  const [copyNote, setCopyNote] = useState<string | null>(null)

  function selectTab(next: DocumentTab) {
    setTab(next)
    setMode(TAB_MODES[next])
  }

  const runAnalyse = useCallback(async () => {
    const body = text.trim()
    if (!body) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [mode, onDocumentContext, sourceId, text, title])

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
      subtitle="Upload, paste or analyse standalone documents."
      onClose={onClose}
      panelId="documents"
      ariaLabel="ORB documents"
      footer="Uploaded documents are standalone context unless you choose to save them elsewhere."
    >
      <div className="space-y-4 p-4" data-orb-document-panel>
        <p className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2.5 text-[11px] leading-5 text-emerald-100/90">
          Documents here are standalone context. They are not added to IndiCare OS records.
        </p>

        <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06]" role="tablist" aria-label="Document actions">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => selectTab(item.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === item.id ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const area = document.querySelector<HTMLTextAreaElement>('[data-orb-doc-paste]')
              area?.focus()
            }}
            className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06]"
          >
            Paste document
          </button>
          <label className="inline-flex cursor-pointer items-center rounded-full border border-white/12 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06]">
            Upload file
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
        </div>

        <label className="block text-xs text-slate-400">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Document text
          <textarea
            data-orb-doc-paste
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Paste policy, inspection notes, or guidance…"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runAnalyse()}
            className="inline-flex flex-1 min-w-[10rem] items-center justify-center gap-2 rounded-xl bg-cyan-500/20 py-2.5 text-sm font-semibold text-cyan-50 disabled:opacity-50"
            data-orb-analyse-document
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
            Analyse document
          </button>
          <button
            type="button"
            disabled={loading || !text.trim()}
            onClick={() => {
              selectTab('action_plan')
              void runAnalyse()
            }}
            className="rounded-xl border border-white/12 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
            data-orb-create-action-plan
          >
            Create action plan
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              selectTab('briefing')
              setMode('manager_briefing')
              await runAnalyse()
            }}
            className="rounded-xl border border-white/12 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
          >
            Create manager briefing
          </button>
          {onRunDeepResearch ? (
            <button
              type="button"
              onClick={() => onRunDeepResearch(docContext())}
              className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2.5 text-xs font-medium text-violet-100"
              data-orb-run-deep-research
            >
              Run Deep Research from this document
            </button>
          ) : null}
        </div>

        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        {copyNote ? <p className="text-xs text-emerald-300/90">{copyNote}</p> : null}

        {understanding ? (
          <div className="space-y-4 border-t border-white/[0.06] pt-4">
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
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy markdown
              </button>
              {onOpenSavedOutputs ? (
                <button
                  type="button"
                  onClick={onOpenSavedOutputs}
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
                >
                  Open Saved Outputs
                </button>
              ) : null}
              {onRunDocumentAnalysisAgent ? (
                <button
                  type="button"
                  onClick={() => onRunDocumentAnalysisAgent(docContext())}
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
                >
                  Run Document Analysis Agent
                </button>
              ) : null}
              {onInsertIntoChat ? (
                <button
                  type="button"
                  onClick={() => onInsertIntoChat(formatForChat())}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300"
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
