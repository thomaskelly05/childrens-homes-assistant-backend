import type { AdminDataMode } from './types'

export const ADMIN_DATA_MODE_LABELS: Record<AdminDataMode, string> = {
  development: 'Development',
  live: 'Live',
  mixed: 'Mixed'
}

function readEnv(name: string): string | undefined {
  const publicName = `NEXT_PUBLIC_${name}`
  return (
    (typeof process !== 'undefined' ? process.env[publicName] : undefined) ??
    (typeof process !== 'undefined' ? process.env[name] : undefined)
  )?.trim()
}

/** Phase 1: placeholder operational data until live admin APIs are wired. */
export function getAdminDataMode(): AdminDataMode {
  const explicit = readEnv('ADMIN_COMMAND_CENTRE_DATA_MODE')?.toLowerCase()
  if (explicit === 'live' || explicit === 'mixed' || explicit === 'development') {
    return explicit
  }
  return 'development'
}

export function isAdminDevelopmentMode(): boolean {
  return getAdminDataMode() === 'development'
}

export const ADMIN_MODE_LABELS = {
  development: 'Development mode',
  placeholder: 'Placeholder operational data',
  notLive: 'Not live platform usage',
  actionPending: 'Action wiring pending'
} as const
