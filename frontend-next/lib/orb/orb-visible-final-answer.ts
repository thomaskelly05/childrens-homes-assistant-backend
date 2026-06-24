/**
 * Final user-visible answer sanitization — mirrors backend `sanitize_visible_final_answer`.
 * Applied after stream reconciliation and before display.
 */

import {
  fixBrokenAdultHeadingWording,
  formatStructuredDailyRecordDraftForMarkdown,
  isDailyRecordDraftMode,
  isDailyRecordRequest,
  promptContainsDailyRecordingFacts,
  replaceClunkyPlaceholders,
  reshapeRoutineDailyRecordChatAnswer,
  sanitizeDailyRecordDraftWording,
  stripSelfHarmGenericFillers,
  userRequestedBlankTemplate
} from './recording/orb-adult-identity-language.ts'

const SELF_HARM_CUE_RE =
  /\b(?:self[\s-]?harm|suicid\w*|want(?:ed)?\s+to\s+die|kill\s+myself|end\s+my\s+life)\b/i

export function sanitizeVisibleFinalAnswer(text: string, sourceText = ''): string {
  let cleaned = String(text || '')
  if (!cleaned.trim()) return cleaned

  cleaned = replaceClunkyPlaceholders(cleaned, sourceText)
  cleaned = fixBrokenAdultHeadingWording(cleaned)

  if (!userRequestedBlankTemplate(sourceText)) {
    cleaned = replaceClunkyPlaceholders(cleaned, sourceText)
  }

  if (isDailyRecordRequest(sourceText)) {
    cleaned = reshapeRoutineDailyRecordChatAnswer(cleaned, sourceText)
    if (isDailyRecordDraftMode(sourceText)) {
      cleaned = sanitizeDailyRecordDraftWording(cleaned, sourceText)
    }
    cleaned = formatStructuredDailyRecordDraftForMarkdown(cleaned)
  }

  if (SELF_HARM_CUE_RE.test(sourceText || '')) {
    cleaned = stripSelfHarmGenericFillers(cleaned, sourceText)
  }

  cleaned = fixBrokenAdultHeadingWording(cleaned)
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

export function sanitizeStreamingVisiblePartial(text: string, sourceText = ''): string {
  let cleaned = String(text || '')
  if (!cleaned.trim()) return cleaned
  if (!userRequestedBlankTemplate(sourceText)) {
    cleaned = replaceClunkyPlaceholders(cleaned, sourceText)
  }
  cleaned = fixBrokenAdultHeadingWording(cleaned)
  return cleaned
}

export { promptContainsDailyRecordingFacts, userRequestedBlankTemplate }
