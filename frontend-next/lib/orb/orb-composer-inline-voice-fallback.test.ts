import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY,
  ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE,
  canUseComposerSpeechInput,
  getComposerSpeechFallbackCopy,
  orbComposerSpeechFallbackMessage
} from './orb-composer-inline-voice-fallback.ts'

describe('orb-composer-inline-voice-fallback', () => {
  it('exports required fallback copy', () => {
    assert.equal(
      ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY,
      'Speech input is not available in this browser. You can use Dictate or type instead.'
    )
    assert.equal(ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE, ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY)
    assert.equal(getComposerSpeechFallbackCopy(), ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY)
  })

  it('canUseComposerSpeechInput reflects browser support in Node (false)', () => {
    assert.equal(canUseComposerSpeechInput(), false)
  })

  it('orbComposerSpeechFallbackMessage returns safe copy without error', () => {
    assert.equal(orbComposerSpeechFallbackMessage(null), ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY)
    assert.equal(
      orbComposerSpeechFallbackMessage('Speech recognition not supported'),
      ORB_COMPOSER_INLINE_VOICE_FALLBACK_COPY
    )
  })
})
