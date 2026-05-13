'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  conversationStore,
  StoredConversation
} from '@/lib/realtime/conversation-store'
import { AssistantMessage } from '@/lib/realtime/assistant-runtime'

export function useAssistantConversations() {
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState('default')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await conversationStore.list())
      setError(undefined)
    } catch (storeError) {
      setError(String(storeError))
    }
  }, [])

  useEffect(() => {
    let cancelled = false

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
  }, [])

  const activeConversation = useMemo(() => {
    return conversations.find(
      (conversation) => conversation.id === activeConversationId
    )
  }, [conversations, activeConversationId])

  const createConversation = useCallback(async () => {
    const conversation = await conversationStore.create()

    setConversations(await conversationStore.list())
    setActiveConversationId(conversation.id)

    return conversation
  }, [])

  const selectConversation = useCallback((id: string) => {
    conversationStore.setActiveId(id)
    setActiveConversationId(id)
  }, [])

  const saveConversation = useCallback(async (id: string, messages: AssistantMessage[]) => {
    await conversationStore.saveMessages(id, messages)
    await refreshConversations()
  }, [refreshConversations])

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
