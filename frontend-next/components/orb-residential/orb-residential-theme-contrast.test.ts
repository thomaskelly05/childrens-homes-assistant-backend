import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential theme contrast tokens', () => {
  it('orb-theme exports readable info and warning semantic surfaces for both modes', () => {
    const theme = read('lib/orb/orb-theme.ts')
    assert.match(theme, /ORB_RESIDENTIAL_SEMANTIC_SURFACES/)
    assert.match(theme, /infoBg:\s*'#eff6ff'/)
    assert.match(theme, /infoText:\s*'#1e3a8a'/)
    assert.match(theme, /warningText:\s*'#92400e'/)
    assert.match(theme, /--orb-res-info-bg/)
    assert.match(theme, /--orb-res-warning-text/)
  })

  it('dark premium composer and glass shadows remain on dark theme only', () => {
    const premium = read('app/orb/orb-premium-tokens.css')
    assert.match(premium, /\.orb-chat-layout--residential\.orb-theme-dark \.orb-composer-glass/)
    assert.match(premium, /\.orb-chat-layout--residential\.orb-theme-light \.orb-composer-glass/)
    assert.match(premium, /orb-theme-dark[\s\S]*orb-panel-overlay[\s\S]*rgba\(0,\s*0,\s*0/)
  })

  it('dark mode workspace panels keep premium dark card defaults', () => {
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(mobileCss, /orb-theme-dark[\s\S]*orb-main-workspace[\s\S]*#070b14|rgba\(8,\s*17,\s*31/)
    assert.match(mobileCss, /orb-theme-light[\s\S]*orb-main-workspace[\s\S]*#f7fbff|var\(--orb-mobile-ws-panel/)
  })

  it('light starter cards do not inherit unscoped dark residential text overrides', () => {
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(mobileCss, /orb-theme-light \[data-orb-starter-card\]/)
    assert.match(mobileCss, /orb-theme-dark \[data-orb-starter-card\]/)
  })
})
