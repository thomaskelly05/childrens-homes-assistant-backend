export type OrbBrainSource = 'chat' | 'voice' | 'dictate' | 'write'

export type OrbBrainRoute =
  | 'general_assistant'
  | 'residential_specialist'
  | 'live_lookup'
  | 'document_workspace'

export type OrbBrainToolExtension = 'weather' | 'web_search' | 'sports' | 'local' | null

export type OrbBrainRouteDecision = {
  route: OrbBrainRoute
  reason: string
  toolExtension: OrbBrainToolExtension
}

export type AskOrbBrainContext = {
  source?: OrbBrainSource
  mode?: string
  locationHint?: string | null
}

const RESIDENTIAL_TERMS = [
  "children's home",
  'childrens home',
  'residential',
  'young person',
  'looked after',
  'care home',
  'ofsted',
  'sccif',
  'quality standard',
  'reg 44',
  'reg44',
  'reg 45',
  'reg45',
  'regulation',
  'lado',
  'allegation',
  'safeguarding',
  'missing from care',
  'restraint',
  'keywork',
  'daily note',
  'placement',
  'care plan',
  'risk assessment',
  'staff supervision',
  'manager review',
  'child voice',
  'therapeutic',
  'trauma',
  'pace',
  'co-regulation',
  'behaviour as communication',
  'exploitation',
  'handover',
  'chronology',
  'regulation 44',
  'regulation 45'
] as const

const LIVE_LOCAL_TERMS = [
  'weather',
  'forecast',
  'headline',
  'headlines',
  'news',
  'sport',
  'sports',
  'score',
  'scores',
  'fixture',
  'fixtures',
  'cinema',
  'what is on',
  "what's on",
  'nearby',
  'near me',
  'latest',
  'today',
  'current',
  'right now',
  'whitley bay',
  'newcastle'
] as const

const DOCUMENT_WORKSPACE_TERMS = [
  'dictate',
  'voice note',
  'record this',
  'daily note',
  'daily record',
  'incident record',
  'handover note',
  'draft a letter',
  'draft document',
  'orb write',
  'write a report'
] as const

function normaliseMessage(message: string): string {
  return message.trim().toLowerCase()
}

function includesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term))
}

function resolveLiveToolExtension(text: string): OrbBrainToolExtension {
  if (text.includes('weather') || text.includes('forecast')) return 'weather'
  if (text.includes('score') || text.includes('sport') || text.includes('fixture')) return 'sports'
  if (
    text.includes('nearby') ||
    text.includes('near me') ||
    text.includes('cinema') ||
    text.includes('what is on') ||
    text.includes("what's on") ||
    text.includes('whitley bay') ||
    text.includes('newcastle')
  ) {
    return 'local'
  }
  return 'web_search'
}

/** Client-side brain routing mirror for UI metadata and tests. */
export function routeOrbBrainIntent(
  message: string,
  mode = 'Ask ORB',
  context?: AskOrbBrainContext
): OrbBrainRouteDecision {
  const text = normaliseMessage(message)
  const resolvedMode = (mode || 'Ask ORB').trim()

  if (includesAny(text, DOCUMENT_WORKSPACE_TERMS)) {
    return {
      route: 'document_workspace',
      reason: 'Spoken notes or drafting tasks route to Dictate, ORB Write, or ORB Chat workspaces.',
      toolExtension: null
    }
  }

  if (includesAny(text, LIVE_LOCAL_TERMS)) {
    return {
      route: 'live_lookup',
      reason: 'Current or location-specific facts need a live lookup tool when connected.',
      toolExtension: resolveLiveToolExtension(text)
    }
  }

  if (resolvedMode === 'General Knowledge') {
    return {
      route: 'general_assistant',
      reason: 'General Knowledge mode uses the broad assistant brain.',
      toolExtension: null
    }
  }

  if (resolvedMode !== 'Ask ORB' && resolvedMode.length > 0) {
    return {
      route: 'residential_specialist',
      reason: `Residential specialist mode selected: ${resolvedMode}.`,
      toolExtension: null
    }
  }

  if (includesAny(text, RESIDENTIAL_TERMS)) {
    return {
      route: 'residential_specialist',
      reason: "Question relates to residential children's homes practice.",
      toolExtension: null
    }
  }

  if (context?.locationHint && includesAny(text, ['here', 'local', 'around'])) {
    return {
      route: 'live_lookup',
      reason: 'Location context suggests a live or local lookup when tools are available.',
      toolExtension: 'local'
    }
  }

  return {
    route: 'general_assistant',
    reason: 'Everyday assistant question — answer like ChatGPT without forcing a care-home lens.',
    toolExtension: null
  }
}
