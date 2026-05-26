/**
 * Unified operational ORB presence — one surface per page.
 * Standalone /orb is separate; operational OS uses /assistant/orb only.
 */

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

/** Pages that embed their own right-column OperationalOrbRail in page layout. */
export function hasPageEmbeddedOrbRail(pathname: string): boolean {
  if (/\/young-people\/[^/]+\/workspace\/?$/.test(pathname)) return true
  if (/\/homes\/[^/]+\/workspace\/?$/.test(pathname)) return true
  return false
}

/** Recording editor: live coach is the only ORB surface. */
export function isRecordingEditorPath(pathname: string): boolean {
  return isRecordingEditorPathStrict(pathname)
}

export function isRecordingEditorPathStrict(pathname: string): boolean {
  if (/^\/young-people\/[^/]+\/(new|upload)\/?$/.test(pathname)) return true
  return pathname === '/record'
}

/** Routes where the app-shell right rail is the primary ORB (no page-embedded rail). */
export function isShellOrbRailRoute(pathname: string): boolean {
  if (isRecordingEditorPathStrict(pathname)) return false
  if (hasPageEmbeddedOrbRail(pathname)) return false
  if (pathname === '/orb' || pathname.startsWith('/orb/')) return false
  if (pathname.startsWith('/assistant/orb')) return false

  if (/\/young-people\/[^/]+\/archive\/?$/.test(pathname)) return true
  if (/\/young-people\/[^/]+\/plan-impacts\/?$/.test(pathname)) return true
  if (/\/young-people\/[^/]+\/lifeecho\/?$/.test(pathname)) return true
  if (pathname === '/life_echo' || pathname.startsWith('/life_echo/')) return true
  if (pathname === '/chronology' || pathname.startsWith('/chronology/')) return true
  if (/\/young-people\/[^/]+\/chronology/.test(pathname)) return true
  if (pathname === '/handover' || pathname.startsWith('/handover/')) return true
  if (pathname === '/intelligence/inspection-readiness' || pathname.startsWith('/intelligence/inspection-readiness/')) return true
  if (pathname === '/intelligence/reg45' || pathname.startsWith('/intelligence/reg45/')) return true
  if (pathname === '/intelligence/sccif' || pathname.startsWith('/intelligence/sccif/')) return true
  if (pathname === '/record/reviews' || pathname.startsWith('/record/reviews/')) return true
  if (pathname === '/record/alerts' || pathname.startsWith('/record/alerts/')) return true

  return false
}

export function resolveOperationalOrbScopeType(pathname: string): OperationalOrbScopeType {
  if (hasPageEmbeddedOrbRail(pathname)) {
    return pathname.includes('/homes/') ? 'home' : 'child'
  }
  if (isRecordingEditorPathStrict(pathname)) return 'record'
  if (/\/young-people\/[^/]+\/archive\/?$/.test(pathname)) return 'archive'
  if (/\/young-people\/[^/]+\/plan-impacts\/?$/.test(pathname)) return 'plan_impacts'
  if (/\/young-people\/[^/]+\/lifeecho\/?$/.test(pathname) || pathname.startsWith('/life_echo')) return 'lifeecho'
  if (pathname.startsWith('/chronology') || /\/chronology/.test(pathname)) return 'chronology'
  if (pathname.startsWith('/handover')) return 'handover'
  if (pathname.startsWith('/intelligence/inspection-readiness')) return 'inspection'
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
  if (isRecordingEditorPathStrict(pathname)) return false
  if (shouldShowOrbRail(pathname, scope)) return false
  return true
}

export function shouldShowInlineOrbCard(pathname: string, scope?: OrbPresenceScope): boolean {
  void scope
  if (isRecordingEditorPathStrict(pathname)) return false
  if (shouldShowOrbRail(pathname, scope)) return false
  return true
}

export function shouldShowShellContextualOrbPanel(pathname: string): boolean {
  return isShellOrbRailRoute(pathname)
}

