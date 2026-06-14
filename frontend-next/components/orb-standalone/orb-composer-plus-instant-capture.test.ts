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
import { orbComposerInlineVoiceStatusLine } from '../../lib/orb/orb-composer-inline-voice-status.ts'
import { resolveComposerPrimaryAction } from '../../lib/orb/orb-composer-primary-action.ts'
import { orbDraftNoticeHasReadableContrast, ORB_DRAFT_NOTICE_CLASS } from '../../lib/orb/orb-draft-notice.ts'
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
    assert.match(composer, /onPointerUp=\{handlePlusActivate\}/)
    assert.match(composer, /event\.stopPropagation\(\)/)
    assert.match(composer, /handlePlusActivate/)
  })

  it('plus button sits outside input focus wrapper with explicit composer columns', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const focusGuard = read('lib/orb/orb-composer-focus-guard.ts')
    assert.match(composer, /data-orb-composer-row/)
    assert.match(composer, /data-orb-composer-input-column/)
    assert.match(composer, /data-orb-composer-action-rail/)
    assert.match(composer, /data-orb-composer-send-rail/)
    assert.match(composer, /shouldIgnoreComposerFocusTarget/)
    assert.doesNotMatch(composer, /onClick=\{focusComposerInput\}[\s\S]*data-orb-composer-card/)
    assert.match(focusGuard, /data-orb-composer-action-rail/)
    assert.match(focusGuard, /data-orb-composer-send-rail/)
  })

  it('attachment menu is portaled with fixed positioning above composer', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(tools, /createPortal/)
    assert.match(tools, /data-orb-composer-attachment-menu/)
    assert.match(tools, /fixed z-\[68\]/)
    assert.match(tools, /anchorRef/)
  })

  it('draft notice uses readable contrast tokens', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const notice = read('lib/orb/orb-draft-notice.ts')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(companion, /ORB_DRAFT_NOTICE_CLASS/)
    assert.match(companion, /data-orb-draft-notice/)
    assert.doesNotMatch(companion, /text-amber-50.*draftNotice|draftNotice[\s\S]*text-amber-50/)
    assert.equal(orbDraftNoticeHasReadableContrast(ORB_DRAFT_NOTICE_CLASS), true)
    assert.match(mobileCss, /\[data-orb-draft-notice\]/)
  })

  it('mobile composer voice-send toggles between voice, stop, and send', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(composer, /resolveComposerPrimaryAction/)
    assert.match(composer, /data-orb-composer-voice-send/)
    assert.match(composer, /composerInlineVoiceEnabled/)
    assert.match(composer, /onComposerPrimaryAction/)
    assert.match(companion, /handleComposerInlineVoice/)
    assert.match(companion, /beginUserVoiceCapture/)
    assert.match(companion, /openOrbVoicePanel/)
    assert.equal(resolveComposerPrimaryAction({ voiceListening: false, canSend: false }), 'voice')
    assert.equal(resolveComposerPrimaryAction({ voiceListening: false, canSend: true }), 'send')
    assert.equal(resolveComposerPrimaryAction({ voiceListening: true, canSend: false }), 'stop')
  })

  it('inline composer voice status covers listening and permission states', () => {
    assert.equal(
      orbComposerInlineVoiceStatusLine({
        listening: false,
        speaking: false,
        pending: false,
        phase: 'idle',
        voiceCaptureState: 'requesting_permission',
        micNotice: null,
        voiceCaptureEnabled: true
      }),
      'Allow microphone access…'
    )
    assert.equal(
      orbComposerInlineVoiceStatusLine({
        listening: true,
        speaking: false,
        pending: false,
        phase: 'listening',
        voiceCaptureState: 'ready',
        micNotice: null,
        voiceCaptureEnabled: true
      }),
      'Listening…'
    )
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
    assert.match(composer, /setAttachmentMenuOpen\(false\)/)
    assert.match(tools, /data-orb-composer-attach-backdrop/)
    assert.match(composer, /shouldDismissComposerAttachmentMenu/)
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
