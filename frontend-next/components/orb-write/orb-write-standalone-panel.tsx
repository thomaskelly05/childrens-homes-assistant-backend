'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { OrbWriteAiPanel } from '@/components/orb-write/orb-write-ai-panel'
import {
  OrbWriteGuidancePanel,
  type OrbWriteSelectedGuidance
} from '@/components/orb-write/orb-write-guidance-panel'
import { OrbWriteEditor } from '@/components/orb-write/orb-write-editor'
import { OrbWriteStartScreen } from '@/components/orb-write/orb-write-start-screen'
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
  saveOrbDictateNote
} from '@/lib/orb/dictate/orb-dictate-client'
import type { OrbDictateGenerateResult } from '@/lib/orb/dictate/orb-dictate-types'
import { resolveOrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-framework'
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
import { ORB_WRITE_SAFETY_COPY } from '@/lib/orb/write/orb-write-types'

type WriteView = 'start' | 'editor'

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
  const [view, setView] = useState<WriteView>(initialDocument ? 'editor' : 'start')
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

  const recordType = useMemo(
    () => resolveOrbRecordingRecordType({ recordTypeId }),
    [recordTypeId]
  )

  useEffect(() => {
    if (!open) return
    setHasLocalDraft(hasOrbWriteLocalDraft())
    const handoff = loadOrbWriteHandoff()
    if (handoff && !initialDocument) {
      const document = handoffToOrbWriteDocument(handoff)
      setDoc(document)
      setView('editor')
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
      setDoc(createBlankOrbWriteDocumentFromRecordType(recordType))
      setView('editor')
      clearOrbWriteTemplateHandoff()
      setStatusMessage(`Structured ${recordType.label} document ready — add your notes in each section.`)
      return
    }
    if (initialDocument) {
      setDoc(initialDocument)
      setView('editor')
    }
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
      setView('editor')
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
      setView('editor')
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
    saveOrbWriteLocalDraft(doc)
    setHasLocalDraft(true)
    const plain = doc.body.replace(/<[^>]+>/g, '\n')
    try {
      await saveOrbDictateNote({
        title: doc.title,
        note_type: doc.record_type,
        professional_note: plain,
        summary: doc.summary,
        transcript: doc.transcript
      })
      setStatusMessage('Draft saved to ORB Saved Outputs.')
    } catch {
      setStatusMessage('Saved locally — backend save unavailable.')
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
    setView('editor')
    setStatusMessage('Local draft opened.')
  }

  function openGeneratedDocument() {
    if (!generateResult) return
    const document = createOrbWriteDocumentFromGenerate({
      roughText: roughText.trim(),
      recordType,
      generateResult,
      acceptedSuggestions
    })
    setDoc(document)
    setView('editor')
  }

  return (
    <OrbAppModal
      open={open}
      title="ORB Write"
      subtitle="Create, review and finalise professional residential records"
      onClose={onClose}
      panelId="orb-write"
      size="xlarge"
      ariaLabel="ORB Write standalone workspace"
      presentation="workspace"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3" data-orb-write-standalone>
        {view === 'start' ? (
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_320px]">
            <OrbWriteStartScreen
              roughText={roughText}
              onRoughTextChange={setRoughText}
              selectedRecordTypeId={recordTypeId}
              onRecordTypeChange={setRecordTypeId}
              onAnalyse={() => void runAnalysis()}
              onGenerate={() => void runGenerate()}
              onOpenDocument={generateResult ? openGeneratedDocument : undefined}
              onStartFromTemplate={onOpenTemplates}
              onOpenSavedDraft={openFromDraft}
              onContinueFromDictate={onOpenDictate}
              analysing={analysing}
              generating={generating}
              hasAnalysis={Boolean(brainAnalysis)}
              hasDraft={Boolean(generateResult)}
              hasLocalDraft={hasLocalDraft}
              statusMessage={statusMessage}
            />
            <div className="min-h-[280px] overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] lg:min-h-0">
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
          </div>
        ) : doc ? (
          <>
            <header className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/40 pb-2">
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-[var(--orb-surface-hover)]"
                onClick={() => {
                  setView('start')
                  setStatusMessage(null)
                }}
                aria-label="Back to start"
                data-orb-write-back-start
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <input
                data-orb-write-title-input
                value={doc.title}
                onChange={(e) => setDoc((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[var(--orb-foreground)] focus:outline-none"
              />
            </header>
            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_320px]">
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
              />
              <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
                <OrbWriteGuidancePanel
                  document={doc}
                  selected={selectedGuidance}
                  onSelect={setSelectedGuidance}
                  onClear={() => setSelectedGuidance(null)}
                  onCheckDraft={(source) => void checkDraftAgainstGuidance(source)}
                />
                <OrbWriteAiPanel document={doc} onApplyRevision={applyRevision} />
              </div>
            </div>
            <p className="shrink-0 text-[10px] text-[var(--orb-muted)]">{ORB_WRITE_SAFETY_COPY.responsibility}</p>
            {statusMessage ? (
              <p className="text-xs text-[var(--orb-primary)]" role="status">
                {statusMessage}
              </p>
            ) : null}
            <span className="sr-only" data-orb-write-word-count>
              {wordCount} words
            </span>
          </>
        ) : null}
      </div>
    </OrbAppModal>
  )
}
