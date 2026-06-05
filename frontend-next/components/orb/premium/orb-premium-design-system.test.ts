import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_PREMIUM_ACTION_LABELS } from './orb-premium-theme.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB premium design system components', () => {
  it('exports shared action labels', () => {
    assert.equal(ORB_PREMIUM_ACTION_LABELS.analyseWithOrb, 'Analyse with ORB')
    assert.equal(ORB_PREMIUM_ACTION_LABELS.continueInChat, 'Continue in chat')
    assert.equal(ORB_PREMIUM_ACTION_LABELS.startInDictate, 'Start in Dictate')
    assert.equal(ORB_PREMIUM_ACTION_LABELS.openInOrbWrite, 'Open in ORB Write')
  })

  it('premium barrel exports core layout primitives', () => {
    const index = read('components/orb/premium/index.ts')
    assert.match(index, /OrbPremiumPage/)
    assert.match(index, /OrbPremiumButton/)
    assert.match(index, /OrbPremiumEmptyState/)
    assert.match(index, /OrbPremiumTabs/)
    assert.match(index, /OrbPremiumDocumentCard/)
  })

  it('OrbPremiumPage marks panel surfaces for tests', () => {
    const page = read('components/orb/premium/orb-premium-page.tsx')
    assert.match(page, /data-orb-premium-page=\{panelId\}/)
    assert.match(page, /OrbPremiumAdvanced/)
  })

  it('OrbPremiumButton exposes variant data attribute', () => {
    const btn = read('components/orb/premium/orb-premium-button.tsx')
    assert.match(btn, /data-orb-premium-button=\{variant\}/)
  })

  it('advanced options use collapsed details by default', () => {
    const advanced = read('components/orb/premium/orb-premium-advanced.tsx')
    assert.match(advanced, /<details/)
    assert.doesNotMatch(advanced, /defaultOpen=\{true\}/)
  })
})
