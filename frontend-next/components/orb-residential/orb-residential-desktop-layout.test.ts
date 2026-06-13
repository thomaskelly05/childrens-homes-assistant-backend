import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential desktop layout system', () => {
  it('desktop layout CSS is scoped to lg+ only and does not alter mobile breakpoints', () => {
    const desktop = read('app/orb/orb-desktop.css')
    const mobile = read('app/orb/orb-mobile.css')
    const premium = read('app/orb/orb-premium-tokens.css')

    assert.match(desktop, /ORB Residential — desktop layout system \(lg\+ only/)
    assert.match(desktop, /@media \(min-width: 1024px\)[\s\S]*--orb-desktop-page-max:\s*75rem/)
    assert.match(desktop, /--orb-desktop-settings-max:\s*65rem/)
    assert.match(desktop, /--orb-desktop-hero-starter-max:\s*47\.5rem/)

    assert.doesNotMatch(mobile, /--orb-desktop-page-max/)
    assert.doesNotMatch(premium, /@media \(max-width: 1023px\)[\s\S]*--orb-desktop-/)

    const mobileMaxRules = mobile.match(/@media \(max-width: 1023px\)/g) ?? []
    assert.ok(mobileMaxRules.length >= 1, 'mobile layer still uses max-width 1023px guard')
  })

  it('desktop home hero uses centred layout tokens and overlap-safe spacing', () => {
    const desktop = read('app/orb/orb-desktop.css')
    const premium = read('app/orb/orb-premium-tokens.css')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')

    assert.match(desktop, /\[data-orb-residential-empty\][\s\S]*\[data-orb-empty-heading-desktop\]/)
    assert.match(desktop, /\[data-orb-empty-starter-chips\][\s\S]*grid-template-columns:\s*repeat\(2/)
    assert.match(premium, /@media \(min-width: 1024px\)[\s\S]*html\[data-orb-residential='1'\] \.orb-presence--hero/)
    assert.match(premium, /clamp\(11\.25rem,\s*18vw,\s*17\.5rem\)/)
    assert.match(companion, /GlassOrbMark/)
    assert.match(companion, /data-orb-empty-heading-desktop/)
    assert.doesNotMatch(companion, /orb-brand\.png|orb-static\.png/)
  })

  it('desktop settings content is constrained and segmented controls capped', () => {
    const desktop = read('app/orb/orb-desktop.css')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')

    assert.match(desktop, /\[data-orb-settings-panel\][\s\S]*max-width:\s*var\(--orb-desktop-settings-max\)/)
    assert.match(desktop, /\.orb-appearance-segmented[\s\S]*max-width:\s*var\(--orb-desktop-segmented-max\)/)
    assert.match(desktop, /\[data-orb-workspace-panel='settings'\][\s\S]*orb-mobile-workspace-footer/)
    assert.match(settings, /data-orb-settings-panel/)
    assert.match(settings, /OrbAppearanceControl/)
  })

  it('desktop saved outputs uses lg split layout without md two-column bleed', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const desktop = read('app/orb/orb-desktop.css')

    assert.match(saved, /lg:flex-row/)
    assert.doesNotMatch(saved, /md:flex-row/)
    assert.match(saved, /data-orb-saved-output-detail-empty/)
    assert.match(desktop, /\[data-orb-saved-outputs-panel\][\s\S]*--orb-desktop-saved-list-width/)
    assert.match(desktop, /\[data-orb-saved-output-detail-empty\][\s\S]*justify-content:\s*center/)
  })

  it('desktop Documents and Shift Builder share max-width container', () => {
    const desktop = read('app/orb/orb-desktop.css')
    const documents = read('components/orb-standalone/orb-document-panel.tsx')
    const premiumPage = read('components/orb/premium/orb-premium-page.tsx')
    const shift = read('components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx')

    assert.match(desktop, /\[data-orb-document-panel\],[\s\S]*\[data-orb-shift-builder-panel\][\s\S]*--orb-desktop-page-max/)
    assert.match(premiumPage, /data-orb-document-panel/)
    assert.match(documents, /Documents & Guidance/)
    assert.match(shift, /title="Shift Builder"/)
    assert.match(shift, /data-orb-shift-builder-result/)
  })

  it('desktop practice workspace panels are registered in core workspace list', () => {
    const core = read('components/orb-standalone/orb-core-workspace-panels.ts')
    const practice = read('components/orb-standalone/orb-practice-panels.tsx')

    assert.match(core, /inspection_readiness/)
    assert.match(core, /safeguarding_thinking/)
    assert.match(core, /record_properly/)
    assert.match(practice, /data-orb-inspection-readiness-panel/)
    assert.match(practice, /data-orb-safeguarding-thinking-panel/)
    assert.match(practice, /data-orb-record-properly-panel/)
  })

  it('template categories map internal ids to human-readable labels', () => {
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    const fallback = read('lib/orb/orb-templates-fallback.ts')
    assert.match(templates, /TEMPLATE_CATEGORY_LABELS/)
    assert.match(templates, /care_planning: 'Care planning'/)
    assert.match(templates, /learning_academy: 'Learning'/)
    assert.match(fallback, /'Care Planning'/)
    assert.doesNotMatch(fallback, /care_planning|learning_academy/)
  })

  it('desktop Dictate uses deliberate studio workspace layout', () => {
    const desktop = read('app/orb/orb-desktop.css')
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    const workspace = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')

    assert.match(dictate, /data-orb-dictate-layout=\{[\s\S]*desktop-runtime/)
    assert.match(dictate, /data-orb-desktop-branch="active"/)
    assert.match(workspace, /OrbDictateStudioWorkspace|OrbTranscriptPanel/)
    assert.match(desktop, /\[data-orb-dictate-station\]/)
  })

  it('light and dark theme classes remain the layout authority', () => {
    const desktop = read('app/orb/orb-desktop.css')
    const theme = read('lib/orb/orb-theme.ts')

    assert.match(desktop, /\.orb-chat-layout--residential\.orb-theme-dark/)
    assert.match(desktop, /\.orb-chat-layout--residential\.orb-theme-light/)
    assert.match(theme, /ORB_RESIDENTIAL_DEFAULT_THEME/)
    assert.match(theme, /getOrbThemeCssVariables/)
  })

  it('OrbPresence remains canonical and desktop layout audit helper is registered', () => {
    const audit = read('components/orb-standalone/orb-ui-audit.ts')
    const presence = read('components/orb-residential/ui/orb-presence.tsx')

    assert.match(audit, /runOrbDesktopLayoutAudit/)
    assert.match(audit, /ORB_DESKTOP_LAYOUT_AUDIT/)
    assert.match(audit, /staticOrbImageCount/)
    assert.match(audit, /visibleLivingSphereCount/)
    assert.match(audit, /composerVisibleOnHomeChat/)
    assert.match(audit, /sidebarScrollContainerExists/)
    assert.match(audit, /accountFooterReachable/)
    assert.match(audit, /themeMismatchCount/)
    assert.match(audit, /hiddenFixedElementCount/)
    assert.match(audit, /bottomContentClippedCount/)
    assert.match(audit, /mainContentMaxWidthPx/)
    assert.match(audit, /settingsBillingAccountVisible/)
    assert.match(presence, /OrbSphere/)
    assert.doesNotMatch(presence, /orb-brand\.png|\.png/)
  })

  it('desktop layout tokens export shared max-width constants', () => {
    const theme = read('lib/orb/orb-theme.ts')

    assert.match(theme, /pageMax:\s*'75rem'/)
    assert.match(theme, /settingsMax:\s*'65rem'/)
    assert.match(theme, /heroStarterMax:\s*'47\.5rem'/)
    assert.match(theme, /savedListWidth:\s*'27\.5rem'/)
    assert.match(theme, /heroPresenceSize:\s*'clamp\(11\.25rem, 18vw, 17\.5rem\)'/)
    assert.match(theme, /sidebarWidth:\s*'17\.5rem'/)
  })
})
