'use client'

import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export type StandaloneChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageDataUrls?: string[]
  createdAt?: number
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
  createdAt: number
  updatedAt: number
}

export type StandaloneWorkspace = {
  version: 1
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
    id: 'project-ofsted',
    name: 'Ofsted Prep',
    description: 'Inspection lens and evidence thinking',
    color: '#a78bfa',
    icon: '◎',
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 'project-therapeutic',
    name: 'Therapeutic Practice',
    description: 'Trauma-informed and restorative reflection',
    color: '#fbbf24',
    icon: '◈',
    createdAt: 0,
    updatedAt: 0
  }
]

const WORKSPACE_STORAGE_KEY = 'orb-standalone-workspace-v1'

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
    version: 1,
    activeChatId: null,
    activeProjectId: STANDALONE_GENERAL_PROJECT_ID,
    projects,
    profiles: [],
    chats: []
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
    return {
      version: 1,
      activeChatId: parsed.activeChatId ?? null,
      activeProjectId: parsed.activeProjectId ?? STANDALONE_GENERAL_PROJECT_ID,
      projects: hasGeneral ? projects : [...base.projects, ...projects],
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      chats: Array.isArray(parsed.chats) ? parsed.chats : []
    }
  } catch {
    return defaultWorkspace()
  }
}

export function writeStandaloneWorkspace(workspace: StandaloneWorkspace) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
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

export function createStandaloneChat(projectId: string, mode: StandaloneOrbMode | string = 'Ask ORB'): StandaloneChat {
  const stamp = now()
  return {
    id: newId('chat'),
    title: 'New conversation',
    projectId,
    profileIds: [],
    messages: [],
    mode,
    conversationId: `standalone-${stamp.toString(36)}`,
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
