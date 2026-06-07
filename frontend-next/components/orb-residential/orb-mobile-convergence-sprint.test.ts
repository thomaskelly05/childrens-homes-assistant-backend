import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile convergence sprint', () => {
  it('home brand line uses IndiCare Intelligence', () => {
    const copy = read('lib/orb/orb-residential-copy.ts')
    assert.match(copy, /ORB_RESIDENTIAL_BRAND_EMOTIONAL_LINE = 'IndiCare Intelligence'/)
  })

  it('chat scroll resets on conversation switch', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const scroll = read('lib/orb/orb-scroll.ts')
    assert.match(scroll, /resetOrbChatScrollPosition/)
    assert.match(companion, /resetOrbChatScrollPosition/)
    assert.match(companion, /workspace\.activeChatId/)
  })

  it('composer exposes dictate and voice quick actions above input', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-orb-composer-quick-actions/)
    assert.match(composer, /data-orb-composer-quick-dictate/)
    assert.match(composer, /data-orb-composer-quick-voice/)
    assert.match(composer, /Ask ORB anything/)
  })

  it('dictate mobile prioritises start recording over orb visual', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const statusIdx = dictate.indexOf('data-orb-dictate-status-line')
    const actionIdx = dictate.indexOf('data-orb-dictate-primary-action')
    const orbIdx = dictate.indexOf('data-orb-dictate-orb-accent')
    assert.ok(statusIdx > -1 && actionIdx > statusIdx && orbIdx > actionIdx)
    assert.match(dictate, /orb-dictate-mobile-orb/)
  })

  it('orb write uses mobile bottom sheet toolbar under 768px', () => {
    const editor = read('components/orb-write/orb-write-editor.tsx')
    const toolbar = read('components/orb-write/orb-write-mobile-toolbar.tsx')
    assert.match(editor, /OrbWriteMobileToolbar/)
    assert.match(editor, /useOrbResponsiveMode/)
    assert.match(toolbar, /data-orb-write-mobile-toolbar/)
    assert.match(toolbar, /data-orb-write-ask-orb-fab/)
    for (const tab of ['format', 'insert', 'review', 'more']) {
      assert.match(toolbar, new RegExp(`id: '${tab}'`))
      assert.match(toolbar, /data-orb-write-mobile-tab=\{item\.id\}/)
    }
  })

  it('recording library uses five primary filter chips', () => {
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    assert.match(templates, /RECORDING_LIBRARY_FILTERS/)
    for (const label of ['All', 'Popular', 'Safeguarding', 'Recording', 'Inspection', 'Management']) {
      assert.match(templates, new RegExp(label))
    }
    assert.match(templates, /hideCategoryChips/)
  })

  it('settings reorganised into residential sections', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    for (const label of [
      'Appearance',
      'Recording Preferences',
      'Writing Preferences',
      'Safety & Privacy',
      'Account & Billing',
      'About ORB'
    ]) {
      assert.match(settings, new RegExp(label))
    }
    assert.match(settings, /'safety_privacy'/)
    assert.match(settings, /'account_billing'/)
  })

  it('sprint documentation exists', () => {
    const doc = readFileSync(join(root, '../docs/orb-mobile-convergence-sprint.md'), 'utf8')
    assert.match(doc, /IndiCare Intelligence/)
    assert.match(doc, /390×844/)
  })
})
