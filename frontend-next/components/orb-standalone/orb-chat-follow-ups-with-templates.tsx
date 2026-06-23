'use client'

import { useEffect, useState } from 'react'

import { OrbSuggestedReplyChips } from '@/components/orb-standalone/orb-assistant-message'
import type { OrbSuggestedReplyItem } from '@/lib/orb/orb-output-reuse'
import {
  fetchChatTemplateSuggestions,
  mergeFollowUpsWithTemplateSuggestions
} from '@/lib/orb/orb-chat-template-suggestions'

export function OrbChatFollowUpsWithTemplates({
  content,
  followUps,
  maxVisible,
  onSelect
}: {
  content: string
  followUps: OrbSuggestedReplyItem[]
  maxVisible: number
  onSelect: (item: OrbSuggestedReplyItem) => void
}) {
  const [templateSuggestions, setTemplateSuggestions] = useState<OrbSuggestedReplyItem[]>([])

  useEffect(() => {
    let cancelled = false
    void fetchChatTemplateSuggestions(content).then((items) => {
      if (!cancelled) setTemplateSuggestions(items)
    })
    return () => {
      cancelled = true
    }
  }, [content])

  const suggestions = mergeFollowUpsWithTemplateSuggestions(
    followUps,
    templateSuggestions,
    maxVisible
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
