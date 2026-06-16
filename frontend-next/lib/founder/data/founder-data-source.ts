/**
 * Detects which real founder data sources are available in the current app.
 * In live-only mode, missing sources return empty/unavailable data — never mock fallback.
 */

import {
  formatSourceConnectionStatus,
  isFounderLiveOnlyMode,
  resolveFounderSourceMode,
  type FounderSourceConnectionStatus,
  type FounderSourceMode
} from './founder-data-mode'
import { probeFounderLiveEndpoint } from './adapters/adapter-utils'

export type { FounderSourceConnectionStatus, FounderSourceMode } from './founder-data-mode'

export type FounderDataSourceAvailability = {
  usersAvailable: boolean
  providersAvailable: boolean
  homesAvailable: boolean
  orbConversationsAvailable: boolean
  featureEventsAvailable: boolean
  billingAvailable: boolean
  aiUsageAvailable: boolean
  readinessAvailable: boolean
  sourceMode: FounderSourceMode
}

export type FounderDataSourceKey =
  | 'users'
  | 'providers'
  | 'homes'
  | 'orbConversations'
  | 'featureEvents'
  | 'billing'
  | 'aiUsage'
  | 'readiness'

const FOUNDER_LIVE_TARGETS: Record<FounderDataSourceKey, string | null> = {
  users: 'orb-billing-usage',
  providers: 'providers',
  homes: 'homes',
  orbConversations: 'orb-feedback-summary',
  featureEvents: null,
  billing: 'orb-billing-usage',
  aiUsage: 'orb-billing-usage',
  readiness: 'inspection-readiness'
}

const AVAILABILITY_FIELDS: Record<FounderDataSourceKey, keyof Omit<FounderDataSourceAvailability, 'sourceMode'>> = {
  users: 'usersAvailable',
  providers: 'providersAvailable',
  homes: 'homesAvailable',
  orbConversations: 'orbConversationsAvailable',
  featureEvents: 'featureEventsAvailable',
  billing: 'billingAvailable',
  aiUsage: 'aiUsageAvailable',
  readiness: 'readinessAvailable'
}

function deriveSourceMode(availability: Omit<FounderDataSourceAvailability, 'sourceMode'>): FounderSourceMode {
  if (isFounderLiveOnlyMode()) return 'live-only'

  const flags = [
    availability.usersAvailable,
    availability.providersAvailable,
    availability.homesAvailable,
    availability.orbConversationsAvailable,
    availability.featureEventsAvailable,
    availability.billingAvailable,
    availability.aiUsageAvailable,
    availability.readinessAvailable
  ]

  const liveCount = flags.filter(Boolean).length
  return resolveFounderSourceMode(liveCount, flags.length)
}

export type FounderSourceRecordCounts = Partial<Record<FounderDataSourceKey, number>>

/** Per-source connection status for the Founder Data Status card. */
export function deriveSourceConnectionStatuses(
  availability: Omit<FounderDataSourceAvailability, 'sourceMode'>,
  recordCounts: FounderSourceRecordCounts = {}
): Record<FounderDataSourceKey, FounderSourceConnectionStatus> {
  const statuses = {} as Record<FounderDataSourceKey, FounderSourceConnectionStatus>

  for (const key of Object.keys(FOUNDER_LIVE_TARGETS) as FounderDataSourceKey[]) {
    const connected = availability[AVAILABILITY_FIELDS[key]]
    if (!connected) {
      statuses[key] = 'not-connected'
      continue
    }

    const count = recordCounts[key]
    if (typeof count === 'number' && count <= 0) {
      statuses[key] = 'no-records'
    } else {
      statuses[key] = 'connected'
    }
  }

  return statuses
}

export { formatSourceConnectionStatus }

/** Synchronous capability check — whether endpoints are defined for this app build. */
export function detectFounderDataSourcesSync(): FounderDataSourceAvailability {
  const availability = {
    usersAvailable: Boolean(FOUNDER_LIVE_TARGETS.users),
    providersAvailable: Boolean(FOUNDER_LIVE_TARGETS.providers),
    homesAvailable: Boolean(FOUNDER_LIVE_TARGETS.homes),
    orbConversationsAvailable: Boolean(FOUNDER_LIVE_TARGETS.orbConversations),
    featureEventsAvailable: false,
    billingAvailable: Boolean(FOUNDER_LIVE_TARGETS.billing),
    aiUsageAvailable: Boolean(FOUNDER_LIVE_TARGETS.aiUsage),
    readinessAvailable: Boolean(FOUNDER_LIVE_TARGETS.readiness)
  }

  return {
    ...availability,
    sourceMode: deriveSourceMode(availability)
  }
}

/** Runtime probe — attempts lightweight requests to confirm live connectivity. */
export async function probeFounderDataSources(): Promise<FounderDataSourceAvailability> {
  const sync = detectFounderDataSourcesSync()

  if (typeof window === 'undefined') {
    return sync
  }

  const [users, providers, homes, orb, billing, readiness] = await Promise.all([
    sync.usersAvailable
      ? probeFounderLiveEndpoint(FOUNDER_LIVE_TARGETS.users!, { days: '7' })
      : Promise.resolve(false),
    sync.providersAvailable
      ? probeFounderLiveEndpoint(FOUNDER_LIVE_TARGETS.providers!)
      : Promise.resolve(false),
    sync.homesAvailable ? probeFounderLiveEndpoint(FOUNDER_LIVE_TARGETS.homes!) : Promise.resolve(false),
    sync.orbConversationsAvailable
      ? probeFounderLiveEndpoint(FOUNDER_LIVE_TARGETS.orbConversations!, { days: '7' })
      : Promise.resolve(false),
    sync.billingAvailable
      ? probeFounderLiveEndpoint(FOUNDER_LIVE_TARGETS.billing!, { days: '7' })
      : Promise.resolve(false),
    sync.readinessAvailable
      ? probeFounderLiveEndpoint(FOUNDER_LIVE_TARGETS.readiness!)
      : Promise.resolve(false)
  ])

  const availability = {
    usersAvailable: users,
    providersAvailable: providers,
    homesAvailable: homes,
    orbConversationsAvailable: orb,
    featureEventsAvailable: false,
    billingAvailable: billing,
    aiUsageAvailable: billing,
    readinessAvailable: readiness
  }

  return {
    ...availability,
    sourceMode: deriveSourceMode(availability)
  }
}

export const FOUNDER_DATA_SOURCE_LABELS: Record<FounderDataSourceKey, string> = {
  users: 'Users',
  providers: 'Providers',
  homes: 'Homes',
  orbConversations: 'ORB Conversations',
  featureEvents: 'Feature Events',
  billing: 'Billing',
  aiUsage: 'AI Usage',
  readiness: 'Readiness'
}
