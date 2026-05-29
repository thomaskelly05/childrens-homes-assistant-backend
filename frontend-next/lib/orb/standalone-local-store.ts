'use client'

import type { StandaloneOrbMode, StandaloneOrbModelRouting } from '@/lib/orb/standalone-client'

export type StandaloneOrbSourceType =
  | 'product_context'
  | 'regulatory_framework'
  | 'general_knowledge'
  | 'user_provided'
  | 'safety_boundary'
  | 'recording_quality'
  | 'therapeutic_practice'
  | 'safeguarding_principles'
  | 'image_context'

export type StandaloneOrbSource = {
  id?: string
  label: string
  /**
   * API sources can include newer routed source types such as
   * orb_operating_brain, orb_knowledge_spine or data-vault categories before
   * the local store union is updated. Persist them rather than failing the
   * production build.
   */
  type: StandaloneOrbSourceType | string
  basis?: string
  note?: string
  live_retrieved?: boolean
}

export type StandaloneChatMessageStatus =
  | 'sent'
  | 'sending'
  | 'thinking'
  | 'streaming'
  | 'complete'
  | 'stopped'
  | 'error'
  | 'failed'
  | 'pending'

export type StandaloneChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageDataUrls?: string[]
  createdAt?: number
  status?: StandaloneChatMessageStatus
  /** Shown while status is thinking (defaults to ORB is thinking…). */
  thinkingLabel?: string
  sources?: StandaloneOrbSource[]
  modelRouting?: StandaloneOrbModelRouting
  documentSuggestion?: {
    suggested?: boolean
    needs_document?: boolean
    open_documents_panel?: boolean
  }
  agentSuggestion?: {
    suggested?: boolean
    agent_type?: string
    reason?: string
    auto_run?: boolean
  }
  explainability?: {
    active_brains?: string[]
    cognition_display_labels?: string[]
    depth_topic?: string
    frameworks_used?: string[]
    evidence_focus?: string[]
    confidence?: string
    human_review_boundaries?: string[]
    reasoning_summary?: string
    operational_context_used?: boolean
  }
}

export type StandaloneProject = {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  createdAt: number
  updatedAt: number
}

export type StandaloneProfile = {
  id: string
  name: string
  label: string
  description?: string
  notes?: string
  tags?: string[]
  promptInstructions?: string
  avatarInitial?: string
  createdAt: number
  updatedAt: number
}

export type StandaloneChat = {
  id: string
  title: string
  projectId: string
  profileIds: string[]
  messages: StandaloneChatMessage[]
  mode: StandaloneOrbMode | string
  conversationId: string
  pinned?: boolean
  archived?: boolean
  /** When true, ORB skips profile/memory blocks for this chat only (local UI boundary). */
  temporary?: boolean
  createdAt: number
  updatedAt: number
}

export type StandaloneWorkspace = {
  version: 2
  activeChatId: string | null
  activeProjectId: string
  projects: StandaloneProject[]
  profiles: StandaloneProfile[]
  chats: StandaloneChat[]
}

export const STANDALONE_GENERAL_PROJECT_ID = 'project-general'

export const DEFAULT_STANDALONE_PROJECTS: StandaloneProject[] = [
  {
    id: STANDALONE_GENERAL_PROJECT_ID,
    name: 'General',
    description: 'Everyday questions and mixed topics',
    color: '#22d3ee',
    icon: '✦',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-daily-recording',
    name: 'Daily Recording',
    description: 'Notes, handovers and recording quality',
    color: '#34d399',
    icon: '📝',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-safeguarding',
    name: 'Safeguarding Reflection',
    description: 'Thinking through concerns and escalation',
    color: '#fb7185',
    icon: '🛡',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-inspection',
    name: 'Inspection Readiness',
    description: 'Evidence, SCCIF and leadership oversight',
    color: '#a78bfa',
    icon: '◎',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-supervision',
    name: 'Reflective Supervision',
    description: 'Coaching, learning and practice development',
    color: '#f59e0b',
    icon: '☀',
    createdAt: 0,
    updatedAt: 0
  }
]

const STANDALONE_WORKSPACE_KEY = 'orb-standalone-workspace-v2'

function now() {
  return Date.now()
}

function normaliseProject(project: Partial<StandaloneProject>, fallback: StandaloneProject): StandaloneProject {
  const timestamp = now()
  return {
    id: String(project.id || fallback.id),
    name: String(project.name || fallback.name),
    description: project.description || fallback.description,
    color: project.color || fallback.color,
    icon: project.icon || fallback.icon,
    createdAt: Number(project.createdAt || fallback.createdAt || timestamp),
    updatedAt: Number(project.updatedAt || fallback.updatedAt || timestamp)
  }
}

