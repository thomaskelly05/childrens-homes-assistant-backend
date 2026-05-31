import { redirect } from 'next/navigation'

/** Legacy route — canonical setup is /orb/setup */
export default function OrbOnboardingRedirect() {
  redirect('/orb/setup')
}
