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
  type: StandaloneOrbSourceType
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
    description: 'Staff reflection and supervision preparation',
    color: '#fbbf24',
    icon: '◈',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-placement',
    name: 'Placement Stability',
    description: 'Transitions, relationships and plans',
    color: '#34d399',
    icon: '◇',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-team',
    name: 'Team Development',
    description: 'Workforce practice and culture',
    color: '#22d3ee',
    icon: '▣',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-reg45',
    name: 'Regulation 45 Review',
    description: 'Improvement planning and governance evidence',
    color: '#fb7185',
    icon: '⬡',
    createdAt: 0,
    updatedAt: 0
  }
]

const WORKSPACE_STORAGE_KEY = 'orb-standalone-workspace-v1'
const WORKSPACE_SCHEMA_VERSION = 2
const DEDUPE_WINDOW_MS = 10 * 60 * 1000

function now() {
  return Date.now()
}

function newId(prefix: string) {
  return `${prefix}-${now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function defaultWorkspace(): StandaloneWorkspace {
  const stamp = now()
  const projects = DEFAULT_STANDALONE_PROJECTS.map((p) => ({
    ...p,
    createdAt: stamp,
    updatedAt: stamp
  }))
  return {
    version: WORKSPACE_SCHEMA_VERSION,
    activeChatId: null,
    activeProjectId: STANDALONE_GENERAL_PROJECT_ID,
    projects,
    profiles: [],
    chats: []
  }
}

function normalizeMessageContent(content: string): string {
  return content.trim().toLowerCase()
}

function messageTimestamp(message: StandaloneChatMessage): number {
  return typeof message.createdAt === 'number' ? message.createdAt : 0
}

function withinDedupeWindow(a: StandaloneChatMessage, b: StandaloneChatMessage): boolean {
  const ta = messageTimestamp(a)
  const tb = messageTimestamp(b)
  if (!ta || !tb) return true
  return Math.abs(tb - ta) <= DEDUPE_WINDOW_MS
}

function sameMessageContent(a: StandaloneChatMessage, b: StandaloneChatMessage): boolean {
  return normalizeMessageContent(a.content) === normalizeMessageContent(b.content)
}

function isExactAdjacentDuplicate(a: StandaloneChatMessage, b: StandaloneChatMessage): boolean {
  if (a.role !== b.role) return false
  if (!sameMessageContent(a, b)) return false
  if (!withinDedupeWindow(a, b)) return false
  if (a.status === 'failed' || b.status === 'failed') return false
  return true
}

export function ensureStandaloneMessage(message: Partial<StandaloneChatMessage> & { role: 'user' | 'assistant'; content: string }): StandaloneChatMessage {
  const stamp = typeof message.createdAt === 'number' ? message.createdAt : now()
  return {
    id: message.id || newId(message.role === 'user' ? 'u' : 'a'),
    role: message.role,
    content: message.content,
    imageDataUrls: message.imageDataUrls,
    createdAt: stamp,
    status: message.status,
    thinkingLabel: message.thinkingLabel,
    sources: message.sources,
    modelRouting: message.modelRouting,
    agentSuggestion: message.agentSuggestion,
    documentSuggestion: message.documentSuggestion
  }
}

/** Remove duplicate adjacent and repeated user bubbles within the dedupe window. */
export function dedupeOrbMessages(messages: StandaloneChatMessage[]): StandaloneChatMessage[] {
  const items = messages.map((entry) => ensureStandaloneMessage(entry))
  if (items.length <= 1) return items

  const adjacentPass: StandaloneChatMessage[] = []
  for (const message of items) {
    const previous = adjacentPass[adjacentPass.length - 1]
    if (previous && isExactAdjacentDuplicate(previous, message)) {
      if (message.role === 'assistant') {
        adjacentPass[adjacentPass.length - 1] = { ...message, imageDataUrls: message.imageDataUrls ?? previous.imageDataUrls }
      }
      continue
    }
    adjacentPass.push(message)
  }

  const result: StandaloneChatMessage[] = []
  for (let index = 0; index < adjacentPass.length; index += 1) {
    const message = adjacentPass[index]
    if (message.role !== 'user') {
      result.push(message)
      continue
    }

    let skip = false
    for (let priorIndex = result.length - 1; priorIndex >= 0; priorIndex -= 1) {
      const prior = result[priorIndex]
      if (prior.role === 'assistant') break
      if (
        prior.role === 'user' &&
        sameMessageContent(prior, message) &&
        withinDedupeWindow(prior, message)
      ) {
        skip = true
        break
      }
    }

    if (!skip) {
      for (let priorIndex = 0; priorIndex < result.length; priorIndex += 1) {
        const prior = result[priorIndex]
        if (prior.role !== 'user' || !sameMessageContent(prior, message) || !withinDedupeWindow(prior, message)) {
          continue
        }
        let assistantBetween = false
        for (let between = priorIndex + 1; between < result.length; between += 1) {
          if (result[between].role === 'assistant') {
            assistantBetween = true
            break
          }
        }
        if (!assistantBetween) {
          skip = true
          break
        }
      }
    }

    if (!skip) result.push(message)
  }

  return result
}

export function repairOrbChat(chat: StandaloneChat): StandaloneChat {
  const messages = dedupeOrbMessages(chat.messages ?? [])
  return {
    ...chat,
    messages,
    updatedAt: Math.max(chat.updatedAt ?? 0, messages[messages.length - 1]?.createdAt ?? 0)
  }
}

export function repairOrbWorkspace(workspace: StandaloneWorkspace): StandaloneWorkspace {
  const chats = (workspace.chats ?? []).map((chat) => repairOrbChat(chat))
  let activeChatId = workspace.activeChatId
  if (activeChatId && !chats.some((chat) => chat.id === activeChatId)) {
    activeChatId = chats[0]?.id ?? null
  }
  return {
    ...workspace,
    version: WORKSPACE_SCHEMA_VERSION,
    activeChatId,
    chats
  }
}

export function readStandaloneWorkspace(): StandaloneWorkspace {
  if (typeof window === 'undefined') return defaultWorkspace()
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (!raw) return defaultWorkspace()
    const parsed = JSON.parse(raw) as Partial<StandaloneWorkspace>
    const base = defaultWorkspace()
    const projects =
      Array.isArray(parsed.projects) && parsed.projects.length
        ? parsed.projects
        : base.projects
    const hasGeneral = projects.some((p) => p.id === STANDALONE_GENERAL_PROJECT_ID)
    const loaded: StandaloneWorkspace = {
      version: (parsed.version as StandaloneWorkspace['version']) ?? 1,
      activeChatId: parsed.activeChatId ?? null,
      activeProjectId: parsed.activeProjectId ?? STANDALONE_GENERAL_PROJECT_ID,
      projects: hasGeneral ? projects : [...base.projects, ...projects],
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      chats: Array.isArray(parsed.chats) ? parsed.chats : []
    }
    const repaired = repairOrbWorkspace(loaded)
    const messagesBefore = loaded.chats.reduce((count, chat) => count + (chat.messages?.length ?? 0), 0)
    const messagesAfter = repaired.chats.reduce((count, chat) => count + chat.messages.length, 0)
    if ((loaded.version ?? 1) < WORKSPACE_SCHEMA_VERSION || messagesBefore !== messagesAfter) {
      writeStandaloneWorkspace(repaired)
    }
    return repaired
  } catch {
    return defaultWorkspace()
  }
}

export function writeStandaloneWorkspace(workspace: StandaloneWorkspace) {
  if (typeof window === 'undefined') return
  try {
    const repaired = repairOrbWorkspace(workspace)
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(repaired))
  } catch {
    /* quota */
  }
}

export function createStandaloneProject(name: string, description?: string): StandaloneProject {
  const stamp = now()
  return {
    id: newId('project'),
    name: name.trim() || 'Untitled project',
    description: description?.trim() || undefined,
    color: '#67e8f9',
    icon: '▣',
    createdAt: stamp,
    updatedAt: stamp
  }
}

export function createStandaloneProfile(input: {
  name: string
  label: string
  description?: string
  notes?: string
  tags?: string[]
  promptInstructions?: string
  avatarInitial?: string
}): StandaloneProfile {
  const stamp = now()
  const initial = input.avatarInitial?.trim() || input.name.trim().slice(0, 1).toUpperCase() || '?'
  return {
    id: newId('profile'),
    name: input.name.trim() || 'Unnamed profile',
    label: input.label.trim() || 'Context',
    description: input.description?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    tags: input.tags?.filter(Boolean),
    promptInstructions: input.promptInstructions?.trim() || undefined,
    avatarInitial: initial,
    createdAt: stamp,
    updatedAt: stamp
  }
}

export function createStandaloneChat(
  projectId: string,
  mode: StandaloneOrbMode | string = 'Ask ORB',
  options?: { temporary?: boolean }
): StandaloneChat {
  const stamp = now()
  return {
    id: newId('chat'),
    title: options?.temporary ? 'Temporary chat' : 'New conversation',
    projectId,
    profileIds: [],
    messages: [],
    mode,
    conversationId: `standalone-${stamp.toString(36)}`,
    temporary: options?.temporary,
    createdAt: stamp,
    updatedAt: stamp
  }
}

export function titleFromFirstMessage(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return 'New conversation'
  const snippet = trimmed.slice(0, 48)
  return snippet.length < trimmed.length ? `${snippet}…` : snippet
}

export function searchChats(
  chats: StandaloneChat[],
  query: string,
  options?: { projectId?: string; profileId?: string; includeArchived?: boolean }
): StandaloneChat[] {
  const q = query.trim().toLowerCase()
  return chats
    .filter((chat) => {
      if (!options?.includeArchived && chat.archived) return false
      if (options?.projectId && chat.projectId !== options.projectId) return false
      if (options?.profileId && !chat.profileIds.includes(options.profileId)) return false
      if (!q) return true
      if (chat.title.toLowerCase().includes(q)) return true
      return chat.messages.some((m) => m.content.toLowerCase().includes(q))
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.updatedAt - a.updatedAt
    })
}

export function clearStandaloneLocalState(): StandaloneWorkspace {
  const empty = repairOrbWorkspace({
    version: 2,
    activeChatId: null,
    activeProjectId: STANDALONE_GENERAL_PROJECT_ID,
    projects: [...DEFAULT_STANDALONE_PROJECTS],
    profiles: [],
    chats: []
  })
  writeStandaloneWorkspace(empty)
  return empty
}

export function exportStandaloneWorkspaceJson(workspace: StandaloneWorkspace): string {
  return JSON.stringify(repairOrbWorkspace(workspace), null, 2)
}

export function clearStandaloneProfiles(workspace: StandaloneWorkspace): StandaloneWorkspace {
  const next = repairOrbWorkspace({ ...workspace, profiles: [] })
  writeStandaloneWorkspace(next)
  return next
}

export function clearStandaloneCustomProjects(workspace: StandaloneWorkspace): StandaloneWorkspace {
  const general = workspace.projects.filter((p) => p.id === STANDALONE_GENERAL_PROJECT_ID)
  const projects = general.length ? general : DEFAULT_STANDALONE_PROJECTS
  const next = repairOrbWorkspace({
    ...workspace,
    projects: [...projects],
    activeProjectId: STANDALONE_GENERAL_PROJECT_ID,
    chats: workspace.chats.map((c) => ({ ...c, projectId: STANDALONE_GENERAL_PROJECT_ID }))
  })
  writeStandaloneWorkspace(next)
  return next
}

export function buildProfileContextBlock(profiles: StandaloneProfile[]): string {
  if (!profiles.length) return ''
  const blocks = profiles.map((profile) => {
    const lines = [
      `Profile: ${profile.name} (${profile.label})`,
      profile.description ? `Description: ${profile.description}` : '',
      profile.notes ? `Notes: ${profile.notes}` : '',
      profile.tags?.length ? `Tags: ${profile.tags.join(', ')}` : '',
      profile.promptInstructions ? `Instructions: ${profile.promptInstructions}` : ''
    ].filter(Boolean)
    return lines.join('\n')
  })
  return [
    'The user attached standalone context profiles (user-provided, not IndiCare OS records):',
    ...blocks
  ].join('\n\n')
}