function normaliseProfile(profile: Partial<StandaloneProfile>): StandaloneProfile {
  const timestamp = now()
  const label = String(profile.label || profile.name || 'Standalone profile')
  return {
    id: String(profile.id || `profile-${timestamp}`),
    name: String(profile.name || label),
    label,
    description: profile.description,
    notes: profile.notes,
    tags: Array.isArray(profile.tags) ? profile.tags.map(String) : [],
    promptInstructions: profile.promptInstructions,
    avatarInitial: String(profile.avatarInitial || label.slice(0, 1) || 'P').toUpperCase(),
    createdAt: Number(profile.createdAt || timestamp),
    updatedAt: Number(profile.updatedAt || timestamp)
  }
}

function normaliseMessage(message: Partial<StandaloneChatMessage>): StandaloneChatMessage | null {
  if (!message || (message.role !== 'user' && message.role !== 'assistant')) return null
  return {
    id: String(message.id || `msg-${now()}`),
    role: message.role,
    content: String(message.content || ''),
    imageDataUrls: Array.isArray(message.imageDataUrls) ? message.imageDataUrls.map(String) : undefined,
    createdAt: Number(message.createdAt || now()),
    status: message.status,
    thinkingLabel: message.thinkingLabel,
    sources: Array.isArray(message.sources) ? message.sources : undefined,
    modelRouting: message.modelRouting,
    documentSuggestion: message.documentSuggestion,
    agentSuggestion: message.agentSuggestion,
    explainability: message.explainability
  }
}

function normaliseChat(chat: Partial<StandaloneChat>): StandaloneChat {
  const timestamp = now()
  return {
    id: String(chat.id || `chat-${timestamp}`),
    title: String(chat.title || 'New chat'),
    projectId: String(chat.projectId || STANDALONE_GENERAL_PROJECT_ID),
    profileIds: Array.isArray(chat.profileIds) ? chat.profileIds.map(String) : [],
    messages: Array.isArray(chat.messages) ? chat.messages.map(normaliseMessage).filter(Boolean) as StandaloneChatMessage[] : [],
    mode: chat.mode || 'Ask ORB',
    conversationId: String(chat.conversationId || `conversation-${timestamp}`),
    pinned: Boolean(chat.pinned),
    archived: Boolean(chat.archived),
    temporary: Boolean(chat.temporary),
    createdAt: Number(chat.createdAt || timestamp),
    updatedAt: Number(chat.updatedAt || timestamp)
  }
}

function createDefaultWorkspace(): StandaloneWorkspace {
  const timestamp = now()
  const projects = DEFAULT_STANDALONE_PROJECTS.map((project) => ({ ...project, createdAt: timestamp, updatedAt: timestamp }))
  const initialChat: StandaloneChat = {
    id: `chat-${timestamp}`,
    title: 'New chat',
    projectId: STANDALONE_GENERAL_PROJECT_ID,
    profileIds: [],
    messages: [],
    mode: 'Ask ORB',
    conversationId: `conversation-${timestamp}`,
    createdAt: timestamp,
    updatedAt: timestamp
  }
  return {
    version: 2,
    activeChatId: initialChat.id,
    activeProjectId: STANDALONE_GENERAL_PROJECT_ID,
    projects,
    profiles: [],
    chats: [initialChat]
  }
}

export function loadStandaloneWorkspace(): StandaloneWorkspace {
  if (typeof window === 'undefined') return createDefaultWorkspace()
  try {
    const raw = window.localStorage.getItem(STANDALONE_WORKSPACE_KEY)
    if (!raw) return createDefaultWorkspace()
    const parsed = JSON.parse(raw) as Partial<StandaloneWorkspace>
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects.map((project, index) => normaliseProject(project, DEFAULT_STANDALONE_PROJECTS[index] || DEFAULT_STANDALONE_PROJECTS[0]))
      : DEFAULT_STANDALONE_PROJECTS.map((project) => ({ ...project, createdAt: now(), updatedAt: now() }))
    const profiles = Array.isArray(parsed.profiles) ? parsed.profiles.map(normaliseProfile) : []
    const chats = Array.isArray(parsed.chats) && parsed.chats.length > 0
      ? parsed.chats.map(normaliseChat)
      : createDefaultWorkspace().chats
    const activeChatId = parsed.activeChatId && chats.some((chat) => chat.id === parsed.activeChatId)
      ? parsed.activeChatId
      : chats[0]?.id || null
    const activeProjectId = parsed.activeProjectId && projects.some((project) => project.id === parsed.activeProjectId)
      ? parsed.activeProjectId
      : STANDALONE_GENERAL_PROJECT_ID
    return {
      version: 2,
      activeChatId,
      activeProjectId,
      projects,
      profiles,
      chats
    }
  } catch (error) {
    console.warn('[ORB] Could not load standalone workspace', error)
    return createDefaultWorkspace()
  }
}

export function saveStandaloneWorkspace(workspace: StandaloneWorkspace) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STANDALONE_WORKSPACE_KEY, JSON.stringify(workspace))
  } catch (error) {
    console.warn('[ORB] Could not save standalone workspace', error)
  }
}
