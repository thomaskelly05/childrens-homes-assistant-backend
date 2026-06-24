import {
  buildSimpleDailyRecordDraft,
  isDailyRecordRequest,
  isStructuredDailyRecordDraft,
  reshapeRoutineDailyRecordChatAnswer
} from './recording/orb-adult-identity-language.ts'
import { isResidentialReflectiveChatFallback } from './orb-residential-chat-response-guide.ts'
import { sanitizeVisibleFinalAnswer } from './orb-visible-final-answer.ts'
import type { StandaloneChatMessage } from './standalone-local-store.ts'

export const DAILY_RECORD_CHAT_INTENT = 'daily_record' as const
export const DAILY_RECORD_CHAT_SOURCE = 'chat_daily_record' as const

export type OrbChatDailyRecordMetadata = {
  chatIntent?: string
  templateId?: string
  workingDocumentAvailable?: boolean
  source?: string
}

export function buildDailyRecordChatMetadata(): OrbChatDailyRecordMetadata {
  return {
    chatIntent: DAILY_RECORD_CHAT_INTENT,
    templateId: 'daily_record',
    workingDocumentAvailable: true,
    source: DAILY_RECORD_CHAT_SOURCE
  }
}

export function hasDailyRecordChatMetadata(
  message: Pick<StandaloneChatMessage, 'chatIntent' | 'templateId' | 'feedbackContext'>
): boolean {
  if (message.chatIntent === DAILY_RECORD_CHAT_INTENT) return true
  if (message.templateId === 'daily_record') return true
  const family = message.feedbackContext?.detected_family
  return family === 'daily_record' || family === 'daily_recording'
}

export function repairHydratedAssistantAnswer(content: string, userMessage: string): string {
  const userText = String(userMessage || '')
  const answer = String(content || '')

  if (!isDailyRecordRequest(userText)) {
    return answer
  }

  if (isStructuredDailyRecordDraft(answer)) {
    return sanitizeVisibleFinalAnswer(answer, userText)
  }

  if (
    isResidentialReflectiveChatFallback(answer) ||
    isEmptyHydratedAssistantAnswer(answer) ||
    !isStructuredDailyRecordDraft(sanitizeVisibleFinalAnswer(answer, userText))
  ) {
    const rebuilt = buildSimpleDailyRecordDraft(userText)
    const sanitized = sanitizeVisibleFinalAnswer(
      reshapeRoutineDailyRecordChatAnswer(rebuilt, userText),
      userText
    )
    if (isStructuredDailyRecordDraft(sanitized)) return sanitized
  }

  const reshaped = sanitizeVisibleFinalAnswer(reshapeRoutineDailyRecordChatAnswer(answer, userText), userText)
  return isStructuredDailyRecordDraft(reshaped) ? reshaped : answer
}

function isEmptyHydratedAssistantAnswer(content: string): boolean {
  const text = content.trim()
  return !text || /^I'm here, but I could not generate a full response/i.test(text)
}

export function repairHydratedChatMessages(messages: StandaloneChatMessage[]): StandaloneChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return messages

  let lastUserMessage = ''
  return messages.map((message) => {
    if (message.role === 'user') {
      lastUserMessage = message.content
      return message
    }
    if (message.role !== 'assistant') return message

    const userHint = lastUserMessage
    const dailyRecordContext =
      isDailyRecordRequest(userHint) || hasDailyRecordChatMetadata(message)
    if (!dailyRecordContext) return message

    const repairedContent = repairHydratedAssistantAnswer(message.content, userHint)
    const metadata =
      message.chatIntent === DAILY_RECORD_CHAT_INTENT
        ? {}
        : buildDailyRecordChatMetadata()

    return {
      ...message,
      ...metadata,
      content: repairedContent,
      feedbackContext: {
        ...message.feedbackContext,
        detected_family: message.feedbackContext?.detected_family ?? 'daily_record'
      }
    }
  })
}
