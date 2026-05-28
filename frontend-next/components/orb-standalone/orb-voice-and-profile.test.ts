import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { pickBritishFemaleVoice } from './use-standalone-orb-voice.ts'
import {
  buildAdultProfilePromptBlock,
  personalisedEmptyHeading,
  roleBasedEmptyStarters,
  DEFAULT_ADULT_PROFILE
} from '../../lib/orb/adult-profile-store.ts'

function mockVoice(name: string, lang: string, uri?: string): SpeechSynthesisVoice {
  return {
    name,
    lang,
    voiceURI: uri ?? `${name}-${lang}`,
    default: false,
    localService: true
  } as SpeechSynthesisVoice
}

describe('pickBritishFemaleVoice', () => {
  it('prefers en-GB female voices over male', () => {
    const voices = [
      mockVoice('Google UK English Male', 'en-GB'),
      mockVoice('Google UK English Female', 'en-GB'),
      mockVoice('Microsoft David', 'en-US')
    ]
    const picked = pickBritishFemaleVoice(voices, true, null)
    assert.ok(picked)
    assert.match(picked!.name.toLowerCase(), /female/)
    assert.equal(picked!.lang.toLowerCase(), 'en-gb')
  })
})

describe('adult profile personalisation', () => {
  it('personalises empty state heading with first name', () => {
    const heading = personalisedEmptyHeading({ ...DEFAULT_ADULT_PROFILE, name: 'Tom Kelly' })
    assert.match(heading, /Tom/)
  })

  it('registered manager gets role-based starters', () => {
    const starters = roleBasedEmptyStarters({
      ...DEFAULT_ADULT_PROFILE,
      role: 'registered_manager',
      roleLabel: 'Registered Manager'
    })
    assert.ok(starters.some((s) => s.toLowerCase().includes('oversight')))
  })

  it('profile prompt block includes answer length and boundary framing', () => {
    const block = buildAdultProfilePromptBlock({
      ...DEFAULT_ADULT_PROFILE,
      name: 'Alex',
      preferredAnswerLength: 'brief',
      defaultLenses: { ofsted: true, safeguarding: true, recording: false }
    })
    assert.match(block, /does not access OS records/)
    assert.match(block, /Answer length/)
    assert.match(block, /Ofsted/)
  })
})
