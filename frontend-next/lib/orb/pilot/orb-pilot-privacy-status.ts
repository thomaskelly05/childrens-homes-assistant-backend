import { ORB_PRIVACY_VERSION } from '@/lib/orb/privacy/orb-privacy-content'

export type OrbPilotPrivacyStatus = {
  privacyUxCompleted: boolean
  privacyNoticeAvailable: boolean
  version: string | null
  limitations: string[]
}

/**
 * Closed-pilot privacy UX status from shipped version markers.
 * Full file-contract checks run in orb-pilot.test.ts at build verification time.
 */
export function assessOrbPilotPrivacyStatus(): OrbPilotPrivacyStatus {
  const limitations: string[] = []
  const privacyNoticeAvailable = ORB_PRIVACY_VERSION.includes('closed-pilot')
  const privacyUxCompleted = privacyNoticeAvailable

  if (!privacyNoticeAvailable) {
    limitations.push('Privacy notice version is not marked for closed pilot.')
  }

  return {
    privacyUxCompleted,
    privacyNoticeAvailable,
    version: privacyNoticeAvailable ? ORB_PRIVACY_VERSION : null,
    limitations
  }
}
