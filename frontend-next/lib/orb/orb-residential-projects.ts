'use client'

import {
  STANDALONE_GENERAL_PROJECT_ID,
  type StandaloneProject,
  type StandaloneWorkspace
} from '@/lib/orb/standalone-local-store'

/** Client-side project memory for ORB Residential (future backend sync). */
export const ORB_PROJECTS_STORAGE_KEY = 'orb-projects'

export type OrbResidentialProjectMemory = {
  id: string
  title: string
  description?: string
  createdAt: number
  updatedAt: number
  chatIds: string[]
  pinnedContext?: string
}

export const ORB_RESIDENTIAL_DEFAULT_PROJECTS: Array<{
  id: string
  name: string
  description: string
}> = [
  {
    id: 'project-my-home',
    name: 'My Home',
    description: 'Day-to-day practice, recording and home context'
  },
  {
    id: 'project-inspection-prep',
    name: 'Inspection preparation',
    description: 'Inspection evidence preparation, SCCIF and evidence'
  },
  {
    id: 'project-safeguarding',
    name: 'Safeguarding',
    description: 'Concerns, escalation and learning'
  },
  {
    id: 'project-templates',
    name: 'Templates',
    description: 'Records, plans and structured documents'
  },
  {
    id: 'project-training',
    name: 'Training & learning',
    description: 'CPD, supervision and reflective practice'
  }
]

function timestamp() {
  return Date.now()
}

export function residentialProjectsToMemory(workspace: StandaloneWorkspace): OrbResidentialProjectMemory[] {
  const chats = Array.isArray(workspace.chats) ? workspace.chats : []
  return (Array.isArray(workspace.projects) ? workspace.projects : []).map((project) => {
    const extended = project as { memory?: string }
    const memory = extended.memory?.trim() || project.description?.trim()
    return {
      id: project.id,
      title: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      chatIds: chats.filter((chat) => chat.projectId === project.id).map((chat) => chat.id),
      pinnedContext: memory || undefined
    }
  })
}

export function writeOrbProjectsMemory(workspace: StandaloneWorkspace): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ORB_PROJECTS_STORAGE_KEY, JSON.stringify(residentialProjectsToMemory(workspace)))
  } catch {
    // ignore
  }
}

export function readOrbProjectsMemory(): OrbResidentialProjectMemory[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ORB_PROJECTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed
      .filter((entry): entry is OrbResidentialProjectMemory => Boolean(entry && typeof entry === 'object'))
      .map((entry) => ({
        id: String((entry as OrbResidentialProjectMemory).id),
        title: String((entry as OrbResidentialProjectMemory).title || 'Project'),
        description: (entry as OrbResidentialProjectMemory).description,
        createdAt: Number((entry as OrbResidentialProjectMemory).createdAt) || timestamp(),
        updatedAt: Number((entry as OrbResidentialProjectMemory).updatedAt) || timestamp(),
        chatIds: Array.isArray((entry as OrbResidentialProjectMemory).chatIds)
          ? (entry as OrbResidentialProjectMemory).chatIds.map(String)
          : [],
        pinnedContext: (entry as OrbResidentialProjectMemory).pinnedContext
      }))
  } catch {
    return null
  }
}

/** Seed ChatGPT-style residential folders without removing existing workspace data. */
export function ensureResidentialWorkspaceProjects(workspace: StandaloneWorkspace): StandaloneWorkspace {
  const existing = Array.isArray(workspace.projects) ? workspace.projects : []
  const existingIds = new Set(existing.map((project) => project.id))
  const ts = timestamp()
  const additions: StandaloneProject[] = []

  for (const seed of ORB_RESIDENTIAL_DEFAULT_PROJECTS) {
    if (existingIds.has(seed.id)) continue
    additions.push({
      id: seed.id,
      name: seed.name,
      description: seed.description,
      color: '#42d7ff',
      icon: 'folder',
      createdAt: ts,
      updatedAt: ts
    })
  }

  if (!additions.length) return workspace

  const general =
    existing.find((project) => project.id === STANDALONE_GENERAL_PROJECT_ID) ||
    ({
      id: STANDALONE_GENERAL_PROJECT_ID,
      name: 'General',
      description: 'Everyday questions',
      color: '#22d3ee',
      icon: '*',
      createdAt: ts,
      updatedAt: ts
    } satisfies StandaloneProject)

  const withoutGeneral = existing.filter((project) => project.id !== STANDALONE_GENERAL_PROJECT_ID)
  const projects = [general, ...additions, ...withoutGeneral]

  return {
    ...workspace,
    projects,
    activeProjectId: projects.some((project) => project.id === workspace.activeProjectId)
      ? workspace.activeProjectId
      : STANDALONE_GENERAL_PROJECT_ID
  }
}
