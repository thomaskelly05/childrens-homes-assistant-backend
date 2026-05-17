import { osGet } from './client'
import { emptyWorkspaceBundle, getWorkspaceBundle, type WorkspaceBundle } from './bundles'
import type { OsApiResult } from './types'

export type ConnectThread = {
  id: number | string
  title: string
  thread_type: string
  unread_count?: number
  latest_message_at?: string | null
  [key: string]: unknown
}

export type ConnectMessage = {
  id: number | string
  body: string
  priority: string
  author_name?: string | null
  created_at?: string | null
  [key: string]: unknown
}

export type ConnectThreadsResponse = {
  ok?: boolean
  available?: boolean
  items: ConnectThread[]
}

export type ConnectThreadResponse = {
  ok?: boolean
  available?: boolean
  thread?: ConnectThread | null
  messages: ConnectMessage[]
}

export type MeToday = {
  adult: Record<string, any>
  home: Record<string, any> | null
  provider?: Record<string, any> | null
  handover: Record<string, any>
  connect: { count: number; threads: Record<string, any>[] }
  notifications: { unread: number; items: Record<string, any>[] }
  tasks_due_today?: Record<string, any>[]
  key_children?: Record<string, any>[]
  recent_activity?: Record<string, any>[]
  dashboard_preferences?: Record<string, any>
}

export type NotificationsResponse = {
  ok?: boolean
  available?: boolean
  items: Array<Record<string, any>>
  unread?: number
}

export type HandoverTodayResponse = {
  ok?: boolean
  available?: boolean
  items: Array<Record<string, any>>
  summary?: Record<string, any>
}

export async function getConnectThreads(): Promise<OsApiResult<ConnectThreadsResponse>> {
  return osGet<ConnectThreadsResponse>('/api/connect/threads', { items: [] })
}

export async function getConnectThread(threadId: string): Promise<OsApiResult<ConnectThreadResponse>> {
  return osGet<ConnectThreadResponse>(`/api/connect/threads/${encodeURIComponent(threadId)}`, { thread: null, messages: [] })
}

export async function getNotifications(): Promise<OsApiResult<NotificationsResponse>> {
  return osGet<NotificationsResponse>('/api/notifications', { items: [], unread: 0 })
}

export async function getHandoverToday(): Promise<OsApiResult<HandoverTodayResponse>> {
  return osGet<HandoverTodayResponse>('/api/handover/today', { items: [], summary: {} })
}

export async function getMeToday(): Promise<OsApiResult<MeToday>> {
  const result = await getWorkspaceBundle()
  const bundle = result.data || emptyWorkspaceBundle
  return {
    ...result,
    data: {
      adult: {
        id: bundle.identity.user_id,
        name: bundle.identity.display_name,
        preferred_name: bundle.identity.preferred_name,
        role: bundle.identity.role,
        email: bundle.identity.email,
        profile_photo: bundle.identity.avatar_url
      },
      home: bundle.home,
      handover: bundle.handover,
      connect: { count: bundle.connect.unread_count, threads: bundle.connect.recent_threads },
      notifications: { unread: bundle.notifications.unread_count, items: bundle.notifications.items },
      recent_activity: bundle.recent_chronology,
      key_children: bundle.children.visible,
      dashboard_preferences: bundle.preferences
    }
  }
}

export async function getMeWorkspace(): Promise<OsApiResult<WorkspaceBundle>> {
  return getWorkspaceBundle()
}
