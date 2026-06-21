/**
 * Phase 4H — residential landing routing (pure URL helpers, no store imports).
 */

export function shouldOpenOrbResidentialLandingFresh(searchParams: URLSearchParams): boolean {
  return !(
    searchParams.get('station') ||
    searchParams.get('mic') ||
    searchParams.get('q')?.trim() ||
    searchParams.get('guided_demo') === '1' ||
    searchParams.get('lens')
  )
}

export function stripOrbResidentialStationParam(searchParams: URLSearchParams): string | null {
  if (!searchParams.get('station')) return null
  const params = new URLSearchParams(searchParams.toString())
  params.delete('station')
  const qs = params.toString()
  return qs ? `/orb?${qs}` : '/orb'
}
