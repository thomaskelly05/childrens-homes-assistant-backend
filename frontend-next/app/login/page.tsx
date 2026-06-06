import { redirect } from 'next/navigation'

import { buildOrbFrontDoorUrl } from '@/lib/orb/orb-front-door-routing'

type LoginPageProps = {
  searchParams?: Promise<{ returnUrl?: string }>
}

/** Legacy OS login route — converges to the ORB Residential front door. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {}
  redirect(buildOrbFrontDoorUrl(params.returnUrl))
}
