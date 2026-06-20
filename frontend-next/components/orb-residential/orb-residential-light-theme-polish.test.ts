import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function extractRule(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${escaped}\\s*\\{[^}]+\\}`, 's'))?.[0]
}

describe('ORB Residential light theme polish', () => {
  it('mobile composer dock light mode must not use dark midnight gradient', () => {
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    const lightDock =
      extractRule(mobileCss, '.orb-chat-layout--residential.orb-theme-light .orb-composer-dock') ??
      extractRule(mobileCss, "html[data-orb-residential='1'] .orb-chat-layout--residential.orb-theme-light .orb-composer-dock")
    assert.ok(lightDock, 'expected light composer dock rule')
    assert.doesNotMatch(lightDock!, /#05070d/)
    assert.doesNotMatch(lightDock!, /rgba\(5,\s*7,\s*13/)
    assert.match(lightDock!, /#f8fbff|var\(--orb-page-bg/)
  })

  it('mobile light composer glass uses white glass not dark shadow stack', () => {
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    const lightGlass =
      extractRule(mobileCss, '.orb-chat-layout--residential.orb-theme-light .orb-composer-glass') ??
      extractRule(mobileCss, "html[data-orb-residential='1'] .orb-chat-layout--residential.orb-theme-light .orb-composer-glass")
    assert.ok(lightGlass, 'expected light composer glass rule')
    assert.match(lightGlass!, /rgba\(255,\s*255,\s*255,\s*0\.86\)/)
    assert.doesNotMatch(lightGlass!, /0\.38\)/)
  })

  it('desktop residential dark shell rules are scoped to orb-theme-dark', () => {
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    assert.match(desktop, /\.orb-chat-layout--residential\.orb-theme-dark/)
    assert.doesNotMatch(
      desktop,
      /\/\* ORB Residential — dark theme shell\/layout \*\/\n\.orb-chat-layout--residential,\n/
    )
  })

  it('premium tokens do not force white assistant text in light mode', () => {
    const premium = read('app/orb/_legacy-ui-archive/orb-premium-tokens.css')
    const lightAssistant =
      extractRule(premium, 'html[data-orb-residential=\'1\'] .orb-chat-layout--residential.orb-theme-light .orb-message-assistant .orb-message-content') ??
      extractRule(premium, 'html[data-orb-residential=\'1\'] .orb-theme-light .orb-message-assistant .orb-message-content')
    assert.ok(lightAssistant, 'expected light assistant message rule')
    assert.match(lightAssistant!, /#0f172a|var\(--orb-foreground/)
    assert.doesNotMatch(lightAssistant!, /#f7faff/)
  })

  it('billing inactive status uses semantic info tokens not pale amber text', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /data-orb-billing-inactive/)
    assert.match(billing, /--orb-res-info-text/)
    assert.doesNotMatch(billing, /text-amber-100/)
    assert.doesNotMatch(billing, /text-amber-300/)
  })

  it('account local content banner uses semantic info tokens', () => {
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    assert.match(account, /data-orb-account-local-mode/)
    assert.match(account, /--orb-res-info-bg/)
    assert.match(account, /--orb-res-info-text/)
    assert.doesNotMatch(account, /text-amber-100/)
  })

  it('mobile residential light workspace no longer ships dark lock', () => {
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.doesNotMatch(mobileCss, /launch dark lock/i)
    assert.match(
      mobileCss,
      /\.orb-chat-layout--residential\.orb-theme-light \.orb-main-workspace[\s\S]*#f7fbff/
    )
  })
})
