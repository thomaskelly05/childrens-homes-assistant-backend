import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE,
  orbComposerSpeechFallbackMessage
} from '../../lib/orb/orb-composer-inline-voice-fallback.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Liquid Glass final polish pass', () => {
  it('composer has no shield icon and keeps plus + speech actions', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.doesNotMatch(composer, /OrbResidentialPrivacyGuidanceIcon/)
    assert.doesNotMatch(composer, /data-orb-privacy-guidance-trigger/)
    assert.match(composer, /data-orb-composer-plus-button/)
    assert.match(composer, /data-orb-composer-voice-send/)
    assert.match(composer, /orb-liquid-composer/)
    assert.match(composer, /handleVoiceActivate/)
    assert.match(composer, /onPointerUp=\{handleVoiceActivate\}/)
  })

  it('plus menu still opens from composer trigger', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(composer, /OrbResidentialComposerToolsSheet/)
    assert.match(composer, /handlePlusActivate/)
    assert.match(tools, /data-orb-composer-attachment-menu/)
    assert.match(tools, /orb-liquid-panel/)
    assert.match(tools, /label: 'Camera'/)
    assert.match(tools, /label: 'Photos'/)
    assert.match(tools, /label: 'Files'/)
  })

  it('speech button wires inline voice or dictate fallback', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(companion, /handleComposerInlineVoice/)
    assert.match(companion, /beginUserVoiceCapture/)
    assert.match(companion, /ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE/)
    assert.match(companion, /onOpenDictateFallback/)
    assert.match(companion, /inlineVoiceShowDictateFallback/)
    assert.match(composer, /data-orb-composer-open-dictate-fallback/)
    assert.equal(
      orbComposerSpeechFallbackMessage(null),
      ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE
    )
  })

  it('settings panel has single scroll container and liquid glass classes', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const layout = read('app/orb/orb-premium-layout-pass.css')
    const mobile = read('app/orb/orb-mobile.css')
    const desktop = read('app/orb/orb-desktop.css')
    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(settings, /orb-settings-scroll/)
    assert.match(settings, /overflow-y-auto/)
    assert.match(settings, /orb-liquid-panel/)
    assert.match(settings, /orb-liquid-list-row/)
    assert.match(layout, /\[data-orb-app-panel-name='settings'\] \.orb-panel-body/)
    assert.match(mobile, /\[data-orb-settings-scroll\]/)
    assert.match(desktop, /\[data-orb-settings-scroll\]/)
  })

  it('appearance segmented control remains selectable with liquid toolbar', () => {
    const appearance = read('components/orb-standalone/orb-appearance-control.tsx')
    const liquid = read('app/orb/orb-liquid-glass.css')
    assert.match(appearance, /data-orb-appearance-option/)
    assert.match(appearance, /orb-liquid-toolbar/)
    assert.match(appearance, /min-h-\[2\.75rem\]/)
    assert.match(liquid, /--orb-glass-bg/)
    assert.match(liquid, /\.orb-liquid-glass/)
    assert.match(liquid, /\.orb-liquid-composer/)
  })

  it('privacy detail sheet scrolls independently with safe-area padding', () => {
    const sheet = read('components/orb-residential/orb-privacy-detail-sheet.tsx')
    assert.match(sheet, /overflow-y-auto/)
    assert.match(sheet, /safe-area-inset-bottom/)
    assert.match(sheet, /orb-liquid-panel/)
    assert.match(sheet, /data-orb-privacy-detail-back/)
  })

  it('ORB presence uses shared liquid orb treatment', () => {
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    const mark = read('components/orb-residential/ui/glass-orb-mark.tsx')
    const liquid = read('app/orb/orb-liquid-glass.css')
    assert.match(presence, /orb-liquid-orb/)
    assert.match(mark, /OrbPresence/)
    assert.match(liquid, /--orb-liquid-orb-glow/)
    assert.match(liquid, /\.orb-liquid-orb/)
  })

  it('privacy framework remains in settings not composer shield', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const privacy = read('components/orb-residential/orb-privacy-data-settings-section.tsx')
    assert.match(settings, /Privacy & data/)
    assert.match(settings, /OrbPrivacyDataSettingsSection/)
    assert.match(privacy, /data-orb-privacy-data-intro/)
  })
})
