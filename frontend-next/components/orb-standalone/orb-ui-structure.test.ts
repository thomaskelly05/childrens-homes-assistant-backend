import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB ChatGPT UI structure', () => {
  it('sidebar exposes ChatGPT-style navigation items', () => {
    const source = readComponent('components/orb-standalone/orb-standalone-sidebar.tsx')
    for (const label of ['New chat', 'Search chats', 'Library', 'Agents', 'Deep research', 'Tools']) {
      assert.match(source, new RegExp(label))
    }
  })

  it('care companion applies light theme markers by default', () => {
    const source = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(source, /data-orb-theme=\{resolvedTheme\}/)
    assert.match(source, /useOrbAppearance/)
    assert.match(source, /How can I help\?/)
  })

  it('composer keeps send handler and Ask anything placeholder path', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-testid="orb-standalone-send-clickable"/)
    assert.match(composer, /placeholderForMode/)
    assert.match(composer, /type="submit"/)
  })

  it('hue branding components exist', () => {
    const hue = readComponent('components/orb-standalone/orb-hue-logo.tsx')
    assert.match(hue, /orb-hue-text/)
    assert.match(hue, /orb-electric-text/)
    assert.match(hue, /Powered by IndiCare/)
  })

  it('does not auto-enable microphone in care companion', () => {
    const source = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(source, /getUserMedia\(\)/)
    assert.match(source, /STANDALONE_ORB_VOICE_CAPTURE_ENABLED/)
  })
})
