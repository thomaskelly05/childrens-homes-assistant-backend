import { isOrbPublicAuthPath, isOrbSurfacePath } from '@/lib/orb/orb-front-door-routing'

let verdictProbeComplete = false
let verdictReady = false
let deferOrbAuthMe = false

export function markOrbFrontDoorVerdictProbeStarted(): void {
  deferOrbAuthMe = true
  verdictProbeComplete = false
  verdictReady = false
}

export function markOrbFrontDoorVerdictResolved(ready: boolean): void {
  verdictProbeComplete = true
  verdictReady = ready
  deferOrbAuthMe = !ready
}

export function markOrbFrontDoorVerdictReady(): void {
  markOrbFrontDoorVerdictResolved(true)
}

export function resetOrbFrontDoorVerdictStore(): void {
  verdictProbeComplete = false
  verdictReady = false
  deferOrbAuthMe = false
}

export function isOrbFrontDoorVerdictReady(): boolean {
  return verdictReady
}

export function shouldDeferOrbAuthMeProbe(pathname: string): boolean {
  if (!isOrbSurfacePath(pathname) || isOrbPublicAuthPath(pathname)) {
    return false
  }
  return deferOrbAuthMe || !verdictProbeComplete
}
