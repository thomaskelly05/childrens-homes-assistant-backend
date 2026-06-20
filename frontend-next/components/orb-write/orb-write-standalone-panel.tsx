'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileEdit, PanelLeft, PanelRight, Sparkles } from 'lucide-react'

import { OrbPrivacyNotice } from '@/components/orb/privacy/orb-privacy-notice'
import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { OrbWriteAiPanel } from '@/components/orb-write/orb-write-ai-panel'
import {
  OrbWriteGuidancePanel,
  type OrbWriteSelectedGuidance
} from '@/components/orb-write/orb-write-guidance-panel'
import { OrbStudioShell } from '@/components/orb/premium'
import { OrbWriteRecordTypeSelector } from '@/components/orb-write/orb-write-record-type-selector'
import { OrbWriteEditor } from '@/components/orb-write/orb-write-editor'
import { OrbWriteSourcePanel } from '@/components/orb-write/orb-write-source-panel'
import {
  OrbWriteTemplatePicker,
  type OrbWriteTemplateApplyMode
} from '@/components/orb-write/orb-write-template-picker'
import { OrbWriteWritingStylePanel } from '@/components/orb-write/orb-write-writing-style-panel'
import {
  clearOrbWriteContentHandoff,
  contentHandoffToOrbWriteDocument,
  loadOrbWriteContentHandoff
} from '@/lib/orb/write/orb-write-content-handoff'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import {
  buildBrainAnalysisFromGenerate,
  type OrbDictateBrainAnalysis,
  type OrbDictateBrainSuggestion
} from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import {
  analyzeOrbDictateSession,
  buildLocalDictateEditFallback,
  buildLocalDictateFallback,
  editOrbDictateDocument,
  generateOrbDictateNote,
  prepareWriteOrbDocument,
  saveOrbDictateNote
} from '@/lib/orb/dictate/orb-dictate-client'
import type { OrbDictateGenerateResult } from '@/lib/orb/dictate/orb-dictate-types'
import { resolveOrbRecordingRecordType, buildOrbWriteTemplateSectionBody } from '@/lib/orb/recording/orb-recording-framework'
import { copyOrbWriteText, exportOrbWritePdf, printOrbWriteDocument } from '@/lib/orb/write/orb-write-export'
import {
  clearOrbWriteHandoff,
  handoffToOrbWriteDocument,
  loadOrbWriteHandoff
} from '@/lib/orb/write/orb-write-handoff'
import {
  clearOrbWriteTemplateHandoff,
  loadOrbWriteTemplateHandoff
} from '@/lib/orb/write/orb-write-template-handoff'
import {
  createBlankOrbWriteDocumentFromRecordType,
  createOrbWriteDocumentFromGenerate,
  createOrbWriteDocumentFromSavedDraft,
  hasOrbWriteLocalDraft,
  loadOrbWriteLocalDraft,
  saveOrbWriteLocalDraft
} from '@/lib/orb/write/orb-write-standalone'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'
import { ORB_RESIDENTIAL_STATION_PRODUCT_COPY } from '@/lib/orb/orb-residential-copy'
import { orbGuidedDemoSaveStatusMessage, resolveOrbGuidedDemoSaveTitle } from '@/lib/orb/orb-guided-demo'
import { ORB_WRITE_SAFETY_COPY } from '@/lib/orb/write/orb-write-types'

