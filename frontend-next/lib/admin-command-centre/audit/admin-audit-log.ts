import { AuthApiError, authFetch } from '@/lib/auth/api'
import { getAdminDataMode, isAdminDevelopmentMode } from '../admin-data-mode.ts'
import { DEMO_AUDIT_LOG } from '../demo-data.ts'
import type { AuditRiskLevel } from '../types.ts'

export type AdminAuditTargetType = 'user' | 'provider' | 'home' | 'system'

export type AdminAuditEventStatus = 'success' | 'failed' | 'blocked'

export type AdminAuditLogEntry = {
  id: string
  actorId: string | null
  actorEmail: string | null
  action: string
  targetType: AdminAuditTargetType
  targetId: string | null
  targetLabel: string
  riskLevel: AuditRiskLevel
  reason: string
  timestamp: string
  status: AdminAuditEventStatus
  metadata?: Record<string, unknown>
}

export type AdminAuditFilter =
  | 'all'
  | 'user-actions'
  | 'provider-actions'
  | 'access-changes'
  | 'security-actions'
  | 'failed-actions'

export type AppendAdminAuditInput = {
  actorId?: string | null
  actorEmail?: string | null
  action: string
  targetType: AdminAuditTargetType
  targetId?: string | null
  targetLabel: string
  riskLevel?: AuditRiskLevel
  reason?: string
  status?: AdminAuditEventStatus
  metadata?: Record<string, unknown>
}

