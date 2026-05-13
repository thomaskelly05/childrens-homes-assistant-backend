import type { AssistantMessage } from '@/lib/realtime/assistant-runtime'

export type AssistantAppId =
  | 'chat'
  | 'projects'
  | 'notes'
  | 'voice'
  | 'calls'
  | 'calendar'
  | 'mail'
  | 'reports'
  | 'knowledge'

export type AssistantConversation = {
  id: string
  title: string
  projectId?: string
  linkedYoungPersonId?: string
  linkedAdultProfileId?: string
  status: 'active' | 'pinned' | 'archived'
  messages: AssistantMessage[]
  updatedAt: string
}

export type AssistantProject = {
  id: string
  name: string
  description: string
  linkedHomeId?: string
  linkedYoungPersonIds: string[]
  linkedAdultProfileIds: string[]
  appIds: AssistantAppId[]
  updatedAt: string
}

export type AssistantApp = {
  id: AssistantAppId
  label: string
  description: string
  status: 'ready' | 'foundation' | 'mock'
}

export type MagicNote = {
  id: string
  title: string
  source: 'recording' | 'upload' | 'manual-demo'
  status: 'draft' | 'transcribing' | 'summarised' | 'exported'
  transcript: string
  aiSummary: string
  careNoteDraft: string
  actionsExtracted: string[]
  safeguardingRiskFlags: string[]
  exportTargets: Array<'daily-log' | 'keywork' | 'incident' | 'report'>
  createdAt: string
}

export type VoiceSession = {
  id: string
  mode: 'idle' | 'listening' | 'speaking' | 'interrupted'
  wakeWord: 'Hey IndiCare'
  transcriptStream: string[]
  assistantUtterance: string
  adapters: {
    speechToText: 'mock' | 'ready'
    textToSpeech: 'mock' | 'ready'
    realtimeVoice: 'mock' | 'ready'
    wakeWord: 'mock' | 'ready'
  }
}

export type CallSession = {
  id: string
  title: string
  callType: 'care-team' | 'professionals' | 'family-contact'
  status: 'scheduled' | 'foundation' | 'completed'
  videoEnabled: boolean
  participants: string[]
  meetingNoteId?: string
  actionsExtracted: string[]
}

export type MeetingNote = {
  id: string
  title: string
  linkedCallSessionId?: string
  summary: string
  decisions: string[]
  actions: string[]
  createdAt: string
}

export type AdultProfile = {
  id: string
  name: string
  profileType: 'staff' | 'professional' | 'family-contact' | 'adult'
  role: string
  permissions: string[]
  conversations: string[]
  notes: string[]
  tasks: string[]
  meetings: string[]
  documents: string[]
  auditActivity: string[]
}

export type ProductivityTask = {
  id: string
  title: string
  area: 'messages' | 'calendar' | 'tasks' | 'meetings' | 'contacts' | 'documents' | 'care-records'
  status: 'todo' | 'in-progress' | 'blocked' | 'done'
  dueLabel: string
  owner: string
  linkedRecord?: string
}

export type CareContext = {
  selectedHome: string
  currentContext: string
  linkedYoungPerson: string
  linkedAdultProfile: string
  recentNotes: string[]
  safetyReminders: string[]
}

export type AssistantWorkspaceData = {
  apps: AssistantApp[]
  conversations: AssistantConversation[]
  projects: AssistantProject[]
  magicNotes: MagicNote[]
  voiceSession: VoiceSession
  calls: CallSession[]
  meetingNotes: MeetingNote[]
  adultProfiles: AdultProfile[]
  productivityTasks: ProductivityTask[]
  careContext: CareContext
}
