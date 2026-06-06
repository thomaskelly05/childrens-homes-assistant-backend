/** ORB access endpoint contract version — must match backend payload. */

export const ORB_ACCESS_CONTRACT_VERSION = 'orb_access_v2'

export function isOrbAccessContractCompatible(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const record = payload as Record<string, unknown>
  const version = record.contract_version
  if (typeof version !== 'string') return false
  return version === ORB_ACCESS_CONTRACT_VERSION
}
