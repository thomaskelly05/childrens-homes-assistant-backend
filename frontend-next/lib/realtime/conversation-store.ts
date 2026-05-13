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
  list(): StoredConversation[] {
    if (typeof window === 'undefined') return [fallbackConversation()]

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
    return localStorage.getItem(ACTIVE_KEY) || this.list()[0]?.id || 'default'
  }

  setActiveId(id: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACTIVE_KEY, id)
  }

  get(id: string): StoredConversation {
    return this.list().find((conversation) => conversation.id === id) || fallbackConversation()
  }

  create(title = 'New conversation') {
    const timestamp = now()

    const conversation: StoredConversation = {
      id: crypto.randomUUID(),
      title,
      messages: [],
      createdAt: timestamp,
      updatedAt: timestamp
    }

    const conversations = [conversation, ...this.list().filter((item) => item.id !== 'default')]
    this.saveAll(conversations)
    this.setActiveId(conversation.id)

    return conversation
  }

  saveMessages(id: string, messages: AssistantMessage[]) {
    const conversations = this.list()
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