type BackendAuditRow = {
  id: number
  admin_user_id?: number | null
  action?: string | null
  target_type?: string | null
  target_id?: number | null
  details?: Record<string, unknown> | null
  created_at?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

type ListAuditResponse = {
  ok?: boolean
  audit?: BackendAuditRow[]
}

const memory: AdminAuditLogEntry[] = []
let memoryWarned = false

const ACCESS_ACTIONS = new Set([
  'disable_user',
  'reactivate_user',
  'update_user',
  'update_role',
  'update_provider_home',
  'revoke_sessions',
  'force_password_reset',
  'resend_invite'
])

const SECURITY_ACTIONS = new Set([
  'force_password_reset',
  'revoke_sessions',
  'disable_user',
  'reactivate_user',
  'lock_account'
])

function nextAuditId(): string {
  return `admin-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function actorLabel(row: BackendAuditRow): string {
  const email = row.email?.trim()
  if (email) return email
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
  if (name) return name
  if (row.admin_user_id != null) return `admin#${row.admin_user_id}`
  return 'system'
}

function mapTargetType(value: string | null | undefined): AdminAuditTargetType {
  const normalised = (value || '').trim().toLowerCase()
  if (normalised === 'user' || normalised === 'provider' || normalised === 'home') {
    return normalised
  }
  return 'system'
}

function inferRiskLevel(action: string, status: AdminAuditEventStatus): AuditRiskLevel {
  if (status === 'failed' || status === 'blocked') return 'medium'
  const normalised = action.toLowerCase()
  if (
    normalised.includes('disable') ||
    normalised.includes('revoke') ||
    normalised.includes('password') ||
    normalised.includes('role')
  ) {
    return 'high'
  }
  if (normalised.includes('update') || normalised.includes('reactivate')) {
    return 'medium'
  }
  return 'low'
}

function mapBackendAuditRow(row: BackendAuditRow): AdminAuditLogEntry {
  const action = row.action || 'unknown_action'
  const details = row.details ?? {}
  const status =
    typeof details.status === 'string' && ['success', 'failed', 'blocked'].includes(details.status)
      ? (details.status as AdminAuditEventStatus)
      : 'success'

  return {
    id: String(row.id),
    actorId: row.admin_user_id != null ? String(row.admin_user_id) : null,
    actorEmail: actorLabel(row),
    action,
    targetType: mapTargetType(row.target_type),
    targetId: row.target_id != null ? String(row.target_id) : null,
    targetLabel:
      typeof details.target_label === 'string'
        ? details.target_label
        : row.target_id != null
          ? String(row.target_id)
          : '—',
    riskLevel:
      typeof details.risk_level === 'string'
        ? (details.risk_level as AuditRiskLevel)
        : inferRiskLevel(action, status),
    reason: typeof details.reason === 'string' ? details.reason : '',
    timestamp: row.created_at || new Date().toISOString(),
    status,
    metadata: details
  }
}

function mapDemoAuditToEntry(
  entry: (typeof DEMO_AUDIT_LOG)[number],
  index: number
): AdminAuditLogEntry {
  const targetType = mapTargetType(entry.targetType)
  return {
    id: entry.id || `demo-audit-${index}`,
    actorId: null,
    actorEmail: entry.actor,
    action: entry.action,
    targetType,
    targetId: entry.target !== '—' ? entry.target : null,
    targetLabel: entry.target,
    riskLevel: entry.riskLevel,
    reason: entry.reason,
    timestamp: entry.timestamp,
    status: entry.status === 'failed' ? 'failed' : entry.status === 'pending' ? 'blocked' : 'success',
    metadata: { source: 'placeholder' }
  }
}

export function isAdminAuditMemoryFallback(): boolean {
  return isAdminDevelopmentMode() && getAdminDataMode() !== 'live'
}

export function appendAdminAuditLogMemory(input: AppendAdminAuditInput): AdminAuditLogEntry {
  const entry: AdminAuditLogEntry = {
    id: nextAuditId(),
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    targetLabel: input.targetLabel,
    riskLevel: input.riskLevel ?? inferRiskLevel(input.action, input.status ?? 'success'),
    reason: input.reason ?? '',
    timestamp: new Date().toISOString(),
    status: input.status ?? 'success',
    metadata: input.metadata
  }
  memory.unshift(entry)
  return entry
}

export async function appendAdminAuditLog(input: AppendAdminAuditInput): Promise<AdminAuditLogEntry> {
  if (isAdminAuditMemoryFallback()) {
    if (!memoryWarned) {
      memoryWarned = true
      console.warn(
        '[Admin Command Centre] Audit log using in-memory development fallback — not persisted.'
      )
    }
    return appendAdminAuditLogMemory(input)
  }

  // Backend audit rows are written by admin routes on successful mutations.
  // Client-side append records local telemetry when live API is unavailable.
  return appendAdminAuditLogMemory(input)
}

export async function listAdminAuditLog(limit = 200): Promise<AdminAuditLogEntry[]> {
  if (isAdminAuditMemoryFallback()) {
    const demo = DEMO_AUDIT_LOG.map(mapDemoAuditToEntry)
    return [...memory, ...demo].slice(0, limit)
  }

  try {
    const payload = await authFetch<ListAuditResponse>(`/admin/audit?limit=${limit}`)
    const backend = (payload.audit ?? []).map(mapBackendAuditRow)
    return [...memory, ...backend].slice(0, limit)
  } catch (error) {
    if (error instanceof AuthApiError && (error.status === 401 || error.status === 403)) {
      return [...memory]
    }
    if (isAdminDevelopmentMode()) {
      return [...memory, ...DEMO_AUDIT_LOG.map(mapDemoAuditToEntry)].slice(0, limit)
    }
    return [...memory]
  }
}

export function filterAdminAuditLog(
  entries: AdminAuditLogEntry[],
  filter: AdminAuditFilter
): AdminAuditLogEntry[] {
  if (filter === 'all') return entries
  if (filter === 'failed-actions') {
    return entries.filter((entry) => entry.status === 'failed' || entry.status === 'blocked')
  }
  if (filter === 'user-actions') {
    return entries.filter((entry) => entry.targetType === 'user')
  }
  if (filter === 'provider-actions') {
    return entries.filter(
      (entry) => entry.targetType === 'provider' || entry.targetType === 'home'
    )
  }
  if (filter === 'access-changes') {
    return entries.filter((entry) =>
      ACCESS_ACTIONS.has(entry.action) ||
      entry.action.includes('disable') ||
      entry.action.includes('reactivate') ||
      entry.action.includes('role') ||
      entry.action.includes('home')
    )
  }
  if (filter === 'security-actions') {
    return entries.filter(
      (entry) =>
        SECURITY_ACTIONS.has(entry.action) ||
        entry.riskLevel === 'high' ||
        entry.action.includes('password') ||
        entry.action.includes('session')
    )
  }
  return entries
}

export function resetAdminAuditLogMemory(): void {
  memory.length = 0
  memoryWarned = false
}

export function getAdminAuditLogMemorySnapshot(): AdminAuditLogEntry[] {
  return [...memory]
}
