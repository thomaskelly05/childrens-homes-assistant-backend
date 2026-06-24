'use client'

import { useEffect, useMemo, useState } from 'react'

import { OrbSuggestedReplyChips } from '@/components/orb-standalone/orb-assistant-message'
import type { OrbSuggestedReplyItem } from '@/lib/orb/orb-output-reuse'
import {
  buildDailyRecordHandoffChips,
  fetchChatTemplateSuggestions,
  isDailyRecordHandoffChipContext,
  mergeFollowUpsWithTemplateSuggestions,
  type OrbChatChipContext
} from '@/lib/orb/orb-chat-template-suggestions'

export function OrbChatFollowUpsWithTemplates({
  content,
  messageHint,
  followUps,
  maxVisible,
  onSelect
}: {
  content: string
  messageHint?: string
  followUps: OrbSuggestedReplyItem[]
  maxVisible: number
  onSelect: (item: OrbSuggestedReplyItem) => void
}) {
  const chipContext = useMemo<OrbChatChipContext>(
    () => ({ content, messageHint }),
    [content, messageHint]
  )
  const syncHandoffChips = useMemo(
    () => (isDailyRecordHandoffChipContext(chipContext) ? buildDailyRecordHandoffChips() : null),
    [chipContext]
  )

  const [templateSuggestions, setTemplateSuggestions] = useState<OrbSuggestedReplyItem[]>(
    () => syncHandoffChips ?? []
  )

  useEffect(() => {
    if (syncHandoffChips) {
      setTemplateSuggestions(syncHandoffChips)
      return
    }
    let cancelled = false
    void fetchChatTemplateSuggestions(content, { messageHint }).then((items) => {
      if (!cancelled) setTemplateSuggestions(items)
    })
    return () => {
      cancelled = true
    }
  }, [content, messageHint, syncHandoffChips])

  const suggestions = mergeFollowUpsWithTemplateSuggestions(
    followUps,
    templateSuggestions,
    maxVisible,
    chipContext
  )

  if (!suggestions.length) return null

  return (
    <OrbSuggestedReplyChips
      maxVisible={maxVisible}
      suggestions={suggestions}
      onSelect={onSelect}
    />
  )
}
