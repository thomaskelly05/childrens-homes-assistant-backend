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
   * orb_operating_brain, orb_knowledge_spine, data-vault categories or
   * document/action intelligence before the local store union is updated.
   * Persist them rather than failing the production build.
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
  /** Shown while status is thinking (defaults to ORB is thinking...). */
  thinkingLabel?: string
  /** Deterministic instant first line from backend prelude SSE (visually distinct from model answer). */
  instantPrelude?: string
  instantCategory?: string
  /** Latest backend stream status line (residential/deep perceived speed). */
  streamStatus?: string
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
  /** IndiCare Intelligence Core + quality gate metadata from API context_used. */
  contextUsed?: Record<string, unknown>
  /** Document intelligence or action-engine result kind for reuse chips and save titles. */
  outputKind?: string
  /** Display title for structured outputs (policy card, Reg 44, etc.). */
  outputTitle?: string
  documentTitle?: string
  /** Context for answer feedback / improvement loop (standalone-safe). */
  feedbackContext?: {
    prompt_tier?: string
    detected_family?: string
    secondary_families?: string[]
    source_anchors?: string[]
    action_id?: string
    document_lens?: string
  }
}

export type StandaloneProject = {
  id: string
  name: string
  description?: string
  /** User-supplied ORB project memory (not live OS data). */
  memory?: string
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
    icon: '*',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-daily-recording',
    name: 'Daily Recording',
    description: 'Notes, handovers and recording quality',
    color: '#34d399',
    icon: 'note',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-safeguarding',
    name: 'Safeguarding Reflection',
    description: 'Thinking through concerns and escalation',
    color: '#fb7185',
    icon: 'shield',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-inspection',
    name: 'Inspection evidence preparation',
    description: 'Evidence, SCCIF and leadership oversight',
    color: '#a78bfa',
    icon: 'eye',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-supervision',
    name: 'Reflective Supervision',
    description: 'Coaching, learning and practice development',
    color: '#f59e0b',
    icon: 'sun',
    createdAt: 0,
    updatedAt: 0
  }
]

const STANDALONE_WORKSPACE_KEY = 'orb-standalone-workspace-v2'

function now() {
  return Date.now()
}

function makeId(prefix: string) {
  return `${prefix}-${now()}-${Math.random().toString(36).slice(2, 8)}`
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
    id: String(profile.id || makeId('profile')),
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
    id: String(message.id || makeId('msg')),
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
    explainability: message.explainability,
    outputKind: message.outputKind,
    outputTitle: message.outputTitle,
    documentTitle: message.documentTitle
  }
}

