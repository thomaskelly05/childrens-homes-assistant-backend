import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential ChatGPT parity', () => {
  it('billing modal renders subscription, usage and spending cap sections', () => {
    const billing = readComponent('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-modal/)
    assert.match(billing, /data-orb-billing-plan-card/)
    assert.match(billing, /data-orb-billing-status/)
    assert.match(billing, /data-orb-billing-usage/)
    assert.match(billing, /data-orb-billing-spending-cap/)
    assert.match(billing, /data-orb-billing-buy-more/)
    assert.match(billing, /OrbAppModal/)
  })

  it('templates modal uses fallback library when API empty', () => {
    const templates = readComponent('components/orb-standalone/orb-templates-panel.tsx')
    const fallback = readComponent('lib/orb/orb-templates-fallback.ts')
    assert.match(templates, /filterFallbackTemplates/)
    assert.match(fallback, /ORB_RESIDENTIAL_TEMPLATE_FALLBACK/)
    assert.match(fallback, /Safeguarding concern record/)
  })

  it('knowledge centre shows built-in resource categories if API empty', () => {
    const knowledge = readComponent('components/orb-standalone/orb-knowledge-library.tsx')
    const builtin = readComponent('lib/orb/orb-knowledge-builtin.ts')
    const panel = readComponent('components/orb-standalone/orb-knowledge-builtin-panel.tsx')
    assert.match(knowledge, /OrbKnowledgeBuiltinPanel/)
    assert.doesNotMatch(knowledge, /Guidance library coming soon/)
    assert.match(builtin, /ORB_KNOWLEDGE_BUILTIN_RESOURCES/)
    assert.match(panel, /data-orb-knowledge-builtin-cards/)
  })

  it('documents modal uses centred app modal on residential', () => {
    const documents = readComponent('components/orb-standalone/orb-document-panel.tsx')
    assert.match(documents, /orbStationShellProps\(residentialSurface/)
    assert.match(documents, /data-orb-document-panel/)
  })

  it('account modal opens from top-right header', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const account = readComponent('components/orb-standalone/orb-account-modal.tsx')
    assert.match(companion, /OrbAccountModal/)
    assert.match(companion, /openResidentialAccount/)
    assert.match(companion, /data-orb-header-profile/)
    assert.match(account, /data-orb-account-modal/)
  })

  it('settings hides internal language unless developer mode', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /isOrbDeveloperMode/)
    assert.match(settings, /data-orb-settings-developer-only/)
  })

  it('Ofsted answer uses residential-specific structure in backend sanitizer', () => {
    const py = readFileSync(join(root, '../tests/test_orb_professional_curiosity_depth.py'), 'utf8')
    assert.match(py, /test_general_ofsted_sanitize_strips_threshold_closer/)
    assert.match(py, /SCCIF|inspection readiness|evidence review/i)
  })

  it('raw p.map error is not user-facing in error boundary', () => {
    const boundary = readComponent('components/orb-residential/orb-residential-error-boundary.tsx')
    assert.match(boundary, /Something went wrong/)
    assert.doesNotMatch(boundary, /p\.map is not a function/)
    const safe = readComponent('lib/orb/orb-safe-array.ts')
    assert.match(safe, /Array\.isArray/)
  })

  it('main chat does not render white background under residential root', () => {
    const premium = readComponent('app/orb/orb-premium-tokens.css')
    const shell = readComponent('components/orb/orb-shell.tsx')
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(premium, /html\[data-orb-residential='1'\]/)
    assert.match(premium, /#05070d|#f7faff/)
    assert.match(shell, /#f7fbff|getOrbThemeCssVariables\(resolvedTheme\)/)
    assert.match(theme, /backgroundDeep/)
  })

  it('OrbPresence is the single orb component for residential marks', () => {
    const presence = readComponent('components/orb-residential/ui/orb-presence.tsx')
    const mark = readComponent('components/orb-residential/ui/glass-orb-mark.tsx')
    assert.match(presence, /OrbSphere/)
    assert.match(presence, /orb-presence--home/)
    assert.match(mark, /OrbPresence/)
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /GlassOrbMark size="(empty|home)"/)
    assert.match(companion, /ORB_RESIDENTIAL_BRAND_EMOTIONAL_LINE/)
  })

  it('station apps use OrbAppModal pattern not right drawer on residential', () => {
    const modal = readComponent('components/orb-standalone/orb-app-modal.tsx')
    const shell = readComponent('components/orb-standalone/orb-standalone-panel-shell.tsx')
    assert.match(modal, /OrbAppModal/)
    assert.match(modal, /appModal/)
    assert.match(readComponent('components/orb-standalone/orb-app-panel-shell.tsx'), /data-orb-app-modal/)
    assert.match(shell, /modalSize/)
    const templates = readComponent('components/orb-standalone/orb-templates-panel.tsx')
    assert.match(templates, /orbStationShellProps\(residentialSurface/)
  })

  it('sidebar collapse preference uses orb-sidebar-collapsed localStorage key', () => {
    const pref = readComponent('lib/orb/orb-sidebar-preference.ts')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const layout = readComponent('components/orb/orb-layout.tsx')
    assert.match(pref, /ORB_SIDEBAR_COLLAPSED_KEY = 'orb-sidebar-collapsed'/)
    assert.match(companion, /readOrbSidebarCollapsed/)
    assert.match(companion, /writeOrbSidebarCollapsed/)
    assert.match(companion, /toggleSidebarCollapsed/)
    assert.match(layout, /data-orb-sidebar-collapsed/)
  })

  it('residential projects seed and persist via orb-projects key', () => {
    const projects = readComponent('lib/orb/orb-residential-projects.ts')
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(projects, /ORB_PROJECTS_STORAGE_KEY = 'orb-projects'/)
    assert.match(projects, /My Home/)
    assert.match(projects, /ensureResidentialWorkspaceProjects/)
    assert.match(sidebar, /data-orb-sidebar-projects/)
    assert.match(sidebar, /data-orb-sidebar-new-project/)
  })

  it('composer compact mode without duplicated mode pill or in-dock footer on residential', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    const premium = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(composer, /residentialSurface/)
    assert.match(composer, /orb-composer-glass--compact/)
    assert.doesNotMatch(composer, /orb-residential-footer/)
    assert.match(premium, /orb-chat-shell/)
  })

  it('saved outputs modal has designed empty state', () => {
    const saved = readComponent('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(saved, /No saved outputs yet\./)
  })
})
