import { buildOrbFrontDoorUrl } from '@/lib/orb/orb-front-door-routing'

/** Safe post-logout URL for switching ORB sign-in provider without clearing billing data server-side. */
export function orbSwitchAccountLoginUrl(returnUrl = '/orb'): string {
  return buildOrbFrontDoorUrl(returnUrl)
}