export type OperationalOrbPrompt = { label: string; href: string }

export function operationalOrbLabel(scopeType: OperationalOrbScopeType, names?: { childName?: string; homeName?: string }): string {
  const child = names?.childName?.trim()
  const home = names?.homeName?.trim()
  switch (scopeType) {
    case 'child':
      return child ? `Connected to ${child}'s workspace` : 'Connected to this child workspace'
    case 'home':
      return home ? `Connected to ${home}` : 'Connected to this home workspace'
    case 'record':
      return 'ORB live recording coach'
    case 'review':
      return 'Connected to recording review'
    case 'archive':
      return 'Connected to child archive'
    case 'chronology':
      return 'Connected to chronology'
    case 'lifeecho':
      return 'Connected to LifeEcho'
    case 'plan_impacts':
      return 'Connected to plan impacts'
    case 'handover':
      return 'Connected to handover'
    case 'inspection':
      return 'Connected to inspection readiness'
    case 'reg45':
      return 'Connected to Reg 45 review'
    case 'sccif':
      return 'Connected to SCCIF alignment'
    default:
      return 'Connected to this workspace'
  }
}

export function operationalOrbPrivacyText(scopeType: OperationalOrbScopeType): string {
  switch (scopeType) {
    case 'child':
    case 'archive':
    case 'chronology':
    case 'lifeecho':
    case 'plan_impacts':
      return 'Summary-level child context available — no draft bodies or narratives in URLs.'
    case 'home':
    case 'handover':
      return 'Summary-level home context available — no safeguarding narratives or HR content in URLs.'
    case 'record':
      return 'Recording coach uses live editor signals only — draft text is never placed in URLs.'
    case 'inspection':
    case 'reg45':
    case 'sccif':
      return 'Evidence summaries only — statutory judgement remains with managers.'
    case 'review':
      return 'Review metadata only — open records for full detail where permitted.'
    default:
      return 'Permissioned workspace context — scope from your session and selections.'
  }
}

function assistantHref(params: {
  scope?: string
  youngPersonId?: string
  homeId?: string
  mode?: string
  q?: string
}) {
  const q = new URLSearchParams()
  if (params.scope) q.set('scope', params.scope)
  if (params.youngPersonId) q.set('young_person_id', params.youngPersonId)
  if (params.homeId) q.set('home_id', params.homeId)
  if (params.mode) q.set('mode', params.mode)
  if (params.q) q.set('q', params.q)
  const qs = q.toString()
  return qs ? `/assistant/orb?${qs}` : '/assistant/orb'
}

