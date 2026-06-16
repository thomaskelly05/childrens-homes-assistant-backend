/**
 * Unified operational ORB presence — one surface per page.
 * Standalone /orb is separate; operational OS uses /assistant/orb only.
 * Normal OS pages use quiet full-screen ORB button. Recording/editor pages use live coaching rail.
 */

export const ORB_QUIET_COPILOT_TAGLINE =
  'The care-intelligence layer for IndiCare OS — quiet until needed, then evidence-aware and child-centred.'

export type OperationalOrbScopeType =
  | 'child'
  | 'home'
  | 'record'
  | 'review'
  | 'archive'
  | 'chronology'
  | 'lifeecho'
  | 'plan_impacts'
  | 'handover'
  | 'inspection'
  | 'reg45'
  | 'sccif'
  | 'generic'

export type OrbPresenceScope = {
  scopeType?: OperationalOrbScopeType
  childId?: string
  homeId?: string
}

const CHILD_ID_RE = /\/young-people\/([^/]+)/
const HOME_ID_RE = /\/homes\/([^/]+)/

function childIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(CHILD_ID_RE)
  return match?.[1]
}

function homeIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(HOME_ID_RE)
  return match?.[1]
}

export function idsFromPathname(pathname: string): { childId?: string; homeId?: string } {
  return { childId: childIdFromPath(pathname), homeId: homeIdFromPath(pathname) }
}

/** Pages that embed their own ORB right rail in page layout. Child story/workspace no longer does this. */
export function hasPageEmbeddedOrbRail(pathname: string): boolean {
  if (/\/homes\/[^/]+\/workspace\/?$/.test(pathname)) return true
  return false
}

/** Recording editor: live coach is the only ORB surface. */
export function isRecordingEditorPath(pathname: string): boolean {
  return isRecordingEditorPathStrict(pathname)
}

export function isRecordingEditorPathStrict(pathname: string): boolean {
  if (/^\/young-people\/[^/]+\/(new|upload)\/?$/.test(pathname)) return true
  if (/^\/young-people\/[^/]+\/records\/new\/?$/.test(pathname)) return true
  return pathname === '/record'
}

/** Routes where the app-shell right rail is the primary ORB (no page-embedded rail). */
export function isShellOrbRailRoute(pathname: string): boolean {
  if (isRecordingEditorPathStrict(pathname)) return false
  if (hasPageEmbeddedOrbRail(pathname)) return false
  if (pathname === '/orb' || pathname.startsWith('/orb/')) return false
  if (pathname.startsWith('/assistant/orb')) return false
  if (/\/young-people\/[^/]+\/archive\/?$/.test(pathname)) return false
  if (/\/young-people\/[^/]+\/plan-impacts\/?$/.test(pathname)) return false
  if (/\/young-people\/[^/]+\/lifeecho\/?$/.test(pathname)) return false
  if (pathname === '/life_echo' || pathname.startsWith('/life_echo/')) return false
  if (pathname === '/chronology' || pathname.startsWith('/chronology/')) return false
  if (/\/young-people\/[^/]+\/chronology/.test(pathname)) return false
  if (pathname === '/handover' || pathname.startsWith('/handover/')) return false
  if (pathname === '/intelligence/inspection evidence preparation' || pathname.startsWith('/intelligence/inspection evidence preparation/')) return true
  if (pathname === '/intelligence/reg45' || pathname.startsWith('/intelligence/reg45/')) return true
  if (pathname === '/intelligence/sccif' || pathname.startsWith('/intelligence/sccif/')) return true
  if (pathname === '/record/reviews' || pathname.startsWith('/record/reviews/')) return true
  if (pathname === '/record/alerts' || pathname.startsWith('/record/alerts/')) return true
  return false
}

export function resolveOperationalOrbScopeType(pathname: string): OperationalOrbScopeType {
  if (hasPageEmbeddedOrbRail(pathname)) return pathname.includes('/homes/') ? 'home' : 'child'
  if (isRecordingEditorPathStrict(pathname)) return 'record'
  if (/\/young-people\/[^/]+\/archive\/?$/.test(pathname)) return 'archive'
  if (/\/young-people\/[^/]+\/plan-impacts\/?$/.test(pathname)) return 'plan_impacts'
  if (/\/young-people\/[^/]+\/lifeecho\/?$/.test(pathname) || pathname.startsWith('/life_echo')) return 'lifeecho'
  if (pathname.startsWith('/chronology') || /\/chronology/.test(pathname)) return 'chronology'
  if (pathname.startsWith('/handover')) return 'handover'
  if (pathname.startsWith('/intelligence/inspection evidence preparation')) return 'inspection'
  if (pathname.startsWith('/intelligence/reg45')) return 'reg45'
  if (pathname.startsWith('/intelligence/sccif')) return 'sccif'
  if (pathname.startsWith('/record/reviews')) return 'review'
  if (pathname.startsWith('/record/alerts')) return 'review'
  if (pathname.includes('/homes/')) return 'home'
  if (childIdFromPath(pathname)) return 'child'
  return 'generic'
}

export function shouldShowOrbRail(pathname: string, scope?: OrbPresenceScope): boolean {
  void scope
  if (isRecordingEditorPathStrict(pathname)) return false
  if (hasPageEmbeddedOrbRail(pathname)) return true
  if (isShellOrbRailRoute(pathname)) return true
  return false
}

export function shouldShowFloatingOrb(pathname: string, scope?: OrbPresenceScope): boolean {
  void scope
  if (pathname === '/orb' || pathname.startsWith('/orb/')) return false
  if (pathname === '/assistant/orb' || pathname.startsWith('/assistant/orb/')) return false
  if (pathname === '/select-scope' || pathname.startsWith('/select-scope/')) return false
  if (pathname === '/login' || pathname.startsWith('/login/')) return false
  if (isRecordingEditorPathStrict(pathname)) return false
  if (shouldShowOrbRail(pathname, scope)) return false
  return true
}

