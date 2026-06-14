import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  dictateMobilePrimaryButton,
  dictateMobileStatusLine
} from '../../lib/orb/dictate/orb-dictate-mobile-copy.ts'
import { mapRecordingUiToDictateState } from '../../lib/orb/dictate/orb-dictate-state.ts'
import {
  orbVoiceStartProgressLine,
  orbVoiceUiStatusLine,
  resolveOrbVoiceStartProgressStage
} from '../../lib/orb/voice/orb-voice-ui-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB composer plus menu and instant capture pass', () => {
  it('plus button has type button, data marker, and stops pointer propagation', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /type="button"/)
    assert.match(composer, /data-orb-composer-plus-button/)
    assert.match(composer, /aria-label="Add attachment"/)
    assert.match(composer, /onPointerDown=\{handlePlusPointerDown\}/)
    assert.match(composer, /event\.stopPropagation\(\)/)
    assert.match(composer, /toggleAttachmentMenu/)
  })

  it('tapping plus opens data-orb-composer-attachment-menu without focusing composer via touchEnd', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(composer, /data-orb-composer-attachment-menu/)
    assert.match(tools, /data-orb-composer-attachment-menu/)
    assert.match(composer, /setToolsSheetOpen/)
    assert.doesNotMatch(composer, /onTouchEnd=\{focusComposerInput\}/)
    assert.match(composer, /\[data-orb-composer-plus-button\]/)
  })

  it('menu contains Camera, Photos, Files before ORB tools', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const uploadIndex = tools.indexOf('data-orb-composer-upload-actions')
    const orbIndex = tools.indexOf('data-orb-composer-orb-tools-section')
    assert.ok(uploadIndex >= 0 && orbIndex > uploadIndex)
    assert.match(tools, /label: 'Camera'/)
    assert.match(tools, /label: 'Photos'/)
    assert.match(tools, /label: 'Files'/)
    assert.doesNotMatch(tools, /Photo Library/)
    assert.doesNotMatch(tools, /Take Photo/)
    assert.doesNotMatch(tools, /Choose Files/)
  })

  it('Camera, Photos, Files wire to existing hidden inputs', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /take_photo|photo_library|choose_files/)
    assert.match(composer, /cameraInputRef\.current\?\.click\(\)/)
    assert.match(composer, /photoLibraryInputRef\.current\?\.click\(\)/)
    assert.match(composer, /documentFileInputRef\.current\?\.click\(\)/)
    assert.match(composer, /capture="environment"/)
  })

  it('menu closes before file picker and on outside tap', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(tools, /onClose\(\)\s*\n\s*onSelect/)
    assert.match(composer, /setToolsSheetOpen\(false\)/)
    assert.match(composer, /data-orb-composer-attach-backdrop/)
    assert.match(composer, /setToolsSheetOpen\(false\)/)
  })

  it('desktop plus menu remains OrbComposerPlusMenu', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /OrbResidentialComposerToolsSheet/)
    assert.match(composer, /OrbComposerPlusMenu/)
    assert.match(composer, /mobileViewport \?/)
  })

  it('dictate start shows immediate non-idle status and avoids ambiguous Starting copy', () => {
    const mobile = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.doesNotMatch(mobile, /captureStarting \? 'Starting…'/)
    assert.match(dictate, /Preparing microphone…/)
    assert.match(dictate, /dictateStartInFlightRef/)
    assert.match(dictate, /markOrbInteractionLatency\('dictate_tap'\)/)
    const requesting = mapRecordingUiToDictateState({
      recordingUiState: 'starting',
      recordingPaused: false,
      generating: false,
      hasGeneratedOutput: false,
      hasTranscript: false
    })
    assert.equal(requesting, 'requesting_permission')
    assert.equal(
      dictateMobileStatusLine({
        dictateState: requesting,
        recordingUiState: 'starting',
        hasTranscript: false,
        speechError: null,
        userStatus: null,
        listening: false,
        permissionPending: true
      }),
      'Preparing microphone…'
    )
    assert.equal(
      dictateMobilePrimaryButton({
        dictateState: requesting,
        recordingUiState: 'starting',
        hasTranscript: false
      }),
      'Stop recording'
    )
  })

  it('dictate timer runs during starting and recording', () => {
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /captureStarting/)
    assert.match(dictate, /recordingActive, captureStarting, recordingPaused/)
  })

  it('voice start uses staged progress copy', () => {
    assert.equal(orbVoiceUiStatusLine('preparing'), 'Opening microphone…')
    assert.equal(orbVoiceStartProgressLine('connecting_orb'), 'Connecting ORB voice…')
    assert.equal(
      resolveOrbVoiceStartProgressStage({
        voiceCaptureState: 'requesting_permission',
        startStage: 'starting',
        transportLive: false,
        browserLaunch: false,
        listening: false
      }),
      'opening_mic'
    )
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /resolveOrbVoiceStartProgressStage/)
    assert.match(station, /orbVoiceStartProgressLine/)
    assert.match(station, /markOrbInteractionLatency\('voice_mic_permission_requested'\)/)
    assert.doesNotMatch(station, /'Preparing voice…'/)
  })

  it('latency instrumentation covers plus, dictate, and voice', () => {
    const latency = read('lib/orb/voice/latency.ts')
    assert.match(latency, /plus_tap/)
    assert.match(latency, /plus_menu_open/)
    assert.match(latency, /dictate_tap/)
    assert.match(latency, /dictate_stream_ready/)
    assert.match(latency, /voice_backend_connected/)
  })
})