export function OrbWriteStandalonePanel({
  open,
  onClose,
  onOpenTemplates,
  onOpenDictate,
  onOpenSavedOutputs,
  initialDocument
}: {
  open: boolean
  onClose: () => void
  onOpenTemplates?: () => void
  onOpenDictate?: () => void
  onOpenSavedOutputs?: () => void
  initialDocument?: OrbWriteDocument | null
}) {
  const [roughText, setRoughText] = useState('')
  const [recordTypeId, setRecordTypeId] = useState('general_dictation')
  const [brainAnalysis, setBrainAnalysis] = useState<OrbDictateBrainAnalysis | null>(null)
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<OrbDictateBrainSuggestion[]>([])
  const [generateResult, setGenerateResult] = useState<OrbDictateGenerateResult | null>(null)
  const [doc, setDoc] = useState<OrbWriteDocument | null>(initialDocument ?? null)
  const [analysing, setAnalysing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [hasLocalDraft, setHasLocalDraft] = useState(false)
  const [selectedGuidance, setSelectedGuidance] = useState<OrbWriteSelectedGuidance | null>(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false)
  const [guidancePanelOpen, setGuidancePanelOpen] = useState(false)
  const [compactWriteHeight, setCompactWriteHeight] = useState(false)
  const { isMobile } = useOrbResponsiveMode()

  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 1024px) and (max-height: 820px)')
    const sync = () => {
      const compact = media.matches
      setCompactWriteHeight(compact)
      if (compact) {
        setSourcePanelOpen(false)
        setGuidancePanelOpen(false)
      }
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [open])

  const recordType = useMemo(
    () => resolveOrbRecordingRecordType({ recordTypeId }),
    [recordTypeId]
  )

  useEffect(() => {
    if (!open) return
    setHasLocalDraft(hasOrbWriteLocalDraft())
    const contentHandoff = loadOrbWriteContentHandoff()
    if (contentHandoff && !initialDocument) {
      const document = contentHandoffToOrbWriteDocument(contentHandoff)
      setDoc(document)
      setRoughText(document.transcript)
      if (document.record_type_id) setRecordTypeId(document.record_type_id)
      clearOrbWriteContentHandoff()
      setStatusMessage(`Document loaded — ${contentHandoff.source_label}.`)
      return
    }
    const handoff = loadOrbWriteHandoff()
    if (handoff && !initialDocument) {
      const document = handoffToOrbWriteDocument(handoff)
      setDoc(document)
      setRoughText(document.transcript)
      clearOrbWriteHandoff()
      setStatusMessage('Document loaded from Dictate handoff.')
      return
    }
    const templateHandoff = loadOrbWriteTemplateHandoff()
    if (templateHandoff && !initialDocument) {
      const recordType = resolveOrbRecordingRecordType({
        recordTypeId: templateHandoff.record_type_id
      })
      setRecordTypeId(recordType.id)
      void (async () => {
        try {
          const prepared = await prepareWriteOrbDocument({
            note_type: recordType.dictate_note_type,
            record_type_id: recordType.id,
            template_id: recordType.studio_template_id ?? undefined,
            transcript: templateHandoff.transcript ?? '',
            professional_note: templateHandoff.professional_note ?? templateHandoff.structured_body ?? ''
          })
          const doc = createBlankOrbWriteDocumentFromRecordType(recordType, {
            body: prepared.structured_body,
            transcript: templateHandoff.transcript ?? ''
          })
          doc.title = prepared.title
          doc.quality_checks = prepared.quality_checks
          setDoc(doc)
          setRoughText(templateHandoff.transcript ?? '')
          setStatusMessage(`Structured ${recordType.label} ready — review section prompts and add your notes.`)
        } catch {
          setDoc(
            createBlankOrbWriteDocumentFromRecordType(recordType, {
              body: templateHandoff.structured_body,
              transcript: templateHandoff.transcript
            })
          )
          setStatusMessage(`Structured ${recordType.label} document ready — add your notes in each section.`)
        }
        clearOrbWriteTemplateHandoff()
      })()
      return
    }
    if (initialDocument) {
      setDoc(initialDocument)
      return
    }
    const recordType = resolveOrbRecordingRecordType({ recordTypeId })
    setDoc(createBlankOrbWriteDocumentFromRecordType(recordType))
    setStatusMessage(null)
  }, [open, initialDocument])

  const lastEdited = useMemo(() => {
    if (!doc) return ''
    return new Date(doc.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  }, [doc?.updated_at])

  const updateSuggestion = useCallback((id: string, status: OrbDictateBrainSuggestion['status']) => {
    setBrainAnalysis((prev) => {
      if (!prev) return prev
      const nextSuggestions = prev.professional_wording_suggestions.map((s) =>
        s.id === id ? { ...s, status } : s
      )
      setAcceptedSuggestions(nextSuggestions.filter((s) => s.status === 'accepted' || s.status === 'applied'))
      return { ...prev, professional_wording_suggestions: nextSuggestions }
    })
  }, [])

  const runAnalysis = useCallback(async () => {
    const text = roughText.trim()
    if (!text) return
    setAnalysing(true)
    setStatusMessage(null)
    try {
      const result = await analyzeOrbDictateSession({
        input_text: text,
        note_type: recordType.dictate_note_type,
        template_id: recordType.studio_template_id ?? undefined,
        record_type_id: recordType.id
      })
      setBrainAnalysis(result)
      setStatusMessage('Analysis complete — review suggestions, then generate your draft.')
    } catch {
      setBrainAnalysis(
        buildBrainAnalysisFromGenerate({
          noteType: recordType.dictate_note_type,
          recordTypeId: recordType.id,
          qualityChecks: {
            child_voice: 'review',
            safeguarding: 'review',
            manager_oversight: 'missing',
            impact: 'weak',
            recording_quality: 'needs_review'
          },
          summary: '',
          actions: []
        })
      )
      setStatusMessage('Offline analysis — generate draft to continue.')
    } finally {
      setAnalysing(false)
    }
  }, [roughText, recordType])

  const runGenerate = useCallback(async () => {
    const text = roughText.trim()
    if (!text) return
    setGenerating(true)
    setStatusMessage(null)
    try {
      const result = await generateOrbDictateNote({
        input_text: text,
        note_type: recordType.dictate_note_type,
        include_child_voice: true,
        include_safeguarding: true,
        include_manager_oversight: true,
        include_actions: true,
        source: 'paste'
      })
      setGenerateResult(result)
      const document = createOrbWriteDocumentFromGenerate({
        roughText: text,
        recordType,
        generateResult: result,
        acceptedSuggestions,
        analysisSummary: brainAnalysis?.quality_checks ? undefined : brainAnalysis?.child_voice_check
      })
      setDoc(document)
      setStatusMessage('Draft generated — review and edit before exporting.')
    } catch {
      const fallback = buildLocalDictateFallback(text, recordType.dictate_note_type)
      setGenerateResult(fallback)
      const document = createOrbWriteDocumentFromGenerate({
        roughText: text,
        recordType,
        generateResult: fallback,
        acceptedSuggestions
      })
      setDoc(document)
      setStatusMessage('Local draft generated — reconnect for ORB intelligence.')
    } finally {
      setGenerating(false)
    }
  }, [roughText, recordType, acceptedSuggestions, brainAnalysis])

  const updateBody = useCallback((body: string, _plain: string) => {
    setDoc((prev) => {
      if (!prev) return prev
      return { ...prev, body, updated_at: new Date().toISOString() }
    })
  }, [])

  const applyRevision = useCallback((revised: string, label: string) => {
    setDoc((prev) => {
      if (!prev) return prev
      const version = {
        id: `v_${Date.now()}`,
        label,
        body: revised,
        created_at: new Date().toISOString(),
        event: 'ai_suggestion' as const
      }
      return {
        ...prev,
        body: revised,
        versions: [...prev.versions, version],
        updated_at: new Date().toISOString()
      }
    })
    setStatusMessage('Suggestion applied — review before finalising.')
  }, [])

  const checkDraftAgainstGuidance = useCallback(
    async (source: OrbWriteSelectedGuidance) => {
      if (!doc) return
      const label = source.kind === 'official' ? source.entry.title : source.item.title
      const status =
        source.kind === 'official' ? source.entry.approval_status : source.item.approval_status
      const instruction = `Check this draft against "${label}" (${status}). Identify gaps and alignment only — do not insert policy text without adult action.`
      setStatusMessage('Checking draft against selected guidance…')
      try {
        const result = await editOrbDictateDocument({
          document_text: doc.body.replace(/<[^>]+>/g, '\n'),
          instruction,
          note_type: doc.record_type,
          mode: 'professional_language',
          preserve_facts: true
        })
        applyRevision(result.revised_text, `Guidance check: ${label}`)
      } catch {
        const fallback = buildLocalDictateEditFallback(
          doc.body.replace(/<[^>]+>/g, '\n'),
          'professional_language',
          instruction
        )
        applyRevision(fallback.revised_text, fallback.version_label)
      }
    },
    [applyRevision, doc]
  )

  async function handleSaveDraft() {
    if (!doc) return
    const title = resolveOrbGuidedDemoSaveTitle(doc.title)
    saveOrbWriteLocalDraft({ ...doc, title })
    setHasLocalDraft(true)
    const plain = doc.body.replace(/<[^>]+>/g, '\n')
    try {
      await saveOrbDictateNote({
        title,
        note_type: doc.record_type,
        professional_note: plain,
        summary: doc.summary,
        transcript: doc.transcript
      })
      setStatusMessage(orbGuidedDemoSaveStatusMessage('Draft saved to Records & Drafts.'))
    } catch {
      setStatusMessage(orbGuidedDemoSaveStatusMessage('Saved locally — backend save unavailable.'))
    }
  }

  async function handleCopy() {
    if (!doc) return
    const ok = await copyTextToClipboard(copyOrbWriteText(doc))
    setStatusMessage(ok ? 'Copied to clipboard.' : 'Copy failed.')
  }

  function handleApprove() {
    setDoc((prev) => (prev ? { ...prev, is_finalised: true, is_draft: false } : prev))
    setStatusMessage('Marked as approved locally. Export or save to keep your record.')
  }

  function openFromDraft() {
    const draft = loadOrbWriteLocalDraft()
    if (!draft) {
      setStatusMessage('No local draft found — save a draft first.')
      return
    }
    setDoc(createOrbWriteDocumentFromSavedDraft(draft))
    setStatusMessage('Local draft opened.')
  }

  const applyTemplate = useCallback(
    (opts: {
      recordType: import('@/lib/orb/recording/orb-recording-types').OrbRecordingRecordType
      mode: OrbWriteTemplateApplyMode
      structuredBody?: string
    }) => {
      const { recordType, mode, structuredBody } = opts
      setRecordTypeId(recordType.id)
      setDoc((prev) => {
        if (!prev) {
          return createBlankOrbWriteDocumentFromRecordType(recordType)
        }
        if (mode === 'style_guidance') {
          return {
            ...prev,
            record_type: recordType.dictate_note_type,
            record_type_id: recordType.id,
            record_type_label: recordType.label,
            document_headings: recordType.pdf_heading_order,
            template_id: recordType.studio_template_id ?? 'general',
            updated_at: new Date().toISOString()
          }
        }
        const nextBody =
          mode === 'merge' && prev.body.trim()
            ? `${structuredBody ?? ''}\n\n---\n\n${prev.body}`
            : structuredBody ?? prev.body
        return {
          ...prev,
          title: recordType.label,
          record_type: recordType.dictate_note_type,
          record_type_id: recordType.id,
          record_type_label: recordType.label,
          document_headings: recordType.pdf_heading_order,
          template_id: recordType.studio_template_id ?? 'general',
          body: nextBody,
          updated_at: new Date().toISOString()
        }
      })
      setStatusMessage(
        mode === 'style_guidance'
          ? `Writing style guidance updated for ${recordType.label}.`
          : `Template applied — ${recordType.label}.`
      )
    },
    []
  )

  const hasExistingContent = Boolean(doc?.body.replace(/<[^>]+>/g, '').trim())

  const requestRecordTypeChange = useCallback(
    (nextRecordTypeId: string) => {
      if (nextRecordTypeId === recordTypeId) return
      const nextRecordType = resolveOrbRecordingRecordType({ recordTypeId: nextRecordTypeId })
      if (hasExistingContent) {
        setTemplatePickerOpen(true)
        return
      }
      applyTemplate({
        recordType: nextRecordType,
        mode: 'full',
        structuredBody: buildOrbWriteTemplateSectionBody(nextRecordType)
      })
    },
    [applyTemplate, hasExistingContent, recordTypeId]
  )
  const documentFirst = !sourcePanelOpen && !guidancePanelOpen

  return (
    <OrbAppModal
      open={open}
      title="ORB Write"
      subtitle={ORB_RESIDENTIAL_STATION_PRODUCT_COPY.write}
      onClose={onClose}
      panelId="orb-write"
      size="xlarge"
      ariaLabel="ORB Write standalone workspace"
      presentation="workspace"
      compactChrome
    >
      <OrbStudioShell studioId="write" className="orb-workspace orb-workspace--write min-h-0 flex-1 gap-3" data-orb-write-standalone data-orb-workspace-write>
        {doc ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3" data-orb-write-studio-editor>
            <header
              className="flex shrink-0 flex-col gap-2 border-b border-[var(--orb-line)]/40 pb-2"
              data-orb-write-studio-header
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h2 className="text-sm font-semibold text-slate-900" data-orb-write-studio-title>
                  ORB Write
                </h2>
                <p className="text-[11px] text-slate-600" data-orb-write-studio-subtitle>
                  A specialist care documentation studio — draft, review and finalise records with ORB.
                </p>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600" data-orb-write-studio-guidance>
                ORB is helping you keep observation, interpretation, child&apos;s voice and adult response clearly
                separated.
              </p>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <FileEdit className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" aria-hidden />
                <OrbWriteRecordTypeSelector
                  recordTypeId={recordTypeId}
                  variant="compact"
                  selectorLabel="Record type"
                  onSelect={(nextRecordType) => requestRecordTypeChange(nextRecordType.id)}
                  onOpenFullPicker={() => setTemplatePickerOpen(true)}
                />
                <p className="hidden text-[10px] text-slate-600 lg:block" data-orb-write-template-hint>
                  Choose the structure ORB should help you write.
                </p>
                <input
                  data-orb-write-title-input
                  value={doc.title}
                  onChange={(e) => setDoc((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                  className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-slate-900 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSourcePanelOpen((open) => !open)}
                  className="hidden items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 lg:inline-flex"
                  data-orb-write-panel-toggle
                  data-orb-write-source-toggle
                  aria-pressed={sourcePanelOpen}
                  aria-label={sourcePanelOpen ? 'Hide source panel' : 'Show source panel'}
                >
                  <PanelLeft className="h-3.5 w-3.5" aria-hidden />
                  Source
                </button>
                <button
                  type="button"
                  onClick={() => setGuidancePanelOpen((open) => !open)}
                  className="hidden items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 lg:inline-flex"
                  data-orb-write-panel-toggle
                  data-orb-write-guidance-toggle
                  aria-pressed={guidancePanelOpen}
                  aria-label={guidancePanelOpen ? 'Hide guidance panel' : 'Show guidance panel'}
                >
                  <PanelRight className="h-3.5 w-3.5" aria-hidden />
                  Guidance
                </button>
                <button
                  type="button"
                  onClick={() => void runAnalysis()}
                  disabled={analysing || !roughText.trim()}
                  className="hidden items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-100 md:inline-flex"
                  data-orb-write-analyse
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Review with ORB
                </button>
                <button
                  type="button"
                  onClick={() => void runGenerate()}
                  disabled={generating || !roughText.trim()}
                  className="hidden items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-indigo-300 disabled:opacity-100 md:inline-flex"
                  data-orb-write-generate
                >
                  Create final draft
                </button>
              </div>
            </header>
            <div
              className="orb-write-studio-grid min-h-0 flex-1 gap-3"
              data-orb-write-layout
              data-orb-write-document-first={documentFirst ? 'true' : 'false'}
              data-orb-write-source-collapsed={sourcePanelOpen ? 'false' : 'true'}
              data-orb-write-guidance-collapsed={guidancePanelOpen ? 'false' : 'true'}
              data-orb-write-source-open={sourcePanelOpen ? 'true' : 'false'}
              data-orb-write-guidance-open={guidancePanelOpen ? 'true' : 'false'}
              data-orb-write-compact-height={compactWriteHeight ? 'true' : 'false'}
            >
              {sourcePanelOpen ? (
                <OrbWriteSourcePanel
                  document={doc}
                  roughText={roughText}
                  onRoughTextChange={setRoughText}
                  onContinueFromDictate={onOpenDictate}
                  onChooseTemplate={() => setTemplatePickerOpen(true)}
                  onOpenTemplates={onOpenTemplates}
                  onOpenSavedDraft={openFromDraft}
                  hasLocalDraft={hasLocalDraft}
                />
              ) : null}
              <div className="orb-write-studio-editor min-h-0 overflow-hidden" data-orb-write-document-canvas-host>
                <OrbWriteEditor
                  document={doc}
                  onChange={updateBody}
                  onWordCountChange={setWordCount}
                  lastEdited={`Last edited ${lastEdited}`}
                  onCopy={() => void handleCopy()}
                  onPrint={() => printOrbWriteDocument(doc)}
                  onExportPdf={() => void exportOrbWritePdf(doc)}
                  onSaveDraft={() => void handleSaveDraft()}
                  onApprove={handleApprove}
                  onAskOrb={() => void runAnalysis()}
                  onOpenSource={() => setSourcePanelOpen(true)}
                  onOpenGuidance={() => setGuidancePanelOpen(true)}
                  onOpenTemplatePicker={() => setTemplatePickerOpen(true)}
                  onRecordTypeSelect={requestRecordTypeChange}
                />
              </div>
              {guidancePanelOpen ? (
                <div
                  className="flex min-h-0 flex-col gap-3 overflow-hidden"
                  data-orb-write-assistant-panel
                  data-orb-write-guidance-panel-host
                >
                  <div className="min-h-[200px] overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] lg:min-h-0">
                    <OrbDictateBrainPanel
                      analysis={brainAnalysis}
                      loading={analysing}
                      studioTemplateId={recordType.studio_template_id ?? 'general'}
                      recordTypeId={recordType.id}
                      hasTranscript={roughText.trim().length > 0}
                      onAnalyse={() => void runAnalysis()}
                      onSuggestionUpdate={updateSuggestion}
                    />
                  </div>
                  <OrbWriteWritingStylePanel
                    document={doc}
                    recordType={recordType}
                    onApplyRevision={applyRevision}
                  />
                  <OrbWriteGuidancePanel
                    document={doc}
                    selected={selectedGuidance}
                    onSelect={setSelectedGuidance}
                    onClear={() => setSelectedGuidance(null)}
                    onCheckDraft={(source) => void checkDraftAgainstGuidance(source)}
                  />
                  <OrbWriteAiPanel document={doc} onApplyRevision={applyRevision} />
                </div>
              ) : null}
            </div>
            <footer
              className={`flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--orb-line)]/40 pt-2 text-[10px] text-[var(--orb-muted)] ${isMobile ? 'hidden' : ''}`}
              data-orb-write-status-footer
            >
              <span data-orb-write-word-count-display>{wordCount} words</span>
              <span>{doc.is_finalised ? 'Approved' : 'Draft'}</span>
              <span>{lastEdited ? `Last edited ${lastEdited}` : null}</span>
            </footer>
            <OrbPrivacyNotice surface="write" className={`shrink-0 ${isMobile ? 'hidden' : ''}`} />
            {isMobile ? (
              <details className="shrink-0 text-[10px] text-[var(--orb-muted)]" data-orb-write-safety-disclosure>
                <summary className="cursor-pointer font-medium">Adult approval required.</summary>
                <p className="mt-1">{ORB_WRITE_SAFETY_COPY.responsibility}</p>
                <p className="mt-1">{ORB_WRITE_SAFETY_COPY.judgement}</p>
              </details>
            ) : (
              <p className="shrink-0 text-[10px] text-[var(--orb-muted)]">{ORB_WRITE_SAFETY_COPY.responsibility}</p>
            )}
            {statusMessage ? (
              <p className="text-xs text-[var(--orb-primary)]" role="status">
                {statusMessage}
              </p>
            ) : null}
          </div>
        ) : null}
        <OrbWriteTemplatePicker
          open={templatePickerOpen}
          currentRecordTypeId={recordTypeId}
          hasExistingContent={hasExistingContent}
          onClose={() => setTemplatePickerOpen(false)}
          onApply={applyTemplate}
        />
      </OrbStudioShell>
    </OrbAppModal>
  )
}
