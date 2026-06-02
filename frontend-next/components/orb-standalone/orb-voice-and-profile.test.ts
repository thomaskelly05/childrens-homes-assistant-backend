import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { pickBritishFemaleVoice } from '../../lib/orb/voice/orb-voice-browser.ts'
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
    const heading = personalisedEmptyHeading(
      { ...DEFAULT_ADULT_PROFILE, name: 'Tom Kelly' },
      { hour: 15 }
    )
    assert.match(heading, /Good afternoon, Tom/i)
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
    const welcome = personalisedWelcomeMessage(
      {
        ...DEFAULT_ADULT_PROFILE,
        name: 'Tom Kelly',
        role: 'registered_manager'
      },
      { hour: 10 }
    )
    assert.match(welcome.heading, /Good morning, Tom/i)
    assert.match(welcome.subline, /inspection readiness|safeguarding|recording/i)
  })

  it('welcome message stays calm for NVQ assessor role', () => {
    const welcome = personalisedWelcomeMessage(
      {
        ...DEFAULT_ADULT_PROFILE,
        role: 'nvq_assessor',
        roleLabel: 'NVQ assessor'
      },
      { hour: 20 }
    )
    assert.match(welcome.heading, /Good evening/i)
    assert.match(welcome.subline, /inspection readiness|safeguarding|recording/i)
  })

  it('welcome message stays calm for support worker role', () => {
    const welcome = personalisedWelcomeMessage(
      {
        ...DEFAULT_ADULT_PROFILE,
        role: 'residential_support_worker'
      },
      { hour: 3 }
    )
    assert.match(welcome.heading, /Ready when you are/i)
    assert.match(welcome.subline, /inspection readiness|safeguarding|recording/i)
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
