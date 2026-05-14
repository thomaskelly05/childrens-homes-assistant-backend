import { AssistantMessage } from '@/lib/realtime/assistant-runtime'
import { authFetch } from '@/lib/auth/api'

export type PersistedConversation = {
  id: string
  title: string
  messages: AssistantMessage[]
  createdAt: string
  updatedAt: string
}

function apiUrl(path: string) {
  return path
}

export class AssistantDatabase {
  async listConversations(): Promise<PersistedConversation[]> {
    return authFetch<PersistedConversation[]>(apiUrl('/assistant/conversations'))
  }

  async saveConversation(conversation: PersistedConversation) {
    return authFetch<PersistedConversation>(apiUrl(`/assistant/conversations/${conversation.id}`), {
      method: 'PUT',
      body: JSON.stringify(conversation)
    })
  }

  async deleteConversation(id: string) {
    await authFetch(apiUrl(`/assistant/conversations/${id}`), { method: 'DELETE' })
  }
}

export const assistantDatabase = new AssistantDatabase()
