import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5B Voice v2 Safari and Katherine hardening', () => {
  it('voice v2 Safari permission hardening remains in place', () => {
    assert.match(read('app/orb/layout.tsx'), /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('voice v2 catches NotAllowedError and exposes permission states', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const permissions = read('lib/orb/voice-v2/orb-voice-v2-permissions.ts')
    assert.match(permissions, /isNotAllowedError/)
    assert.match(hook, /isNotAllowedError/)
    assert.match(hook, /autoResumeBlocked/)
    assert.match(hook, /markAutoResumeBlocked/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-types.ts'), /auto_resume_blocked/)
  })

  it('auto-resume blocked shows Continue conversation without endless retry', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /if \(autoResumeBlockedRef\.current && !options\?\.fromUserGesture\)/)
    assert.match(hook, /continueConversation/)
    assert.match(station, /ORB_VOICE_V2_CONTINUE_CONVERSATION/)
    assert.match(station, /data-orb-voice-continue-conversation/)
  })

  it('type fallback remains after mic denial', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /handleMicFailure/)
    assert.match(hook, /setShowTypeFallback\(true\)/)
    assert.match(read('components/orb-standalone/orb-voice-station.tsx'), /data-orb-voice-type-fallback/)
  })

  it('audio playback blocked shows text-first copy', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED/)
    assert.match(hook, /audio_playback_blocked/)
  })

  it('Katherine status uses v2 backend status in settings', () => {
    const settings = read('components/orb-standalone/orb-voice-settings-panel.tsx')
    const permissions = read('lib/orb/voice-v2/orb-voice-v2-permissions.ts')
    assert.match(settings, /fetchOrbVoiceV2Status/)
    assert.match(settings, /resolveOrbVoiceV2KatherineStatusMessage/)
    assert.match(permissions, /Katherine ready/)
  })

  it('backend marks Katherine OpenAI fallback honestly', () => {
    const tts = read('../services/orb_voice_tts_service.py')
    const routes = read('../routers/orb_voice_v2_routes.py')
    assert.match(tts, /orb_voice_tts_katherine_blocked reason=provider_forced_openai/)
    assert.match(tts, /katherine_fallback/)
    assert.match(routes, /X-ORB-TTS-Fallback-Reason/)
  })

  it('voice v2 routes remain active and station avoids legacy imports', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/speak/)
    assert.match(station, /useOrbVoiceV2/)
    assert.doesNotMatch(station, /useStandaloneOrbVoice|useOrbWebVoiceEngine|OrbVoiceLaunchControls/)
  })
})
