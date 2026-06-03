import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential mobile UX', () => {
  it('mobile action buttons use aria-label and visually hidden labels', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(assistant, /aria-label=\{label\}/)
    assert.match(assistant, /orb-action-chip__label/)
    assert.match(mobileCss, /\.orb-action-chip__label/)
  })

  it('lens summary defaults collapsed with ORB lenses used toggle', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /data-orb-lenses-used/)
    assert.match(assistant, /data-orb-lenses-collapsed/)
    assert.match(assistant, /ORB lenses used/)
    assert.match(assistant, /data-orb-lenses-toggle/)
  })

  it('residential sidebar exposes rename pin archive and delete via chat menu', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const menu = readComponent('components/orb-standalone/orb-sidebar-chat-menu.tsx')
    assert.match(sidebar, /OrbSidebarChatList/)
    assert.match(sidebar, /onWorkspaceChange/)
    assert.match(sidebar, /renameChat/)
    assert.match(menu, /Rename/)
    assert.match(menu, /Pin/)
    assert.match(menu, /Archive/)
    assert.match(menu, /Delete/)
    assert.match(menu, /data-orb-sidebar-chat-menu/)
  })

  it('composer and layout use locked mobile viewport classes', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(companion, /h-\[100dvh\]/)
    assert.match(companion, /overflow-hidden/)
    assert.match(mobileCss, /overflow:\s*hidden/)
    assert.match(mobileCss, /\.orb-composer-glass/)
    assert.match(mobileCss, /safe-area-inset-bottom/)
  })

  it('mobile empty state uses compact GlassOrbMark not oversized hero', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const mark = readComponent('components/orb-residential/ui/glass-orb-mark.tsx')
    const premiumCss = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(companion, /GlassOrbMark size="(empty|home)"/)
    assert.match(companion, /data-orb-residential-empty/)
    assert.match(mark, /OrbPresence/)
    assert.match(premiumCss, /orb-presence--home/)
    assert.doesNotMatch(companion, /size="hero"/)
  })

  it('settings selected item uses dark glass styling not bright white block', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const premiumCss = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(settings, /orb-settings-nav-item--active/)
    assert.match(settings, /data-orb-settings-nav-active/)
    assert.doesNotMatch(settings, /bg-\[#EAF6FF\]/)
    assert.match(premiumCss, /\.orb-settings-nav-item--active/)
  })

  it('stations show friendly auth error and polished empty states', () => {
    const states = readComponent('components/orb-standalone/orb-station-panel-states.tsx')
    const saved = readComponent('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const knowledge = readComponent('components/orb-standalone/orb-knowledge-library.tsx')
    assert.match(states, /Reconnect to continue/)
    assert.match(states, /data-orb-station-sign-in-again/)
    assert.match(saved, /No saved outputs yet/)
    assert.match(saved, /Save from chat answers, Dictate, Documents/)
    assert.match(knowledge, /OrbKnowledgeBuiltinPanel/)
    assert.match(knowledge, /data-orb-knowledge-connected-empty/)
  })

  it('sidebar station links remain on residential sidebar', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    for (const station of ['skills', 'review', 'templates', 'knowledge', 'documents', 'orb_voice', 'orb_dictate', 'saved']) {
      assert.match(sidebar, new RegExp(`id: '${station}'`))
    }
    assert.match(sidebar, /label: 'Library'/)
    assert.match(sidebar, /GlassOrbMark/)
    assert.match(sidebar, /data-orb-sidebar-stations/)
    assert.match(sidebar, /ORB_RESIDENTIAL_TAGLINE/)
  })

  it('mobile sidebar quick nav lists Dictate Voice Documents Saved Outputs Projects Recent chats', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /useOrbMobileViewport/)
    assert.match(sidebar, /data-orb-sidebar-mobile-quick-nav/)
    assert.match(sidebar, /data-orb-sidebar-magic-notes/)
    assert.match(sidebar, /data-orb-sidebar-recent-chats-shortcut/)
    for (const label of ['Dictate', 'Voice', 'Documents', 'Saved Outputs', 'Projects', 'Recent chats', 'Search']) {
      assert.match(sidebar, new RegExp(label))
    }
  })

  it('mobile ChatGPT shell header menu account empty starters and composer', () => {
    const layout = readComponent('components/orb/orb-layout.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    const copy = readComponent('lib/orb/orb-residential-copy.ts')
    const mobileCss = readComponent('app/orb/orb-mobile.css')

    assert.match(layout, /OrbMobileChatHeader/)
    assert.match(layout, /data-orb-mobile-header/)
    assert.match(layout, /data-orb-mobile-menu/)
    assert.match(layout, /data-orb-mobile-account/)
    assert.match(companion, /OrbMobileChatHeader/)
    assert.match(companion, /mobileHeader=/)
    assert.match(copy, /ORB_RESIDENTIAL_MOBILE_EMPTY_HEADING/)
    assert.match(copy, /What do you need help with\?/)
    for (const starter of [
      'Write a daily log',
      'Turn rough notes into a record',
      'Review an incident',
      'Ask a safeguarding question'
    ]) {
      assert.match(copy, new RegExp(starter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
    assert.match(composer, /data-orb-composer-voice/)
    assert.match(composer, /data-orb-standalone-composer/)
    assert.match(mobileCss, /orb-mobile-chat-header/)
    assert.match(mobileCss, /safe-area-inset-bottom/)
    assert.doesNotMatch(companion, /OsSidebar|operational-orb-page/)
  })

  it('profile panel uses collapsible grouped sections and status chips', () => {
    const profile = readComponent('components/orb-standalone/orb-adult-profile-drawer.tsx')
    assert.match(profile, /data-orb-profile-section-nav/)
    assert.match(profile, /ProfileSection/)
    assert.match(profile, /id="personalisation"/)
    assert.match(profile, /id="security"/)
    assert.match(profile, /isDirty/)
    assert.match(profile, /data-orb-profile-status-chips/)
    assert.match(profile, /data-orb-profile-section-card/)
  })

  it('orb residential experience does not mount OS sidebar', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    const page = readComponent('app/orb/page.tsx')
    assert.match(shell, /OrbCareCompanion residentialSurface/)
    assert.doesNotMatch(shell, /OsSidebar|os-sidebar/)
    assert.doesNotMatch(page, /OsSidebar/)
  })

  it('passkey and auth button copy matches product wording', () => {
    const login = readComponent('components/orb-residential/orb-login-screen.tsx')
    const profile = readComponent('components/orb-standalone/orb-adult-profile-drawer.tsx')
    assert.match(login, /Use Face ID, Touch ID or device passkey/)
    assert.match(login, /data-orb-passkey-unavailable/)
    assert.match(login, /Use authenticator app instead/)
    assert.match(profile, /Use Face ID, Touch ID or device passkey/)
    const auth = readComponent('components/orb-residential/ui/orb-auth-button.tsx')
    assert.match(auth, /OrbAuthProviderIcon/)
    assert.match(auth, /MicrosoftIcon/)
    assert.match(auth, /GoogleIcon/)
  })

  it('suggested replies use horizontal scroll row on mobile', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(assistant, /orb-suggested-replies-row/)
    assert.match(mobileCss, /\.orb-suggested-replies-row/)
  })

  it('premium design tokens and CSS layer are wired', () => {
    const layout = readComponent('app/orb/layout.tsx')
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(layout, /orb-premium-tokens\.css/)
    assert.match(theme, /ORB_ROYAL_BLUE/)
    assert.match(theme, /getOrbThemeCssVariables/)
    assert.match(theme, /#05070D|#05070d|#f7fbff/)
    assert.match(theme, /ORB_RESIDENTIAL_DEFAULT_THEME/)
    assert.match(theme, /#168bff/i)
  })

  it('PremiumMobileOrb delegates to OrbPresence (single living sphere)', () => {
    const orb = readComponent('components/orb-residential/ui/premium-mobile-orb.tsx')
    const premiumCss = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(orb, /OrbPresence/)
    assert.doesNotMatch(orb, /premium-mobile-orb__glow/)
    assert.doesNotMatch(orb, /premium-mobile-orb__core/)
    assert.match(premiumCss, /\.orb-presence/)
  })

  it('residential experience uses single theme root with light default', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const premiumCss = readComponent('app/orb/orb-premium-tokens.css')
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(shell, /data-orb-residential/)
    assert.match(theme, /ORB_RESIDENTIAL_DEFAULT_THEME[\s\S]*'light'/)
    assert.match(shell, /ORB_SHELL_ROOT_CLASS/)
    assert.match(shell, /getOrbThemeCssVariables\(resolvedTheme\)/)
    assert.match(shell, /data-orb-residential="true"/)
    assert.match(shell, /useOrbResidentialThemeSync/)
    assert.match(companion, /orb-chat-layout--residential/)
    assert.doesNotMatch(companion, /orb-chat-layout--residential orb-residential-root/)
    assert.match(companion, /const effectiveTheme = resolvedTheme/)
    assert.match(premiumCss, /html\[data-orb-residential='1'\]/)
    assert.match(premiumCss, /--orb-res-bg/)
  })

  it('markdown answer headings use theme foreground not near-black on dark', () => {
    const markdown = readComponent('components/orb-standalone/orb-markdown-answer.tsx')
    const premiumCss = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(markdown, /text-\[var\(--orb-foreground/)
    assert.match(premiumCss, /\.orb-markdown-answer h2/)
    assert.match(premiumCss, /#f7faff/)
  })

  it('station panels use friendly auth error not raw red main UI', () => {
    const saved = readComponent('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const knowledge = readComponent('components/orb-standalone/orb-knowledge-library.tsx')
    assert.match(saved, /OrbStationAuthError/)
    assert.match(saved, /isOrbStationAuthError/)
    assert.match(knowledge, /OrbStationAuthError/)
    assert.doesNotMatch(saved, /text-red-600.*Authentication/)
    assert.doesNotMatch(knowledge, /text-red-600.*Authentication/)
  })

  it('safety modal exposes failed save state for retry', () => {
    const modal = readComponent('components/orb-residential/orb-safety-modal.tsx')
    assert.match(modal, /data-orb-safety-save-error/)
    assert.match(modal, /Could not save\. Try again\./)
    assert.match(modal, /setSubmitting\(false\)/)
  })

  it('mobile sidebar stays on dark theme classes', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const premiumCss = readComponent('app/orb/orb-premium-tokens.css')
    assert.match(mobileCss, /\.orb-chat-sidebar/)
    assert.match(mobileCss, /#070b14/)
    assert.match(premiumCss, /html\[data-orb-residential='1'\]/)
    assert.match(premiumCss, /\.orb-chat-sidebar/)
  })
})
