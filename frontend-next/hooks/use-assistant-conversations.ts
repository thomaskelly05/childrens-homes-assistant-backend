'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  conversationStore,
  StoredConversation
} from '@/lib/realtime/conversation-store'

export function useAssistantConversations() {
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState('default')

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

  function createConversation() {
    const conversation = conversationStore.create()

    setConversations(conversationStore.list())
    setActiveConversationId(conversation.id)

    return conversation
  }

  function selectConversation(id: string) {
    conversationStore.setActiveId(id)
    setActiveConversationId(id)
  }

  function saveConversation(id: string, messages: any[]) {
    conversationStore.saveMessages(id, messages)
    setConversations(conversationStore.list())
  }

  return {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    selectConversation,
    saveConversation
  }
}
