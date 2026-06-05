'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, FileText, Link2, Loader2, MessageSquare, Sparkles, Upload } from 'lucide-react'

import {
  OrbPremiumButton,
  OrbPremiumEmptyState,
  OrbPremiumInput,
  OrbPremiumPage,
  OrbPremiumTabs,
  OrbPremiumTextarea,
  OrbPremiumToolbar,
  OrbPremiumTrustStrip
} from '@/components/orb/premium'
import { ORB_PREMIUM_ACTION_LABELS } from '@/components/orb/premium/orb-premium-theme'
import { OrbIntelligenceOutput } from '@/components/orb-standalone/orb-intelligence-output'
import {
  documentIntelligenceToOutputView,
  documentIntelligenceDisplayTitle,
  exportDocumentIntelligenceMarkdown,
  ORB_DOCUMENT_BOUNDARY_LINES,
  RESIDENTIAL_FIRST_CLASS_LENSES,
  type OrbDocumentIntelligenceResult,
  type OrbDocumentLens
} from '@/lib/orb/document-intelligence'
import { OrbOutputSaveActions } from '@/components/orb-standalone/orb-output-save-actions'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import type { StandaloneProject } from '@/lib/orb/standalone-local-store'
import { OrbKnowledgeOfficialGuidanceSection } from '@/components/orb-standalone/knowledge-library/orb-knowledge-official-guidance-section'
import { OrbKnowledgeHomeDocumentsSection } from '@/components/orb-standalone/knowledge-library/orb-knowledge-home-documents-section'
import {
  matchOrbRecordingTypesForDocument,
  resolveOrbRecordingRecordType
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordType, OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types'
import {
  analyseOrbStandaloneDocument,
  runOrbDocumentIntelligence,
  uploadOrbStandaloneDocument
} from '@/lib/orb/standalone-client'

type InputTab = 'paste' | 'upload'
type KnowledgeLibraryTab = 'official' | 'home' | 'uploaded' | 'analyse'

export function OrbDocumentPanel({
  open,
  onClose,
  onInsertIntoChat,
  onDocumentContext,
  onIntelligenceResult,
  onAskOrbAboutDocument,
  onRunDeepResearch,
  onRunDocumentAnalysisAgent,
  onOpenSavedOutputs,
  initialText,
  projects,
  activeProjectId,
  activeProjectName,
  onReuseInChat,
  residentialSurface = false,
  initialLens = 'explain',
  initialRecordTypeId
}: {
  open: boolean
  onClose: () => void
  onInsertIntoChat?: (text: string) => void
  onDocumentContext?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  onIntelligenceResult?: (result: OrbDocumentIntelligenceResult | null) => void
  onAskOrbAboutDocument?: (payload: { markdown: string; title: string; lens: OrbDocumentLens }) => void
  onRunDeepResearch?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  onRunDocumentAnalysisAgent?: (ctx: { text: string; title: string; sourceId: string | null }) => void
  onOpenSavedOutputs?: () => void
  initialText?: string
  projects?: StandaloneProject[]
  activeProjectId?: string
  activeProjectName?: string
  onReuseInChat?: (prompt: string) => void
  residentialSurface?: boolean
  initialLens?: OrbDocumentLens
  initialRecordTypeId?: OrbRecordingRecordTypeId | string
}) {
  const [title, setTitle] = useState('Uploaded document')
  const [sourceType, setSourceType] = useState('user_uploaded')
  const [text, setText] = useState(initialText || '')
  const [inputTab, setInputTab] = useState<InputTab>('paste')
  const [selectedLens, setSelectedLens] = useState<OrbDocumentLens>(initialLens)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [result, setResult] = useState<OrbDocumentIntelligenceResult | null>(null)
  const [copyNote, setCopyNote] = useState<string | null>(null)
  const [closeAfterAnalyse, setCloseAfterAnalyse] = useState(false)
  const [selectedRecordTypeId, setSelectedRecordTypeId] = useState<OrbRecordingRecordTypeId | ''>(
    (initialRecordTypeId as OrbRecordingRecordTypeId) || ''
  )
  const [libraryTab, setLibraryTab] = useState<KnowledgeLibraryTab>(
    initialRecordTypeId ? 'official' : 'analyse'
  )
  const [librarySearch, setLibrarySearch] = useState('')

  useEffect(() => {
    if (!open) return
    if (initialText) setText(initialText)
    if (initialLens) setSelectedLens(initialLens)
    if (initialRecordTypeId) {
      setSelectedRecordTypeId(initialRecordTypeId as OrbRecordingRecordTypeId)
      setLibraryTab('official')
    }
  }, [open, initialText, initialLens, initialRecordTypeId])

  const hasContent = Boolean(text.trim() || sourceId)

  const suggestedRecordTypes = useMemo(
    () => (text.trim().length > 40 ? matchOrbRecordingTypesForDocument(text) : []),
    [text]
  )

  const selectedRecordType = useMemo(
    () =>
      selectedRecordTypeId
        ? resolveOrbRecordingRecordType({ recordTypeId: selectedRecordTypeId })
        : suggestedRecordTypes[0] ?? null,
    [selectedRecordTypeId, suggestedRecordTypes]
  )
  const heroLens = RESIDENTIAL_FIRST_CLASS_LENSES.find((item) => item.hero)
  const standardLenses = RESIDENTIAL_FIRST_CLASS_LENSES.filter((item) => !item.hero)

  const displayTitle = useMemo(() => {
    if (!result) return null
    return documentIntelligenceDisplayTitle(
      result.lens,
      title.trim() || result.source_document_title || result.title,
      text
    )
  }, [result, text, title])

  const outputView = useMemo(() => {
    if (!result || !displayTitle) return null
    return documentIntelligenceToOutputView(result, displayTitle)
  }, [displayTitle, result])

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
      const intelligence = await runOrbDocumentIntelligence({
        lens: selectedLens as import('@/lib/orb/standalone-client').OrbDocumentLens,
        document_text: sourceId ? undefined : body,
        document_source_id: sourceId || undefined,
        document_title: title.trim() || 'Document',
        mode: 'Ask ORB'
      })
      setResult(intelligence)
      onIntelligenceResult?.(intelligence)
      onDocumentContext?.({
        text: text.trim(),
        title: title.trim() || intelligence.source_document_title || intelligence.title,
        sourceId: sourceId || null
      })
      if (closeAfterAnalyse) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setResult(null)
      onIntelligenceResult?.(null)
    } finally {
      setLoading(false)
    }
  }, [
    closeAfterAnalyse,
    onClose,
    onDocumentContext,
    onIntelligenceResult,
    selectedLens,
    sourceId,
    text,
    title
  ])

  async function runPolicyCompare() {
    const body = text.trim()
    if (!body && !sourceId) {
      setError('Paste or upload document text first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const analysed = await analyseOrbStandaloneDocument({
        mode: 'policy_comparison',
        source_id: sourceId || undefined,
        title: title.trim() || 'Document',
        text: sourceId ? undefined : body
      })
      setCopyNote('Policy comparison draft ready — use Save or Ask ORB to continue.')
      onDocumentContext?.({
        text: text.trim(),
        title: analysed.understanding.title,
        sourceId: sourceId || analysed.understanding.source_id || null
      })
      onInsertIntoChat?.(
        `# ${analysed.understanding.title}\n\n${analysed.understanding.plain_english_summary}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

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

  function handleAskOrb() {
    if (!result || !displayTitle) return
    const markdown = exportDocumentIntelligenceMarkdown(result, displayTitle)
    if (onAskOrbAboutDocument) {
      onAskOrbAboutDocument({ markdown, title: displayTitle, lens: result.lens })
      return
    }
    onInsertIntoChat?.(markdown)
    onReuseInChat?.(`Ask ORB about this document output (${result.lens}): ${displayTitle}`)
  }

  const docContext = () => ({
    text: text.trim(),
    title: title.trim() || result?.title || 'Document',
    sourceId: sourceId || null
  })

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Documents & Guidance"
      subtitle="Official guidance, useful links and home documents that support ORB Residential."
      onClose={onClose}
      panelId="documents"
      ariaLabel="ORB Knowledge Library and documents"
      footer="ORB Residential — Powered by IndiCare Intelligence. Documents use only what you upload or paste."
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <OrbPremiumPage
        panelId="documents"
        className="orb-document-panel"
        toolbar={
          <OrbPremiumToolbar
            searchValue={librarySearch}
            onSearchChange={setLibrarySearch}
            searchPlaceholder="Search guidance, home documents and uploads…"
          />
        }
        tabs={
          <OrbPremiumTabs
          ariaLabel="Knowledge Library sections"
          activeId={libraryTab}
          onChange={setLibraryTab}
          tabs={[
            { id: 'official', label: 'Official Guidance' },
            { id: 'home', label: 'My Home Documents' },
            { id: 'uploaded', label: 'Uploaded Documents' },
            { id: 'analyse', label: 'Analyse a Document' }
          ]}
            data-orb-knowledge-library-tabs
          />
        }
      >
        {libraryTab === 'home' ? (
          <OrbPremiumTrustStrip tone="muted">
            Add approved home policies, useful guidance or local protocols. Draft items are not authoritative until
            approved.
          </OrbPremiumTrustStrip>
        ) : null}

        {libraryTab === 'official' ? (
          <OrbKnowledgeOfficialGuidanceSection
            recordTypeFilter={selectedRecordTypeId || undefined}
            onUseWithOrb={(entry) => {
              onReuseInChat?.(
                `Use official guidance (${entry.title}) from ${entry.publisher}. Link: ${entry.url}. Do not quote statutory text unless uploaded.`
              )
            }}
            onLinkRecordType={(id) => setSelectedRecordTypeId(id as OrbRecordingRecordTypeId)}
          />
        ) : null}

        {libraryTab === 'home' ? (
          <OrbKnowledgeHomeDocumentsSection
            initialRecordTypeId={selectedRecordTypeId || initialRecordTypeId}
            onUseInOrb={(item) => {
              const statusNote =
                item.approval_status === 'approved'
                  ? 'This is an approved home/provider document.'
                  : `Status: ${item.approval_status} — treat as non-authoritative until approved.`
              onReuseInChat?.(
                `${statusNote}\n\nHome document: ${item.title}\n${item.content_text?.slice(0, 1500) ?? item.url ?? ''}`
              )
            }}
          />
        ) : null}

        {libraryTab === 'uploaded' ? (
          <OrbPremiumEmptyState
            title="Uploaded documents"
            body="Upload and paste tools live in Analyse a Document. Indexed passages sync to the Knowledge Library when signed in."
            actions={
              <OrbPremiumButton variant="secondary" onClick={() => setLibraryTab('analyse')}>
                {ORB_PREMIUM_ACTION_LABELS.analyseWithOrb}
              </OrbPremiumButton>
            }
          />
        ) : null}

        {libraryTab === 'analyse' ? (
        <>
        <section className="space-y-2" data-orb-document-record-type-section>
          <label className="text-xs font-semibold text-[var(--orb-foreground)]" htmlFor="orb-document-record-type">
            Review against record type
          </label>
          <select
            id="orb-document-record-type"
            value={selectedRecordTypeId || selectedRecordType?.id || ''}
            onChange={(e) => setSelectedRecordTypeId(e.target.value as OrbRecordingRecordTypeId)}
            className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
            data-orb-document-record-type-select
          >
            <option value="">Choose record type…</option>
            {suggestedRecordTypes.map((r: OrbRecordingRecordType) => (
              <option key={r.id} value={r.id}>
                {r.label} (suggested)
              </option>
            ))}
          </select>
          {selectedRecordType ? (
            <div className="rounded-lg border border-[var(--orb-line)]/50 p-3 text-xs text-[var(--orb-muted)]" data-orb-document-record-type-card>
              <p className="font-medium text-[var(--orb-foreground)]">{selectedRecordType.label}</p>
              <p className="mt-1">{selectedRecordType.purpose}</p>
              <p className="mt-2">
                <span className="font-medium text-[var(--orb-foreground)]">Related outputs: </span>
                {selectedRecordType.suggested_outputs
                  .slice(0, 5)
                  .map((id) => resolveOrbRecordingRecordType({ recordTypeId: id }).label)
                  .join(' · ')}
              </p>
            </div>
          ) : null}
        </section>

        <section data-orb-document-upload-section className="space-y-3">
        <ul
          className="orb-doc-glass-card space-y-1 rounded-xl border border-[var(--orb-line)] px-3 py-2.5 text-[11px] leading-5 text-[var(--orb-muted)]"
          data-orb-document-boundary
        >
          {ORB_DOCUMENT_BOUNDARY_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {!hasContent && !result ? (
          <OrbPremiumEmptyState
            icon={FileText}
            title="No document yet"
            body="Paste text or upload a file, choose a lens, then analyse with ORB."
            dataAttr="document-empty"
            actions={
              <>
                <OrbPremiumButton variant="secondary" onClick={() => setInputTab('upload')}>
                  <Upload className="h-4 w-4" aria-hidden />
                  Upload document
                </OrbPremiumButton>
                <OrbPremiumButton variant="ghost" onClick={() => setInputTab('paste')}>
                  Paste text
                </OrbPremiumButton>
                <OrbPremiumButton variant="ghost" onClick={() => setLibraryTab('home')}>
                  <Link2 className="h-4 w-4" aria-hidden />
                  {ORB_PREMIUM_ACTION_LABELS.addDocumentOrLink}
                </OrbPremiumButton>
              </>
            }
          />
        ) : null}

        <div
          className="flex gap-1 rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-0.5"
          role="tablist"
          aria-label="Input method"
        >
          {(
            [
              { id: 'paste' as const, label: 'Paste text' },
              { id: 'upload' as const, label: 'Upload document' }
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
              data-orb-document-input-tab={item.id}
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
          Document title
          <OrbPremiumInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="orb-doc-input mt-1"
          />
        </label>
        {inputTab === 'paste' ? (
          <label className="block text-xs font-semibold text-[var(--orb-muted)]">
            Document text
            <OrbPremiumTextarea
              data-orb-doc-paste
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Paste policy, Reg 44 report, inspection notes or guidance…"
              className="orb-doc-input mt-1"
            />
          </label>
        ) : null}
        </section>

        <section data-orb-document-lens-section>
        <div className="space-y-2" data-orb-document-lens-selector>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--orb-muted)]">
            Choose a lens
          </p>
          {heroLens ? (
            <button
              type="button"
              onClick={() => setSelectedLens(heroLens.lens)}
              className={`orb-doc-policy-card-hero flex w-full flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition ${
                selectedLens === heroLens.lens
                  ? 'border-sky-400/50 bg-sky-500/10 ring-1 ring-sky-400/30'
                  : 'border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] hover:bg-[var(--orb-surface-hover)]'
              }`}
              data-orb-policy-card-hero
              data-orb-document-lens={heroLens.lens}
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--orb-foreground)]">
                <Sparkles className="h-4 w-4 text-sky-400" aria-hidden />
                {heroLens.label}
              </span>
              <span className="text-xs text-[var(--orb-muted)]">{heroLens.description}</span>
            </button>
          ) : null}
          <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Document lenses">
            {standardLenses.map((item) => (
              <button
                key={item.lens}
                type="button"
                role="option"
                aria-selected={selectedLens === item.lens}
                onClick={() => setSelectedLens(item.lens)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  selectedLens === item.lens
                    ? 'border-sky-400/40 bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                    : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
                }`}
                data-orb-document-lens={item.lens}
                title={item.description}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        </section>

        <label className="flex items-center gap-2 text-xs text-[var(--orb-muted)]">
          <input
            type="checkbox"
            checked={closeAfterAnalyse}
            onChange={(e) => setCloseAfterAnalyse(e.target.checked)}
            className="rounded border-[var(--orb-line)]"
          />
          Close panel after analysis
        </label>

        <OrbPremiumTrustStrip>
          ORB analyses only what you paste or upload. It does not auto-update statutory guidance or make regulatory
          judgements.
        </OrbPremiumTrustStrip>

        <div className="flex flex-wrap gap-2">
          <OrbPremiumButton
            disabled={loading || !hasContent}
            onClick={() => void runAnalyse()}
            className="orb-doc-primary-btn min-w-[10rem] flex-1"
            data-orb-analyse-document
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {ORB_PREMIUM_ACTION_LABELS.analyseWithOrb}
          </OrbPremiumButton>
          <button
            type="button"
            disabled={loading || !hasContent}
            onClick={() => {
              setSelectedLens('actions')
              void runAnalyse()
            }}
            className="orb-doc-secondary-btn rounded-xl border px-3 py-2.5 text-xs font-semibold disabled:cursor-not-allowed"
            data-orb-create-action-plan
          >
            Action plan
          </button>
        </div>

        {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
        {copyNote ? <p className="text-xs font-medium text-[#0369A1]">{copyNote}</p> : null}

        {result && outputView ? (
          <section className="space-y-4 border-t border-[var(--orb-line)] pt-4" data-orb-document-output-section data-orb-document-result>
            <OrbIntelligenceOutput
              output={outputView}
              onCopy={() => setCopyNote('Copied markdown to clipboard.')}
            />
            {projects?.length ? (
              <OrbOutputSaveActions
                output={outputView}
                suggestedType={
                  result.lens === 'actions' || result.lens === 'policy_card'
                    ? result.lens === 'actions'
                      ? 'action_plan'
                      : 'document_review'
                    : 'document_review'
                }
                suggestedTitle={displayTitle || result.title}
                projects={projects}
                activeProjectId={activeProjectId}
                activeProjectName={activeProjectName}
                createdFrom={result.lens === 'policy_card' ? 'policy_card' : 'document_intelligence'}
                saveExtras={{
                  source_feature: result.lens === 'policy_card' ? 'policy_card' : 'document_intelligence',
                  brain_metadata: result.brain_metadata,
                  source_text: text.trim() || undefined,
                  lens: result.lens
                }}
                onReuseInChat={onReuseInChat}
                onNotice={setCopyNote}
              />
            ) : (
              <p className="text-[11px] text-[var(--orb-muted)]" data-orb-save-unavailable>
                Sign in and open a project to save outputs — copy and export are still available.
              </p>
            )}
            <div className="flex flex-wrap gap-2" data-orb-document-output-actions>
              <button
                type="button"
                onClick={() => {
                  if (!displayTitle) return
                  void navigator.clipboard.writeText(exportDocumentIntelligenceMarkdown(result, displayTitle))
                  setCopyNote('Copied markdown.')
                }}
                className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                data-orb-copy-document-output
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!displayTitle) return
                  const blob = new Blob([exportDocumentIntelligenceMarkdown(result, displayTitle)], {
                    type: 'text/markdown;charset=utf-8'
                  })
                  const url = URL.createObjectURL(blob)
                  const anchor = document.createElement('a')
                  anchor.href = url
                  anchor.download = `${displayTitle.replace(/[^\w\s-]/g, '').slice(0, 48) || 'document'}.md`
                  anchor.click()
                  URL.revokeObjectURL(url)
                  setCopyNote('Exported markdown file.')
                }}
                className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                data-orb-export-document-output
              >
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Export
              </button>
              <button
                type="button"
                onClick={handleAskOrb}
                className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                data-orb-ask-orb-document
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                Ask ORB about this
              </button>
              {onInsertIntoChat ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!displayTitle) return
                    onInsertIntoChat(exportDocumentIntelligenceMarkdown(result, displayTitle))
                  }}
                  className="orb-doc-secondary-btn rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  data-orb-continue-in-chat
                >
                  {ORB_PREMIUM_ACTION_LABELS.continueInChat}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--orb-line)]/60 pt-3">
              {onRunDeepResearch ? (
                <button
                  type="button"
                  onClick={() => onRunDeepResearch(docContext())}
                  className="text-[11px] font-semibold text-[var(--orb-muted)] underline-offset-2 hover:underline"
                >
                  Deep research
                </button>
              ) : null}
              {onRunDocumentAnalysisAgent ? (
                <button
                  type="button"
                  onClick={() => onRunDocumentAnalysisAgent(docContext())}
                  className="text-[11px] font-semibold text-[var(--orb-muted)] underline-offset-2 hover:underline"
                >
                  Document analysis agent
                </button>
              ) : null}
              <button
                type="button"
                disabled={loading || !hasContent}
                onClick={() => void runPolicyCompare()}
                className="text-[11px] font-semibold text-[var(--orb-muted)] underline-offset-2 hover:underline disabled:opacity-50"
              >
                Compare policies (legacy)
              </button>
            </div>
          </section>
        ) : null}
        </>
        ) : null}
      </OrbPremiumPage>
    </OrbStandalonePanelShell>
  )
}
