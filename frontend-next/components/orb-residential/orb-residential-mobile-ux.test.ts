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

  it('residential sidebar exposes rename and delete via chat menu', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    const menu = readComponent('components/orb-standalone/orb-sidebar-chat-menu.tsx')
    assert.match(sidebar, /OrbSidebarChatList/)
    assert.match(sidebar, /onWorkspaceChange/)
    assert.match(sidebar, /renameChat/)
    assert.match(menu, /Rename/)
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
  })

  it('sidebar station links remain on residential sidebar', () => {
    const sidebar = readComponent('components/orb-residential/orb-residential-sidebar.tsx')
    for (const station of ['review', 'templates', 'learn', 'saved', 'ofsted', 'safeguarding']) {
      assert.match(sidebar, new RegExp(`data-orb-sidebar-station=\\{station\\.id\\}|data-orb-sidebar-station="${station}"|id: '${station}'`))
    }
    assert.match(sidebar, /data-orb-sidebar-stations/)
  })

  it('profile panel uses collapsible grouped sections', () => {
    const profile = readComponent('components/orb-standalone/orb-adult-profile-drawer.tsx')
    assert.match(profile, /data-orb-profile-section-nav/)
    assert.match(profile, /ProfileSection/)
    assert.match(profile, /id="personalisation"/)
    assert.match(profile, /id="security"/)
    assert.match(profile, /isDirty/)
  })

  it('orb residential experience does not mount OS sidebar', () => {
    const experience = readComponent('components/orb-residential/orb-residential-experience.tsx')
    const page = readComponent('app/orb/page.tsx')
    assert.match(experience, /OrbCareCompanion residentialSurface/)
    assert.doesNotMatch(experience, /OsSidebar|os-sidebar/)
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
})