export function operationalOrbPrompts(
  scopeType: OperationalOrbScopeType,
  ids?: { childId?: string; homeId?: string },
  mode?: string
): OperationalOrbPrompt[] {
  void mode
  const childId = ids?.childId
  const homeId = ids?.homeId

  switch (scopeType) {
    case 'child':
      return [
        { label: 'What should I check before recording?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'record_quality_review', q: 'What should I check before recording?' }) },
        { label: 'Help me write a daily note', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'record_quality_review', q: 'Help me write a daily note' }) },
        { label: 'What needs manager review?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'record_quality_review', q: 'What needs manager review?' }) },
        { label: "Summarise this child's archive themes", href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'archive_summary' }) },
        { label: "Help review this child's chronology story", href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'chronology_story_review' }) }
      ]
    case 'home':
      return [
        { label: 'What needs attention in this home today?', href: assistantHref({ scope: 'home', homeId, mode: 'manager_daily_brief', q: 'What needs attention in this home today?' }) },
        { label: 'Summarise manager daily brief', href: assistantHref({ scope: 'home', homeId, mode: 'manager_daily_brief' }) },
        { label: 'What recording reviews need attention?', href: assistantHref({ scope: 'home', homeId, mode: 'record_quality_review', q: 'What recording reviews need attention?' }) },
        { label: 'What safeguarding network themes need review?', href: assistantHref({ scope: 'home', homeId, mode: 'safeguarding_themes' }) },
        { label: 'What inspection evidence gaps are visible?', href: assistantHref({ scope: 'home', homeId, mode: 'ofsted_evidence_review', q: 'What inspection evidence gaps are visible?' }) }
      ]
    case 'archive':
      return [
        { label: 'Summarise archive themes for this child', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'archive_summary' }) },
        { label: 'What child story themes stand out?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'child_journey_summary', q: 'What child story themes stand out in the archive?' }) }
      ]
    case 'chronology':
      return [
        { label: 'Help review this chronology story', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'chronology_story_review' }) },
        { label: 'What gaps need manager attention?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'chronology_story_review', q: 'What chronology gaps need manager attention?' }) }
      ]
    case 'lifeecho':
      return [
        { label: 'LifeEcho memory support', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'lifeecho_memory_support' }) },
        { label: 'What memories could be added safely?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'lifeecho_memory_support', q: 'What memories could be added safely?' }) }
      ]
    case 'plan_impacts':
      return [
        { label: 'Review plan impact suggestions', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'plan_impact_review' }) },
        { label: 'What plan updates need sign-off?', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'plan_impact_review', q: 'What plan updates need sign-off?' }) }
      ]
    case 'handover':
      return [
        { label: 'Handover reflection', href: assistantHref({ scope: childId ? 'child' : homeId ? 'home' : undefined, youngPersonId: childId, homeId, mode: 'manager_daily_brief', q: 'Help me review this handover for clarity.' }) },
        { label: 'What should carry into next shift?', href: assistantHref({ scope: homeId ? 'home' : 'child', youngPersonId: childId, homeId, mode: 'action_priority', q: 'What should be carried into the next shift?' }) }
      ]
    case 'review':
      return [
        { label: 'Sign-off readiness', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'record_quality_review', q: 'What needs sign-off readiness review?' }) },
        { label: 'Plan impact themes', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'plan_impact_review' }) },
        { label: 'Safeguarding themes', href: assistantHref({ scope: 'child', youngPersonId: childId, mode: 'safeguarding_themes' }) }
      ]
    case 'inspection':
    case 'reg45':
    case 'sccif':
      return [
        { label: 'Evidence gap review', href: assistantHref({ scope: 'inspection', mode: 'ofsted_evidence_review', q: 'What evidence gaps need manager review?' }) },
        { label: 'Prepare inspection questions', href: assistantHref({ scope: 'inspection', mode: 'ofsted_evidence_review', q: 'Help prepare inspection evidence questions.' }) }
      ]
    default:
      return [
        { label: 'What should I focus on today?', href: assistantHref({ mode: 'general_operational_question', q: 'What should I focus on today?' }) },
        { label: 'Manager daily brief', href: assistantHref({ mode: 'manager_daily_brief' }) }
      ]
  }
}

export function operationalOrbOpenHref(
  scopeType: OperationalOrbScopeType,
  ids?: { childId?: string; homeId?: string },
  mode?: string
): string {
  const scope =
    scopeType === 'home' || scopeType === 'handover'
      ? 'home'
      : scopeType === 'child' ||
          scopeType === 'archive' ||
          scopeType === 'chronology' ||
          scopeType === 'lifeecho' ||
          scopeType === 'plan_impacts' ||
          scopeType === 'review'
        ? 'child'
        : scopeType === 'inspection' || scopeType === 'reg45' || scopeType === 'sccif'
          ? 'inspection'
          : undefined
  return assistantHref({
    scope,
    youngPersonId: ids?.childId,
    homeId: ids?.homeId,
    mode: mode || (scopeType === 'record' ? 'recording_live_coach' : 'record_quality_review')
  })
}

export function idsFromPathname(pathname: string): { childId?: string; homeId?: string } {
  return { childId: childIdFromPath(pathname), homeId: homeIdFromPath(pathname) }
}
