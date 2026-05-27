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
    assert.match(source, /Explore/)
    assert.match(source, /Previous 7 days/)
    assert.match(source, /Previous 30 days/)
    assert.doesNotMatch(source, /label="Apps"/)
    assert.doesNotMatch(source, /Saved outputs/)
    assert.doesNotMatch(source, /Knowledge library/)
  })

  it('care companion applies light theme markers by default', () => {
    const source = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(source, /data-orb-theme=\{resolvedTheme\}/)
    assert.match(source, /data-orb-light-ui-build/)
    assert.match(source, /useOrbAppearance/)
    assert.match(source, /personalisedEmptyHeading/)
    assert.match(source, /OrbUserMessageBubble/)
    assert.match(source, /editMessageId/)
    assert.match(source, /OrbHelpPanel/)
    assert.match(source, /OrbVoiceSettingsPanel/)
  })

  it('orb layout bootstraps light theme on html before hydration', () => {
    const layout = readComponent('app/orb/layout.tsx')
    assert.match(layout, /ORB_APPEARANCE_BOOTSTRAP_SCRIPT/)
    assert.match(layout, /orb-appearance-bootstrap/)
    assert.match(layout, /orb-chatgpt-light\.css/)
    assert.match(layout, /data-orb-light-ui-build/)
    assert.match(layout, /__ORB_LIGHT_UI_BUILD__/)
  })

  it('globals and route CSS ship ChatGPT-light build marker and hue pulse classes', () => {
    const globals = readComponent('app/globals.css')
    const routeCss = readComponent('app/orb/orb-chatgpt-light.css')
    assert.match(globals, /orb-chatgpt-light-build-marker-1338/)
    assert.match(routeCss, /orb-chatgpt-light-build-marker-1338/)
    assert.match(globals, /orb-hue-response-pulse|orb-response-active/)
    assert.match(routeCss, /orb-composer-answering|orb-assistant-thinking-mark/)
    assert.match(routeCss, /orb-hue-text|orb-theme-light|html\[data-orb-theme=light\]/)
    assert.match(globals, /#009dff[\s\S]*#00b8ff[\s\S]*#38bdf8/)
  })

  it('citation chips use readable light-mode styling', () => {
    const citation = readComponent('components/orb-standalone/orb-inline-citation.tsx')
    const routeCss = readComponent('app/orb/orb-chatgpt-light.css')
    assert.match(citation, /orb-citation-chip-light/)
    assert.match(routeCss, /#0284c7/)
    assert.match(routeCss, /#075985/)
    assert.match(routeCss, /font-weight:\s*700/)
    assert.match(routeCss, /orb-action-chip/)
  })

  it('empty state hides composer suggestion chips (no duplicate prompt rows)', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /suggestions=\{showEmptyState \? undefined : suggestionsForMode\(mode\)\}/)
    assert.match(companion, /data-orb-starter-cards/)
    assert.doesNotMatch(companion, /OrbSmartSuggestions/)
  })

  it('header does not duplicate full sidebar controls', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /data-orb-header-tools/)
    assert.doesNotMatch(companion, /data-orb-header-settings/)
    assert.match(companion, /data-orb-header-privacy/)
    assert.match(companion, /data-orb-header-profile/)
  })

  it('composer keeps send handler and Ask anything placeholder path', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-testid="orb-standalone-send-clickable"/)
    assert.match(composer, /placeholderForMode/)
    assert.match(composer, /type="submit"/)
    assert.match(composer, /orb-composer-answering/)
  })

  it('response pulse ties to answering state on layout', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /orb-response-active/)
    assert.match(companion, /answering=\{isAnswering\}/)
  })

  it('hue branding components exist', () => {
    const hue = readComponent('components/orb-standalone/orb-hue-logo.tsx')
    assert.match(hue, /orb-hue-text/)
    assert.match(hue, /orb-electric-text/)
    assert.match(hue, /orb-hue-response-pulse/)
    assert.match(hue, /Powered by IndiCare/)
  })

  it('does not auto-enable microphone in care companion', () => {
    const source = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(source, /getUserMedia\(\)/)
    assert.match(source, /STANDALONE_ORB_VOICE_CAPTURE_ENABLED/)
  })

  it('help panel contains safeguarding boundary text', () => {
    const help = readComponent('components/orb-standalone/orb-help-panel.tsx')
    assert.match(help, /Using ORB/)
    assert.match(help, /does not access live child, staff or home records/)
    assert.match(help, /immediate risk/)
  })

  it('settings panel has voice and personalisation sections', () => {
    const settings = readComponent('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /data-orb-settings-section=\{section\.id\}/)
    assert.match(settings, /id: 'voice'/)
    assert.match(settings, /id: 'personalisation'/)
    assert.match(settings, /Memory \/ Personalisation/)
  })

  it('voice settings support auto-speak and british female preference', () => {
    const voice = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(voice, /pickBritishFemaleVoice/)
    assert.match(voice, /speechRate/)
    assert.match(panel, /data-orb-voice-auto-speak/)
    assert.match(panel, /Test voice/)
  })

  it('response action bar includes regenerate and copy', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /Regenerate/)
    assert.match(assistant, /data-orb-response-actions/)
    assert.match(assistant, /Copy/)
  })

  it('user message edit flow markers exist', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-message-edit-button/)
    assert.match(companion, /Save & submit/)
    assert.match(companion, /data-orb-edit-save/)
  })
})
