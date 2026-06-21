/** Phase 3V — async Dictate intelligence (LLM-first with local fallback). */

import {
  buildLocalDictateEditFallback,
  editOrbDictateDocument,
  type OrbDictateEditResult
} from './orb-dictate-client.ts'
import type { OrbDictateEditMode } from './orb-dictate-studio-actions.ts'
import { ORB_DICTATE_EDIT_OFFLINE_NOTE } from './orb-dictate-capture-copy.ts'
import {
  buildDictateEditPayload,
  transcriptForIntelligence,
  type OrbDictateIntelligenceRequest
} from './orb-dictate-intelligence-request.ts'
import {
  buildInitialWorkingDocument,
  isWorkingDocumentUnmappedScaffold
} from './orb-dictate-working-document.ts'

export type { OrbDictateIntelligenceRequest, OrbDictateSavePacket } from './orb-dictate-intelligence-request.ts'
export {
  buildCleanDictateCopy,
  buildDictateIntelligenceRequest,
  buildDictateMissingInfoReview,
  buildDictateSavePacket,
  ORB_DICTATE_INTELLIGENCE_SLOW_MESSAGE,
  ORB_DICTATE_MEDIA_SAVED_LOCAL_NOTE,
  ORB_DICTATE_WRITE_HANDOFF_REVIEW_NOTE,
  transcriptForIntelligence
} from './orb-dictate-intelligence-request.ts'

export type OrbDictateIntelligenceResult = {
  workingDocument: string
  usedFallback: boolean
  offlineNote?: string
  changeSummary?: string[]
}

const STRUCTURE_INSTRUCTION =
  'Structure the working transcript into the selected template sections using ## headings. Preserve factual content from the transcript. Use cautious placeholders only where information is genuinely missing. Do not invent facts or names.'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}

export async function requestWorkingDocumentFromOrb(
  request: OrbDictateIntelligenceRequest,
  options?: { adultInstruction?: string; mode?: OrbDictateEditMode; timeoutMs?: number }
): Promise<OrbDictateIntelligenceResult> {
  const transcript = transcriptForIntelligence(request)
  const localDocument = buildInitialWorkingDocument(
    transcript,
    request.templateType,
    options?.adultInstruction ? { adultInstruction: options.adultInstruction } : undefined
  )

  if (!transcript.trim()) {
    return { workingDocument: localDocument, usedFallback: true }
  }

  const instruction = options?.adultInstruction?.trim() || STRUCTURE_INSTRUCTION
  const payload = buildDictateEditPayload(
    { ...request, currentWorkingDocument: request.currentWorkingDocument || localDocument },
    instruction,
    options?.mode ?? 'professional_language'
  )

  try {
    const result = await withTimeout(editOrbDictateDocument(payload), options?.timeoutMs ?? 12_000)
    const revised = result.revised_text?.trim()
    if (revised && !isWorkingDocumentUnmappedScaffold(revised)) {
      return {
        workingDocument: revised,
        usedFallback: false,
        changeSummary: result.change_summary
      }
    }
    throw new Error('empty_or_scaffold')
  } catch {
    const fallback = buildLocalDictateEditFallback(
      payload.document_text,
      options?.mode ?? 'professional_language',
      instruction
    )
    const revised =
      fallback.revised_text.trim() && !isWorkingDocumentUnmappedScaffold(fallback.revised_text)
        ? fallback.revised_text
        : localDocument
    return {
      workingDocument: revised,
      usedFallback: true,
      offlineNote: ORB_DICTATE_EDIT_OFFLINE_NOTE,
      changeSummary: fallback.change_summary
    }
  }
}

export async function applyDictateIntelligenceEdit(
  request: OrbDictateIntelligenceRequest,
  instruction: string,
  mode?: OrbDictateEditMode
): Promise<OrbDictateIntelligenceResult & Pick<OrbDictateEditResult, 'warnings'>> {
  const payload = buildDictateEditPayload(request, instruction, mode)
  try {
    const result = await editOrbDictateDocument(payload)
    const revised = result.revised_text?.trim()
    if (!revised) throw new Error('empty')
    return {
      workingDocument: revised,
      usedFallback: false,
      changeSummary: result.change_summary,
      warnings: result.warnings
    }
  } catch {
    const fallback = buildLocalDictateEditFallback(
      payload.document_text,
      mode ?? 'professional_language',
      instruction
    )
    const transcript = transcriptForIntelligence(request)
    const local =
      transcript.length < 120
        ? buildInitialWorkingDocument(transcript, request.templateType, { adultInstruction: instruction })
        : fallback.revised_text
    return {
      workingDocument: local.trim() || payload.document_text,
      usedFallback: true,
      offlineNote: ORB_DICTATE_EDIT_OFFLINE_NOTE,
      changeSummary: fallback.change_summary,
      warnings: fallback.warnings
    }
  }
}