function normaliseChat(chat: Partial<StandaloneChat>): StandaloneChat {
  const timestamp = now()
  return {
    id: String(chat.id || makeId('chat')),
    title: String(chat.title || 'New chat'),
    projectId: String(chat.projectId || STANDALONE_GENERAL_PROJECT_ID),
    profileIds: Array.isArray(chat.profileIds) ? chat.profileIds.map(String) : [],
    messages: Array.isArray(chat.messages) ? chat.messages.map(normaliseMessage).filter(Boolean) as StandaloneChatMessage[] : [],
    mode: chat.mode || 'Ask ORB',
    conversationId: String(chat.conversationId || makeId('conversation')),
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
  const initialChat = createStandaloneChat(STANDALONE_GENERAL_PROJECT_ID, 'Ask ORB')
  return {
    version: 2,
    activeChatId: initialChat.id,
    activeProjectId: STANDALONE_GENERAL_PROJECT_ID,
    projects,
    profiles: [],
    chats: [initialChat]
  }
}

export function createStandaloneChat(
  projectId: string = STANDALONE_GENERAL_PROJECT_ID,
  mode: StandaloneOrbMode | string = 'Ask ORB',
  options: Partial<Pick<StandaloneChat, 'temporary' | 'profileIds' | 'title' | 'messages'>> = {}
): StandaloneChat {
  const timestamp = now()
  return {
    id: makeId('chat'),
    title: options.title || 'New conversation',
    projectId,
    profileIds: Array.isArray(options.profileIds) ? options.profileIds.map(String) : [],
    messages: Array.isArray(options.messages) ? dedupeOrbMessages(options.messages.map(ensureStandaloneMessage)) : [],
    mode,
    conversationId: makeId('conversation'),
    temporary: Boolean(options.temporary),
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function createStandaloneProject(name: string, description?: string): StandaloneProject {
  const timestamp = now()
  const cleanName = name.trim() || 'New project'
  return {
    id: makeId('project'),
    name: cleanName,
    description,
    color: '#22d3ee',
    icon: 'folder',
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function createStandaloneProfile(profile: Partial<StandaloneProfile>): StandaloneProfile {
  return normaliseProfile(profile)
}

export function ensureStandaloneMessage(message: Partial<StandaloneChatMessage>): StandaloneChatMessage {
  return normaliseMessage(message) || {
    id: makeId('msg'),
    role: 'assistant',
    content: '',
    status: 'complete',
    createdAt: now()
  }
}

export function dedupeOrbMessages(messages: StandaloneChatMessage[]): StandaloneChatMessage[] {
  const seen = new Set<string>()
  const result: StandaloneChatMessage[] = []
  for (const message of messages) {
    const key = message.id || `${message.role}:${message.createdAt}:${message.content}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(message)
  }
  return result
}

export { generateOrbChatTitle, titleFromFirstMessage } from '@/lib/orb/orb-chat-title'
export type { OrbChatTitleContext } from '@/lib/orb/orb-chat-title'

export function searchChats(
  chats: StandaloneChat[],
  query: string,
  options?: { projectId?: string; includeArchived?: boolean }
): StandaloneChat[] {
  const term = query.trim().toLowerCase()
  return chats
    .filter((chat) => (options?.includeArchived ? true : !chat.archived))
    .filter((chat) => (!options?.projectId ? true : chat.projectId === options.projectId))
    .filter((chat) => {
      if (!term) return true
      return (
        chat.title.toLowerCase().includes(term) ||
        chat.messages.some((message) => message.content.toLowerCase().includes(term))
      )
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
}

export function buildProfileContextBlock(profiles: StandaloneProfile[]): string {
  if (!Array.isArray(profiles) || profiles.length === 0) return ''
  const blocks = profiles.map((profile) => {
    const lines = [
      `Profile: ${profile.name || profile.label}`,
      profile.description ? `Description: ${profile.description}` : '',
      profile.notes ? `Notes: ${profile.notes}` : '',
      profile.promptInstructions ? `Instructions: ${profile.promptInstructions}` : '',
      profile.tags?.length ? `Tags: ${profile.tags.join(', ')}` : ''
    ].filter(Boolean)
    return lines.join('\n')
  })
  return `Standalone context profiles supplied by the user. Do not treat these as live IndiCare OS records.\n${blocks.join('\n\n')}`
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
    return repairOrbWorkspace({
      version: 2,
      activeChatId,
      activeProjectId,
      projects,
      profiles,
      chats
    })
  } catch (error) {
    console.warn('[ORB] Could not load standalone workspace', error)
    return createDefaultWorkspace()
  }
}

export function saveStandaloneWorkspace(workspace: StandaloneWorkspace) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STANDALONE_WORKSPACE_KEY, JSON.stringify(repairOrbWorkspace(workspace)))
  } catch (error) {
    console.warn('[ORB] Could not save standalone workspace', error)
  }
}

export function repairOrbWorkspace(workspace: StandaloneWorkspace): StandaloneWorkspace {
  const repairedProjects = workspace.projects?.length
    ? workspace.projects.map((project, index) => normaliseProject(project, DEFAULT_STANDALONE_PROJECTS[index] || DEFAULT_STANDALONE_PROJECTS[0]))
    : DEFAULT_STANDALONE_PROJECTS.map((project) => ({ ...project, createdAt: now(), updatedAt: now() }))
  if (!repairedProjects.some((project) => project.id === STANDALONE_GENERAL_PROJECT_ID)) {
    repairedProjects.unshift({ ...DEFAULT_STANDALONE_PROJECTS[0], createdAt: now(), updatedAt: now() })
  }
  const repairedProfiles = Array.isArray(workspace.profiles) ? workspace.profiles.map(normaliseProfile) : []
  const repairedChats = Array.isArray(workspace.chats) && workspace.chats.length
    ? workspace.chats.map(normaliseChat)
    : [createStandaloneChat(STANDALONE_GENERAL_PROJECT_ID, 'Ask ORB')]
  const activeChatId = repairedChats.some((chat) => chat.id === workspace.activeChatId)
    ? workspace.activeChatId
    : repairedChats[0]?.id || null
  const activeProjectId = repairedProjects.some((project) => project.id === workspace.activeProjectId)
    ? workspace.activeProjectId
    : STANDALONE_GENERAL_PROJECT_ID
  return {
    version: 2,
    activeChatId,
    activeProjectId,
    projects: repairedProjects,
    profiles: repairedProfiles,
    chats: repairedChats
  }
}

export function defaultWorkspace(): StandaloneWorkspace {
  return createDefaultWorkspace()
}

export function readStandaloneWorkspace(): StandaloneWorkspace {
  return loadStandaloneWorkspace()
}

export function writeStandaloneWorkspace(workspace: StandaloneWorkspace) {
  saveStandaloneWorkspace(workspace)
}

export function exportStandaloneWorkspaceJson(workspace: StandaloneWorkspace): string {
  return JSON.stringify(repairOrbWorkspace(workspace), null, 2)
}

export function clearStandaloneLocalState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STANDALONE_WORKSPACE_KEY)
}

export function clearStandaloneProfiles(workspace: StandaloneWorkspace) {
  saveStandaloneWorkspace({
    ...workspace,
    profiles: [],
    chats: workspace.chats.map((chat) => ({ ...chat, profileIds: [], updatedAt: now() }))
  })
}

export function clearStandaloneCustomProjects(workspace: StandaloneWorkspace) {
  const customProjectIds = new Set(
    workspace.projects
      .filter((project) => project.id !== STANDALONE_GENERAL_PROJECT_ID)
      .map((project) => project.id)
  )
  saveStandaloneWorkspace({
    ...workspace,
    activeProjectId: STANDALONE_GENERAL_PROJECT_ID,
    projects: workspace.projects.filter((project) => project.id === STANDALONE_GENERAL_PROJECT_ID),
    chats: workspace.chats.map((chat) => ({
      ...chat,
      projectId: customProjectIds.has(chat.projectId) ? STANDALONE_GENERAL_PROJECT_ID : chat.projectId,
      updatedAt: now()
    }))
  })
}
