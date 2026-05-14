import { AssistantMessage } from '@/lib/realtime/assistant-runtime'
import { getCsrfToken } from '@/lib/auth/api'

export type PersistedConversation = {
  id: string
  title: string
  messages: AssistantMessage[]
  createdAt: string
  updatedAt: string
}

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ''
).replace(/\/+$/, '')

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

export class AssistantDatabase {
  async listConversations(): Promise<PersistedConversation[]> {
    const response = await fetch(apiUrl('/assistant/conversations'), {
      credentials: 'include',
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Conversation list failed: ${response.status}`)
    }

    return response.json()
  }

  async saveConversation(conversation: PersistedConversation) {
    const csrfToken = getCsrfToken()
    const response = await fetch(apiUrl(`/assistant/conversations/${conversation.id}`), {
      method: 'PUT',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      },
      body: JSON.stringify(conversation)
    })

    if (!response.ok) {
      throw new Error(`Conversation save failed: ${response.status}`)
    }

    return response.json()
  }

  async deleteConversation(id: string) {
    const csrfToken = getCsrfToken()
    const response = await fetch(apiUrl(`/assistant/conversations/${id}`), {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
      }
    })

    if (!response.ok) {
      throw new Error(`Conversation delete failed: ${response.status}`)
    }
  }
}

export const assistantDatabase = new AssistantDatabase()
