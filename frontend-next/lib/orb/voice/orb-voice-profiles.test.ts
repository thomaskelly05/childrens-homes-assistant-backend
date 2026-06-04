import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)))

function readVoiceProfilesSource() {
  return readFileSync(join(root, 'orb-voice-profiles.ts'), 'utf8')
}

describe('ORB voice profiles registry', () => {
  it('defaults to ORB British Female', () => {
    const src = readVoiceProfilesSource()
    assert.match(src, /DEFAULT_ORB_VOICE_PROFILE_ID = 'orb_british_female'/)
    assert.match(src, /id: 'orb_british_female'/)
    assert.match(src, /label: 'ORB British Female'/)
  })

  it('lists curated premium profiles', () => {
    const src = readVoiceProfilesSource()
    assert.match(src, /calm_female/)
    assert.match(src, /calm_male/)
    assert.match(src, /neutral_professional/)
    assert.match(src, /soft_supportive/)
    assert.match(src, /concise_shift/)
    assert.match(src, /ORB_VOICE_CURATED_PROFILE_IDS/)
  })

  it('retains legacy orb profiles for backward compatibility', () => {
    const src = readVoiceProfilesSource()
    assert.match(src, /orb_calm_professional/)
    assert.match(src, /orb_reflective/)
    assert.match(src, /system_fallback/)
  })

  it('maps profiles to OpenAI voice IDs', () => {
    const src = readVoiceProfilesSource()
    assert.match(src, /openaiVoice: 'coral'/)
    assert.match(src, /openaiVoice: 'onyx'/)
    assert.match(src, /resolveOpenAIVoice/)
  })

  it('migrates legacy preset IDs', () => {
    const src = readVoiceProfilesSource()
    assert.match(src, /orb_british_calm: 'orb_calm_professional'/)
  })

  it('mode defaults choose curated voice profiles', () => {
    const src = readVoiceProfilesSource()
    assert.match(src, /reflective_practice: 'soft_supportive'/)
    assert.match(src, /safeguarding_support: 'calm_male'/)
    assert.match(src, /defaultVoiceProfileForMode/)
  })

  it('resolveBrowserVoice uses keyword scoring', () => {
    const src = readVoiceProfilesSource()
    assert.match(src, /resolveBrowserVoice/)
    assert.match(src, /fallbackVoiceKeywords/)
  })
})
