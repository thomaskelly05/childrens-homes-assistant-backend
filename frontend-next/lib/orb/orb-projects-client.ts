import { authFetch, authFetchResponse } from '@/lib/auth/api'

import type { OrbResidentialProjectMemory } from '@/lib/orb/orb-residential-projects'

export type OrbServerProject = {
  id: string
  title: string
  description?: string | null
  memory?: string | null
  chat_ids: string[]
  created_at?: string
  updated_at?: string
}

export const ORB_PROJECTS_API = {
  list: '/orb/projects',
  create: '/orb/projects',
  patch: (id: string) => `/orb/projects/${encodeURIComponent(id)}`,
  remove: (id: string) => `/orb/projects/${encodeURIComponent(id)}`,
  linkChat: (projectId: string, chatId: string) =>
    `/orb/projects/${encodeURIComponent(projectId)}/chats/${encodeURIComponent(chatId)}`
} as const

export async function fetchOrbServerProjects(): Promise<OrbServerProject[]> {
  const response = await authFetch<OrbServerProject[] | { data?: OrbServerProject[] }>(ORB_PROJECTS_API.list, {
    credentials: 'include'
  })
  if (Array.isArray(response)) return response
  return (response as { data?: OrbServerProject[] }).data ?? []
}

export async function upsertOrbServerProject(project: OrbResidentialProjectMemory): Promise<OrbServerProject | null> {
  try {
    const response = await authFetchResponse(ORB_PROJECTS_API.patch(project.id), {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: project.title,
        description: project.description,
        memory: project.pinnedContext
      })
    })
    if (response.status === 404) {
      const created = await authFetch<OrbServerProject>(ORB_PROJECTS_API.create, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          title: project.title,
          description: project.description,
          memory: project.pinnedContext
        })
      })
      return created
    }
    if (!response.ok) return null
    return (await response.json()) as OrbServerProject
  } catch {
    return null
  }
}

export async function syncOrbProjectsToServer(projects: OrbResidentialProjectMemory[]): Promise<void> {
  for (const project of projects) {
    await upsertOrbServerProject(project)
    for (const chatId of project.chatIds) {
      try {
        await authFetch(ORB_PROJECTS_API.linkChat(project.id, chatId), {
          method: 'POST',
          credentials: 'include'
        })
      } catch {
        // Non-blocking sync
      }
    }
  }
}

export function mergeServerProjectsWithLocal(
  local: OrbResidentialProjectMemory[],
  server: OrbServerProject[]
): OrbResidentialProjectMemory[] {
  if (!server.length) return local
  const byId = new Map(local.map((p) => [p.id, p]))
  for (const row of server) {
    const existing = byId.get(row.id)
    const memory = row.memory?.trim() || existing?.pinnedContext
    byId.set(row.id, {
      id: row.id,
      title: row.title || existing?.title || 'Project',
      description: row.description ?? existing?.description,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      chatIds: row.chat_ids?.length ? row.chat_ids : existing?.chatIds ?? [],
      pinnedContext: memory
    })
  }
  return Array.from(byId.values())
}