export function shouldShowInlineOrbCard(pathname: string, scope?: OrbPresenceScope): boolean {
  void scope
  if (isRecordingEditorPathStrict(pathname)) return false
  if (hasPageEmbeddedOrbRail(pathname)) return false
  if (shouldShowOrbRail(pathname, scope)) return false
  return true
}

export function shouldShowShellContextualOrbPanel(pathname: string): boolean { return isShellOrbRailRoute(pathname) }

export type OperationalOrbPrompt = { label: string; href: string }

export function operationalOrbLabel(scopeType: OperationalOrbScopeType, names?: { childName?: string; homeName?: string }): string {
  const child = names?.childName?.trim()
  const home = names?.homeName?.trim()
  switch (scopeType) {
    case 'child': return child ? `Ask ORB about ${child}` : 'Ask ORB about this child'
    case 'home': return home ? `Ask ORB about ${home}` : 'Ask ORB about this home'
    case 'record': return 'ORB live recording coach'
    case 'review': return 'ORB review support'
    case 'archive': return 'ORB archive support'
    case 'chronology': return 'ORB chronology support'
    case 'lifeecho': return 'ORB life story support'
    case 'plan_impacts': return 'ORB plan impact support'
    case 'handover': return 'ORB handover support'
    case 'inspection': return 'ORB Inspection evidence preparation support'
    case 'reg45': return 'ORB Reg 45 support'
    case 'sccif': return 'ORB SCCIF support'
    default: return 'Ask ORB about this workspace'
  }
}

export function operationalOrbPrivacyText(scopeType: OperationalOrbScopeType): string {
  switch (scopeType) {
    case 'child':
    case 'archive':
    case 'chronology':
    case 'lifeecho':
    case 'plan_impacts':
      return 'Summary-level child context available. ORB supports judgement; it does not replace adults.'
    case 'home':
    case 'handover':
      return 'Summary-level home context available. Safeguarding and management decisions remain with adults.'
    case 'record':
      return 'Live recording coach. Draft text stays in the editor and must be reviewed by the adult.'
    case 'inspection':
    case 'reg45':
    case 'sccif':
      return 'Evidence summaries only. Statutory judgement remains with managers and leaders.'
    case 'review':
      return 'Review metadata only. Open records for full detail where permitted.'
    default:
      return 'Permissioned workspace context from your session and selections.'
  }
}

function assistantHref(params: { scope?: string; youngPersonId?: string; homeId?: string; mode?: string; q?: string }) {
  const q = new URLSearchParams()
  if (params.scope) q.set('scope', params.scope)
  if (params.youngPersonId) q.set('young_person_id', params.youngPersonId)
  if (params.homeId) q.set('home_id', params.homeId)
  if (params.mode) q.set('mode', params.mode)
  if (params.q) q.set('q', params.q)
  const qs = q.toString()
  return qs ? `/assistant/orb?${qs}` : '/assistant/orb'
}

export function operationalOrbOpenHref(scopeType: OperationalOrbScopeType, ids?: { childId?: string; homeId?: string }, mode?: string) {
  const childId = ids?.childId
  const homeId = ids?.homeId
  if (scopeType === 'child' || childId) return assistantHref({ scope: 'child', youngPersonId: childId, mode })
  if (scopeType === 'home' || homeId) return assistantHref({ scope: 'home', homeId, mode })
  if (scopeType === 'inspection' || scopeType === 'reg45' || scopeType === 'sccif') return assistantHref({ scope: 'inspection', homeId, mode })
  return assistantHref({ mode })
}

export function operationalOrbPrompts(scopeType: OperationalOrbScopeType, ids?: { childId?: string; homeId?: string }, mode?: string): OperationalOrbPrompt[] {
  void mode
  const childId = ids?.childId
  const homeId = ids?.homeId
  switch (scopeType) {
    case 'child': return [
      { label: 'What does this mean for the child?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'child_journey_summary', q: 'What does this mean for the child?' }) },
      { label: 'What has changed?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'child_journey_summary', q: 'What has changed for this child?' }) },
      { label: 'What is missing?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'record_quality_review', q: 'What is missing from this child record or plan picture?' }) },
      { label: 'What needs adult action?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'action_priority', q: 'What needs adult action now?' }) }
    ]
    case 'home': return [
      { label: 'What needs attention today?', href: assistantHref({ scope: 'home', homeId, mode: 'manager_daily_brief', q: 'What needs attention in this home today?' }) },
      { label: 'What evidence gaps are visible?', href: assistantHref({ scope: 'home', homeId, mode: 'ofsted_evidence_review', q: 'What inspection evidence gaps are visible?' }) },
      { label: 'What recording reviews need attention?', href: assistantHref({ scope: 'home', homeId, mode: 'record_quality_review', q: 'What recording reviews need attention?' }) },
      { label: 'What safeguarding themes need review?', href: assistantHref({ scope: 'home', homeId, mode: 'safeguarding_themes' }) }
    ]
    default: return [
      { label: 'What does this mean?', href: assistantHref({ scope: childId ? 'child' : homeId ? 'home' : undefined, youngPersonId: childId, homeId, q: 'What does this mean and what needs doing?' }) },
      { label: 'What is missing?', href: assistantHref({ scope: childId ? 'child' : homeId ? 'home' : undefined, youngPersonId: childId, homeId, q: 'What is missing?' }) }
    ]
  }
}
