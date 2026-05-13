import {
  assistantWorkspaceDemoData,
  createDeterministicMagicNote
} from './demo-data'
import type {
  AssistantConversation,
  AssistantProject,
  AssistantWorkspaceData,
  CallSession,
  MagicNote,
  VoiceSession
} from './types'

const DEFAULT_API_BASE = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000'
  : 'https://api.indicare.co.uk'

export const ASSISTANT_API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  DEFAULT_API_BASE
).replace(/\/+$/, '')

export interface AssistantConversationAdapter {
  list(): Promise<AssistantConversation[]>
}

export interface AssistantProjectAdapter {
  list(): Promise<AssistantProject[]>
}

export interface MagicNotesAdapter {
  list(): Promise<MagicNote[]>
  createFromRecording(): Promise<MagicNote>
  createFromUpload(fileName: string): Promise<MagicNote>
}

export interface VoiceSessionAdapter {
  getSession(): Promise<VoiceSession>
  startListening(): Promise<VoiceSession>
  cancel(): Promise<VoiceSession>
}

export interface CallSessionAdapter {
  list(): Promise<CallSession[]>
}

export interface SpeechToTextAdapter {
  transcribe(input: Blob | File): Promise<string>
}

export interface TextToSpeechAdapter {
  speak(text: string): Promise<void>
}

export interface RealtimeVoiceAdapter {
  connect(sessionId: string): Promise<void>
  disconnect(): Promise<void>
}

export interface WakeWordAdapter {
  enable(wakeWord: 'Hey IndiCare'): Promise<void>
  disable(): Promise<void>
}

function cloneData(): AssistantWorkspaceData {
  return JSON.parse(JSON.stringify(assistantWorkspaceDemoData)) as AssistantWorkspaceData
}

class MockAssistantConversationAdapter implements AssistantConversationAdapter {
  async list() {
    return cloneData().conversations
  }
}

class MockAssistantProjectAdapter implements AssistantProjectAdapter {
  async list() {
    return cloneData().projects
  }
}

class MockMagicNotesAdapter implements MagicNotesAdapter {
  async list() {
    return cloneData().magicNotes
  }

  async createFromRecording() {
    return createDeterministicMagicNote('recording')
  }

  async createFromUpload(fileName: string) {
    return {
      ...createDeterministicMagicNote('upload'),
      title: `Uploaded Magic Note - ${fileName || 'audio placeholder'}`
    }
  }
}

class MockVoiceSessionAdapter implements VoiceSessionAdapter {
  async getSession() {
    return cloneData().voiceSession
  }

  async startListening() {
    return {
      ...cloneData().voiceSession,
      mode: 'listening' as const,
      transcriptStream: [
        'Listening placeholder started.',
        'Speech-to-text adapter is not connected in this build.'
      ]
    }
  }

  async cancel() {
    return {
      ...cloneData().voiceSession,
      mode: 'interrupted' as const,
      transcriptStream: ['Voice placeholder cancelled by the user.']
    }
  }
}

class MockCallSessionAdapter implements CallSessionAdapter {
  async list() {
    return cloneData().calls
  }
}

export const assistantWorkspaceAdapters = {
  conversations: new MockAssistantConversationAdapter(),
  projects: new MockAssistantProjectAdapter(),
  magicNotes: new MockMagicNotesAdapter(),
  voiceSessions: new MockVoiceSessionAdapter(),
  calls: new MockCallSessionAdapter(),
  getWorkspaceData: cloneData
}
