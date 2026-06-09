/**
 * Detects which real founder data sources are available in the current app.
 * Missing sources return false and allow mock fallback downstream.
 */

import { ORB_ADMIN_API_PATHS } from '@/lib/orb/admin-quality-client'
import { probeEndpoint } from './adapters/adapter-utils'

export type FounderSourceMode = 'live' | 'hybrid' | 'mock'

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

const KNOWN_ENDPOINTS: Record<FounderDataSourceKey, string[]> = {
  users: [ORB_ADMIN_API_PATHS.billingUsage],
  providers: ['/api/providers'],
  homes: ['/api/homes'],
  orbConversations: [ORB_ADMIN_API_PATHS.feedbackSummary],
  featureEvents: [],
  billing: [ORB_ADMIN_API_PATHS.billingUsage],
  aiUsage: [ORB_ADMIN_API_PATHS.billingUsage],
  readiness: ['/api/inspection-readiness/health']
}

function deriveSourceMode(availability: Omit<FounderDataSourceAvailability, 'sourceMode'>): FounderSourceMode {
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
  if (liveCount === 0) return 'mock'
  if (liveCount === flags.length) return 'live'
  return 'hybrid'
}

/** Synchronous capability check — whether endpoints are defined for this app build. */
export function detectFounderDataSourcesSync(): FounderDataSourceAvailability {
  const availability = {
    usersAvailable: KNOWN_ENDPOINTS.users.length > 0,
    providersAvailable: KNOWN_ENDPOINTS.providers.length > 0,
    homesAvailable: KNOWN_ENDPOINTS.homes.length > 0,
    orbConversationsAvailable: KNOWN_ENDPOINTS.orbConversations.length > 0,
    featureEventsAvailable: false,
    billingAvailable: KNOWN_ENDPOINTS.billing.length > 0,
    aiUsageAvailable: KNOWN_ENDPOINTS.aiUsage.length > 0,
    readinessAvailable: KNOWN_ENDPOINTS.readiness.length > 0
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
    sync.usersAvailable ? probeEndpoint(`${KNOWN_ENDPOINTS.users[0]}?days=7`) : Promise.resolve(false),
    sync.providersAvailable ? probeEndpoint(KNOWN_ENDPOINTS.providers[0]) : Promise.resolve(false),
    sync.homesAvailable ? probeEndpoint(KNOWN_ENDPOINTS.homes[0]) : Promise.resolve(false),
    sync.orbConversationsAvailable
      ? probeEndpoint(`${KNOWN_ENDPOINTS.orbConversations[0]}?days=7`)
      : Promise.resolve(false),
    sync.billingAvailable ? probeEndpoint(`${KNOWN_ENDPOINTS.billing[0]}?days=7`) : Promise.resolve(false),
    sync.readinessAvailable ? probeEndpoint(KNOWN_ENDPOINTS.readiness[0]) : Promise.resolve(false)
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
