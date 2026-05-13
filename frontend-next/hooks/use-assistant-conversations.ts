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

  const refreshConversations = useCallback(() => {
    setConversations(conversationStore.list())
  }, [])

  useEffect(() => {
    const loaded = conversationStore.list()
    const active = conversationStore.getActiveId()

    setConversations(loaded)
    setActiveConversationId(active)
  }, [])

  const activeConversation = useMemo(() => {
    return conversations.find(
      (conversation) => conversation.id === activeConversationId
    )
  }, [conversations, activeConversationId])

  const createConversation = useCallback(() => {
    const conversation = conversationStore.create()

    setConversations(conversationStore.list())
    setActiveConversationId(conversation.id)

    return conversation
  }, [])

  const selectConversation = useCallback((id: string) => {
    conversationStore.setActiveId(id)
    setActiveConversationId(id)
  }, [])

  const saveConversation = useCallback((id: string, messages: AssistantMessage[]) => {
    conversationStore.saveMessages(id, messages)
    refreshConversations()
  }, [refreshConversations])

  return {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    selectConversation,
    saveConversation
  }
}
