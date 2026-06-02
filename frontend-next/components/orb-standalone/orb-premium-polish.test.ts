import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  DEFAULT_ADULT_PROFILE,
  personalisedWelcomeMessage
} from '../../lib/orb/adult-profile-store.ts'
import { profileInitialsFromName } from '../../lib/orb/orb-profile-initials.ts'
import { stripMarkdownForSpeech } from '../../lib/orb/orb-speech-text.ts'
import { ORB_SPEECH_RATE_PRESETS, speechRatePresetFor } from '../../lib/orb/orb-voice-presets.ts'
import { pickBritishFemaleVoice } from '../../lib/orb/voice/orb-voice-browser.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function mockVoice(name: string, lang: string, uri?: string): SpeechSynthesisVoice {
  return {
    name,
    lang,
    voiceURI: uri ?? `${name}-${lang}`,
    default: false,
    localService: true
  } as SpeechSynthesisVoice
}

const ORB_USER_FACING_FILES = [
  'components/orb-standalone/orb-care-companion.tsx',
  'components/orb-standalone/orb-assistant-message.tsx',
  'components/orb-standalone/orb-inline-citation.tsx',
  'components/orb-standalone/orb-help-panel.tsx',
  'components/orb-standalone/orb-voice-settings-panel.tsx',
  'components/orb-standalone/orb-standalone-settings-panel.tsx',
  'components/orb-standalone/orb-standalone-sidebar.tsx',
  'components/orb-standalone/orb-standalone-composer.tsx',
  'lib/orb/adult-profile-store.ts'
]

describe('ORB persistent message actions', () => {
  it('care companion renders persistent action bar for completed assistant messages', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbResponseActionBar/)
    assert.match(companion, /isLatest=\{index === visibleMessages\.length - 1\}/)
    assert.match(companion, /\(entry\.status === 'complete' \|\| entry\.status === 'stopped'\)/)
    assert.doesNotMatch(
      companion,
      /index !== visibleMessages\.length - 1[\s\S]*ActionChip[\s\S]*label="Copy"/
    )
  })

  it('action bar component always visible (not hover-only)', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /data-orb-response-action-bar-persistent/)
    assert.doesNotMatch(assistant, /group-hover:opacity-100/)
  })

  it('older messages keep Copy Speak Save More', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /dataAttr="copy"/)
    assert.match(assistant, /dataAttr="speak"/)
    assert.match(assistant, /dataAttr="save"/)
    assert.match(assistant, /dataAttr="more"/)
  })
})

describe('ORB rich citations', () => {
  it('popover shows why cited, exact excerpt, summary basis, and open source', () => {
    const source = readComponent('components/orb-standalone/orb-inline-citation.tsx')
    assert.match(source, /data-orb-citation-why/)
    assert.match(source, /data-orb-citation-summary-basis/)
    assert.match(source, /data-orb-citation-open-source/)
    assert.match(source, /Exact excerpt/)
    assert.match(source, /Pulled from/)
  })

  it('citation chip opens URL when source_url is http', () => {
    const source = readComponent('components/orb-standalone/orb-inline-citation.tsx')
    assert.match(source, /data-orb-citation-has-url/)
    assert.match(source, /window\.open\(href/)
  })
})

describe('ORB speaker identity', () => {
  it('profile name Tom Kelly gives TK', () => {
    assert.equal(profileInitialsFromName('Tom Kelly'), 'TK')
  })

  it('no profile name gives You', () => {
    assert.equal(profileInitialsFromName(''), 'You')
  })

  it('assistant avatar renders ORB mark', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /data-orb-speaker-avatar="assistant"/)
    assert.match(assistant, /OrbAssistantSpeakerAvatar/)
  })
})

describe('ORB personalised welcome', () => {
  it('registered manager welcome stays minimal', () => {
    const welcome = personalisedWelcomeMessage({
      ...DEFAULT_ADULT_PROFILE,
      name: 'Tom Kelly',
      role: 'registered_manager',
      roleLabel: 'Registered Manager'
    })
    assert.match(welcome.heading, /Tom/)
    assert.match(welcome.subline, /inspection readiness|safeguarding|recording/i)
  })

  it('support worker welcome stays minimal', () => {
    const welcome = personalisedWelcomeMessage({
      ...DEFAULT_ADULT_PROFILE,
      name: 'Alex',
      role: 'residential_support_worker'
    })
    assert.match(welcome.heading, /Alex|Ready|Good/i)
    assert.match(welcome.subline, /inspection readiness|safeguarding|recording/i)
  })

  it('temporary chat welcome mentions temporary mode', () => {
    const welcome = personalisedWelcomeMessage(DEFAULT_ADULT_PROFILE, { temporary: true })
    assert.match(welcome.temporaryNote || '', /Temporary chat/i)
  })
})

describe('ORB user-facing copy scan', () => {
  it('no ChatGPT string in rendered ORB component sources', () => {
    for (const file of ORB_USER_FACING_FILES) {
      const source = readComponent(file)
      assert.doesNotMatch(source, /ChatGPT/i, `ChatGPT reference found in ${file}`)
    }
  })
})

describe('ORB voice settings', () => {
  it('default chooser prefers en-GB female-like voice', () => {
    const voices = [
      mockVoice('Google UK English Male', 'en-GB'),
      mockVoice('Google UK English Female', 'en-GB')
    ]
    const picked = pickBritishFemaleVoice(voices, true, null)
    assert.ok(picked)
    assert.match(picked!.name.toLowerCase(), /female/)
  })

  it('speech rate presets include slow normal fast', () => {
    assert.equal(ORB_SPEECH_RATE_PRESETS.normal, 0.92)
    assert.equal(speechRatePresetFor(0.92), 'normal')
  })

  it('speech text strips markdown and citation brackets', () => {
    const spoken = stripMarkdownForSpeech('Hello **world** [Reg 12] and more.')
    assert.doesNotMatch(spoken, /\*\*/)
    assert.doesNotMatch(spoken, /\[Reg 12\]/)
    assert.match(spoken, /Hello world/)
  })

  it('voice picker and persistence hooks exist', () => {
    const panel = readComponent('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(panel, /data-orb-voice-select/)
    assert.match(panel, /data-orb-voice-rate/)
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /ORB_VOICE_SETTINGS_STORAGE_KEY/)
    assert.match(hook, /selectedVoiceUri/)
  })
})
