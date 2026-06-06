import { authFetch, AuthApiError } from '@/lib/auth/api'
import type { OrbAccessPayload } from '@/lib/orb/orb-billing-client'
import { recordOrbBootstrapRequest } from '@/lib/orb/orb-request-storm-guard'

export const ORB_FRONT_DOOR_VERDICT_PATH = '/orb/front-door/verdict'
export const ORB_FRONT_DOOR_CONTRACT_VERSION = 'orb_front_door_v1'

export type OrbFrontDoorVerdictKind =
  | 'unauthenticated'
  | 'inactive'
  | 'safety_required'
  | 'ready'
  | 'retry'

export type OrbFrontDoorVerdictPayload = {
  contract_version: string
  verdict: OrbFrontDoorVerdictKind
  authenticated: boolean
  can_use_orb: boolean
  access_blocker: string | null
  safety_accepted: boolean
  subscription: Record<string, unknown> | null
  user: {
    id?: number
    email?: string
    first_name?: string | null
    last_name?: string | null
    role?: string | null
  } | null
  frontend_should_mount_product: boolean
  allowed_bootstrap: boolean
  backend_build: string
  reason: string
  clear_session?: boolean
  access?: OrbAccessPayload | null
}

export type OrbFrontDoorVerdictResponse = {
  success: boolean
  data: OrbFrontDoorVerdictPayload
}

let verdictInFlight: Promise<OrbFrontDoorVerdictPayload> | null = null
let lastVerdict: OrbFrontDoorVerdictPayload | null = null

export function getCachedOrbFrontDoorVerdict(): OrbFrontDoorVerdictPayload | null {
  return lastVerdict
}

export function resetOrbFrontDoorVerdictCache(): void {
  verdictInFlight = null
  lastVerdict = null
}

export async function fetchOrbFrontDoorVerdict(options?: {
  force?: boolean
}): Promise<OrbFrontDoorVerdictPayload> {
  if (!options?.force && lastVerdict) {
    return lastVerdict
  }
  if (!options?.force && verdictInFlight) {
    return verdictInFlight
  }

  const run = async () => {
    recordOrbBootstrapRequest('verdict')
    const response = await authFetch<OrbFrontDoorVerdictResponse>(ORB_FRONT_DOOR_VERDICT_PATH, {
      method: 'GET',
      credentials: 'include'
    })
    const payload = response?.data
    if (!payload || payload.contract_version !== ORB_FRONT_DOOR_CONTRACT_VERSION) {
      throw new AuthApiError(503, {
        code: 'verdict_contract_mismatch',
        message: 'ORB front-door contract mismatch'
      })
    }
    lastVerdict = payload
    return payload
  }

  verdictInFlight = run().finally(() => {
    verdictInFlight = null
  })
  return verdictInFlight
}

export function mapVerdictToGateState(
  verdict: OrbFrontDoorVerdictKind
): 'unauthenticated' | 'inactive' | 'safety_required' | 'ready' | 'access_retry' | 'checking_auth' {
  switch (verdict) {
    case 'ready':
      return 'ready'
    case 'inactive':
      return 'inactive'
    case 'safety_required':
      return 'safety_required'
    case 'retry':
      return 'access_retry'
    case 'unauthenticated':
    default:
      return 'unauthenticated'
  }
}
