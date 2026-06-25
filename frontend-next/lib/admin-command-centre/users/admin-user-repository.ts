import { AuthApiError, authFetch } from '@/lib/auth/api'

import type {
  AdminHomeOption,
  AdminProviderOption,
  BackendAdminHomeRow,
  BackendAdminProviderRow,
  BackendAdminUserRow
} from './admin-user-types.ts'

type ListUsersResponse = {
  ok?: boolean
  users?: BackendAdminUserRow[]
}

type UpdateUserResponse = {
  ok?: boolean
  user?: BackendAdminUserRow
}

type ListHomesResponse = {
  ok?: boolean
  homes?: BackendAdminHomeRow[]
}

type ListProvidersResponse = {
  ok?: boolean
  providers?: BackendAdminProviderRow[]
}

export class AdminUserRepositoryError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AdminUserRepositoryError'
    this.status = status
  }
}

function wrapAuthError(error: unknown, fallback: string): never {
  if (error instanceof AuthApiError) {
    throw new AdminUserRepositoryError(error.status, error.message || fallback)
  }
  if (error instanceof Error) {
    throw new AdminUserRepositoryError(0, error.message || fallback)
  }
  throw new AdminUserRepositoryError(0, fallback)
}

export async function fetchAdminUsersFromApi(): Promise<BackendAdminUserRow[]> {
  try {
    const payload = await authFetch<ListUsersResponse>('/admin/users/legacy')
    return Array.isArray(payload.users) ? payload.users : []
  } catch (error) {
    wrapAuthError(error, 'Could not load admin user directory')
  }
}

export async function fetchAdminUserByIdFromApi(userId: string): Promise<BackendAdminUserRow | null> {
  const users = await fetchAdminUsersFromApi()
  const numericId = Number(userId)
  return users.find((user) => user.id === numericId) ?? null
}

export async function fetchAdminHomesFromApi(): Promise<AdminHomeOption[]> {
  try {
    const payload = await authFetch<ListHomesResponse>('/admin/homes')
    return (payload.homes ?? []).map((home) => ({
      id: home.id,
      name: home.name,
      providerId: home.provider_id ?? null
    }))
  } catch {
    return []
  }
}

export async function fetchAdminProvidersFromApi(): Promise<AdminProviderOption[]> {
  try {
    const payload = await authFetch<ListProvidersResponse>('/admin/providers')
    return (payload.providers ?? []).map((provider) => ({
      id: provider.id,
      name: provider.name
    }))
  } catch {
    return []
  }
}

export async function patchAdminUserFromApi(
  userId: string,
  body: Record<string, unknown>
): Promise<BackendAdminUserRow> {
  try {
    const payload = await authFetch<UpdateUserResponse>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
    if (!payload.user) {
      throw new AdminUserRepositoryError(500, 'User update did not return user data')
    }
    return payload.user
  } catch (error) {
    wrapAuthError(error, 'Could not update user')
  }
}

export async function resetAdminUserPasswordFromApi(
  userId: string,
  password: string
): Promise<void> {
  try {
    await authFetch(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password })
    })
  } catch (error) {
    wrapAuthError(error, 'Could not reset user password')
  }
}
