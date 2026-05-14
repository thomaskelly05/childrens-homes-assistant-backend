'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  conversationStore,
  StoredConversation
} from '@/lib/realtime/conversation-store'
import { AssistantMessage } from '@/lib/realtime/assistant-runtime'

type UseAssistantConversationsOptions = {
  enabled?: boolean
}

export function useAssistantConversations(options: UseAssistantConversationsOptions = {}) {
  const enabled = options.enabled ?? true
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState('default')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const refreshConversations = useCallback(async () => {
    if (!enabled) return
    try {
      setConversations(await conversationStore.list())
      setError(undefined)
    } catch (storeError) {
      setError(String(storeError))
    }
  }, [enabled])

  useEffect(() => {
    let cancelled = false
    if (!enabled) {
      setLoading(true)
      return () => {
        cancelled = true
      }
    }

    async function load() {
      try {
        const loaded = await conversationStore.list()
        const active = conversationStore.getActiveId()

        if (!cancelled) {
          setConversations(loaded)
          setActiveConversationId(active)
          setError(undefined)
        }
      } catch (storeError) {
        if (!cancelled) setError(String(storeError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [enabled])

  const activeConversation = useMemo(() => {
    return conversations.find(
      (conversation) => conversation.id === activeConversationId
    )
  }, [conversations, activeConversationId])

  const createConversation = useCallback(async () => {
    if (!enabled) {
      throw new Error('Assistant session is not ready.')
    }
    const conversation = await conversationStore.create()

    setConversations(await conversationStore.list())
    setActiveConversationId(conversation.id)

    return conversation
  }, [enabled])

  const selectConversation = useCallback((id: string) => {
    conversationStore.setActiveId(id)
    setActiveConversationId(id)
  }, [])

  const saveConversation = useCallback(async (id: string, messages: AssistantMessage[]) => {
    if (!enabled) return
    await conversationStore.saveMessages(id, messages)
    await refreshConversations()
  }, [enabled, refreshConversations])

  return {
    conversations,
    activeConversation,
    activeConversationId,
    loading,
    error,
    createConversation,
    selectConversation,
    saveConversation
  }
}
