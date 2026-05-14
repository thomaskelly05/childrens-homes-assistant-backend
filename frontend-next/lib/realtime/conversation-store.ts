import { assistantDatabase } from '@/lib/persistence/assistant-database'
import { isAuthFailureError } from '@/lib/auth/api'

import { AssistantMessage } from './assistant-runtime'

export type StoredConversation = {
  id: string
  title: string
  messages: AssistantMessage[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'indicare_unified_assistant_conversations'
const ACTIVE_KEY = 'indicare_unified_assistant_active_conversation'

function now() {
  return new Date().toISOString()
}

function conversationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `conversation-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function fallbackConversation(): StoredConversation {
  const timestamp = now()

  return {
    id: 'default',
    title: 'New conversation',
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export class ConversationStore {
  async list(): Promise<StoredConversation[]> {
    if (typeof window === 'undefined') return [fallbackConversation()]

    try {
      const backendConversations = await assistantDatabase.listConversations()

      if (Array.isArray(backendConversations) && backendConversations.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backendConversations))
        return backendConversations
      }
    } catch (error) {
      if (isAuthFailureError(error)) throw error
      // fallback to local cache
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(parsed) && parsed.length) return parsed
    } catch {
      return [fallbackConversation()]
    }

    return [fallbackConversation()]
  }

  getActiveId() {
    if (typeof window === 'undefined') return 'default'
    return localStorage.getItem(ACTIVE_KEY) || 'default'
  }

  setActiveId(id: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACTIVE_KEY, id)
  }

  async get(id: string): Promise<StoredConversation> {
    const conversations = await this.list()
    return conversations.find((conversation) => conversation.id === id) || fallbackConversation()
  }

  async create(title = 'New conversation') {
    const timestamp = now()

    const conversation: StoredConversation = {
      id: conversationId(),
      title,
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp
    }

    await assistantDatabase.saveConversation(conversation)

    const conversations = [conversation, ...(await this.list()).filter((item) => item.id !== 'default')]
    this.saveAll(conversations)
    this.setActiveId(conversation.id)

    return conversation
  }

  async saveMessages(id: string, messages: AssistantMessage[]) {
    const conversations = await this.list()
    const existing = conversations.find((conversation) => conversation.id === id)
    const timestamp = now()
    const title = this.titleFromMessages(messages) || existing?.title || 'New conversation'

    const next: StoredConversation = {
      id,
      title,
      messages,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    }

    this.saveAll([
      next,
      ...conversations.filter((conversation) => conversation.id !== id && conversation.id !== 'default')
    ])

    try {
      await assistantDatabase.saveConversation(next)
    } catch (error) {
      if (isAuthFailureError(error)) throw error
      // retain local persistence resilience
    }
  }

  async delete(id: string) {
    try {
      await assistantDatabase.deleteConversation(id)
    } catch (error) {
      if (isAuthFailureError(error)) throw error
      // continue local cleanup
    }

    const conversations = (await this.list()).filter((conversation) => conversation.id !== id)
    this.saveAll(conversations)
  }

  private saveAll(conversations: StoredConversation[]) {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 40)))
  }

  private titleFromMessages(messages: AssistantMessage[]) {
    const firstUser = messages.find((message) => message.role === 'user' && message.content.trim())
    if (!firstUser) return ''

    const clean = firstUser.content.replace(/\s+/g, ' ').trim()
    return clean.length > 44 ? `${clean.slice(0, 44)}...` : clean
  }
}

export const conversationStore = new ConversationStore()
