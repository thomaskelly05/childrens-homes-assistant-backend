import { redirect } from 'next/navigation'

import { buildOrbFrontDoorUrl } from '@/lib/orb/orb-front-door-routing'

type OrbLoginPageProps = {
  searchParams?: Promise<{ returnUrl?: string }>
}

/** Legacy ORB login path — canonical sign-in lives on /orb via OrbAuthGate. */
export default async function OrbLoginPage({ searchParams }: OrbLoginPageProps) {
  const params = (await searchParams) ?? {}
  redirect(buildOrbFrontDoorUrl(params.returnUrl))
}
