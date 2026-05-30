import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { pickBritishFemaleVoice } from './use-standalone-orb-voice.ts'
import {
  buildAdultProfilePromptBlock,
  personalisedEmptyHeading,
  personalisedWelcomeMessage,
  roleBasedEmptyStarters,
  DEFAULT_ADULT_PROFILE
} from '../../lib/orb/adult-profile-store.ts'
import { profileInitialsFromName } from '../../lib/orb/orb-profile-initials.ts'

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
  it('personalises empty state heading with calm ready copy', () => {
    const heading = personalisedEmptyHeading({ ...DEFAULT_ADULT_PROFILE, name: 'Tom Kelly' })
    assert.match(heading, /Ready when you are/i)
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

  it('welcome message stays calm for registered manager role', () => {
    const welcome = personalisedWelcomeMessage({
      ...DEFAULT_ADULT_PROFILE,
      name: 'Tom Kelly',
      role: 'registered_manager'
    })
    assert.match(welcome.heading, /Ready when you are/i)
    assert.equal(welcome.subline, '')
  })

  it('welcome message stays calm for NVQ assessor role', () => {
    const welcome = personalisedWelcomeMessage({
      ...DEFAULT_ADULT_PROFILE,
      role: 'nvq_assessor',
      roleLabel: 'NVQ assessor'
    })
    assert.match(welcome.heading, /Ready when you are/i)
    assert.equal(welcome.subline, '')
  })

  it('welcome message stays calm for support worker role', () => {
    const welcome = personalisedWelcomeMessage({
      ...DEFAULT_ADULT_PROFILE,
      role: 'residential_support_worker'
    })
    assert.match(welcome.heading, /Ready when you are/i)
    assert.equal(welcome.subline, '')
  })

  it('initials from Tom Kelly are TK', () => {
    assert.equal(profileInitialsFromName('Tom Kelly'), 'TK')
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
