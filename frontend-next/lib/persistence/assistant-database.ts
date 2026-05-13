import { AssistantMessage } from '@/lib/realtime/assistant-runtime'

export type PersistedConversation = {
  id: string
  title: string
  messages: AssistantMessage[]
  createdAt: string
  updatedAt: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export class AssistantDatabase {
  async listConversations(): Promise<PersistedConversation[]> {
    const response = await fetch(`${API_BASE}/assistant/conversations`, {
      credentials: 'include',
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Conversation list failed: ${response.status}`)
    }

    return response.json()
  }

  async saveConversation(conversation: PersistedConversation) {
    const response = await fetch(`${API_BASE}/assistant/conversations/${conversation.id}`, {
      method: 'PUT',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(conversation)
    })

    if (!response.ok) {
      throw new Error(`Conversation save failed: ${response.status}`)
    }

    return response.json()
  }

  async deleteConversation(id: string) {
    const response = await fetch(`${API_BASE}/assistant/conversations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Conversation delete failed: ${response.status}`)
    }
  }
}

export const assistantDatabase = new AssistantDatabase()
