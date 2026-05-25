import { childOrbHref, homeOrbHref, type ScopeOrbMode } from '@/lib/navigation/scope-routes'

export type ScopeOrbWorkspace = 'child' | 'home'

export type ScopeOrbContextLabel = {
  workspace: ScopeOrbWorkspace
  headline: string
  subline: string
  privacyNotice: string
}

export function buildScopeOrbContextLabel(input: {
  workspace: ScopeOrbWorkspace
  childDisplayName?: string | null
  homeName?: string | null
}): ScopeOrbContextLabel {
  if (input.workspace === 'child') {
    const name = input.childDisplayName?.trim() || 'selected child'
    const home = input.homeName?.trim()
    return {
      workspace: 'child',
      headline: `Child workspace · ${name}`,
      subline: home ? `Home: ${home}` : 'Summary-level child context only',
      privacyNotice:
        'ORB uses permissioned summary context for this child. Ask explicitly for detailed record help — draft bodies are never sent automatically.'
    }
  }

  const home = input.homeName?.trim() || 'selected home'
  return {
    workspace: 'home',
    headline: `Home workspace · ${home}`,
    subline: 'Home-scoped operational context',
    privacyNotice:
      'ORB uses permissioned home summaries. No safeguarding narratives or HR content are placed in URLs — scope comes from your session and selections.'
  }
}

export function scopeOrbLaunchHref(input: {
  workspace: ScopeOrbWorkspace
  childId?: string | number
  homeId?: string | number
  mode?: ScopeOrbMode
  query?: string
}) {
  if (input.workspace === 'child' && input.childId != null) {
    const base = childOrbHref(input.childId, input.mode || 'record_quality_review')
    if (!input.query) return base
    const url = new URL(base, 'https://local.invalid')
    url.searchParams.set('q', input.query)
    return `${url.pathname}${url.search}`
  }
  if (input.homeId != null) {
    const base = homeOrbHref(input.homeId, input.mode || 'manager_daily_brief')
    if (!input.query) return base
    const url = new URL(base, 'https://local.invalid')
    url.searchParams.set('q', input.query)
    return `${url.pathname}${url.search}`
  }
  return homeOrbHref(0, input.mode || 'manager_daily_brief')
}
