import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { INDICARE_SYMBOL_SEED } from './indicare-symbol-seed.ts'
import {
  generateEasyReadLocal,
  generateReflectionRecordLocal,
  generateSocialStoryLocal,
  generateVisualBoardLocal
} from './orb-communicate-generators.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Communicate', () => {
  it('symbol seed includes required placeholder symbols', () => {
    const labels = INDICARE_SYMBOL_SEED.map((symbol) => symbol.label)
    for (const label of [
      'Worried',
      'Angry',
      'Sad',
      'Happy',
      'Stop',
      'Help',
      'Yes',
      'No',
      'Wait',
      'Later',
      'Staff',
      'Family',
      'Pain',
      'Quiet Space',
      'Home',
      'Change',
      'Finished'
    ]) {
      assert.ok(labels.includes(label), `missing symbol ${label}`)
    }
    assert.ok(INDICARE_SYMBOL_SEED.every((symbol) => symbol.id && symbol.plainLanguage && symbol.altText))
  })

  it('easy read generator returns structured British English preview', () => {
    const output = generateEasyReadLocal({
      ageGroup: 'young_person',
      whatNeedsExplaining: 'A change to evening routine',
      context: 'transition',
      outputLength: 'standard',
      communicationNeeds: 'Short sentences',
      emotionalContext: 'May feel worried'
    })
    assert.match(output.title, /Easy read/i)
    assert.ok(output.whatIsHappening.length > 20)
    assert.ok(output.recordingPrompts.length >= 3)
    assert.match(output.staffGuidance, /British English|plain/i)
    assert.doesNotMatch(output.whatIsHappening, /manipulative|non-compliant/i)
  })

  it('visual board generator returns symbol cards', () => {
    const output = generateVisualBoardLocal({
      boardPurpose: 'Evening feelings',
      numberOfCards: 6,
      includeFeelings: true,
      includeYesNoHelpStop: true,
      includePeoplePlacesTime: false,
      safeguardingSensitive: false
    })
    assert.equal(output.cards.length, 6)
    assert.ok(output.cards.every((card) => card.label && card.plainLanguage && card.category))
  })

  it('social story avoids compliance-led language', () => {
    const output = generateSocialStoryLocal({
      situation: 'going to an appointment',
      tone: 'preparation',
      whatMayFeelHard: 'waiting in an unfamiliar room'
    })
    assert.doesNotMatch(output.story, /I must behave/i)
    assert.match(output.story, /Adults will help me understand/i)
    assert.match(output.story, /I can ask for space/i)
  })

  it('reflection record uses observation-based wording', () => {
    const output = generateReflectionRecordLocal({
      whatWasExplained: 'visiting arrangements',
      howDidPersonRespond: 'nodded and pointed to the symbol board',
      exactWordsSignsOrGestures: 'Help',
      whatHelped: 'quiet space beforehand'
    })
    assert.match(output.record, /Staff offered|appeared to|communicated by/i)
    assert.doesNotMatch(output.record, /manipulative|attention-seeking|non-compliant|kicking off/i)
  })

  it('station is registered in navigation and routing', () => {
    const stations = read('lib/orb/orb-residential-stations.ts')
    const names = read('lib/orb/orb-user-facing-names.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const route = read('app/orb/communicate/page.tsx')
    assert.match(stations, /orb_communicate/)
    assert.match(names, /ORB_NAV_COMMUNICATE/)
    assert.match(names, /id: 'orb_communicate'/)
    assert.match(companion, /OrbCommunicateStation/)
    assert.match(companion, /openOrbCommunicatePanel/)
    assert.match(companion, /stationParam === 'communicate'/)
    assert.match(route, /station=communicate/)
  })

  it('API paths are declared for future backend integration', () => {
    const client = read('lib/orb/communicate/orb-communicate-client.ts')
    assert.match(client, /easyRead: '\/api\/orb\/communicate\/easy-read'/)
    assert.match(client, /myVoiceProfile: '\/api\/orb\/communicate\/my-voice-profile'/)
    assert.match(client, /generateEasyReadLocal/)
    assert.match(client, /tryApiPost/)
  })

  it('communicate hub exposes five workflow cards', () => {
    const hub = read('components/orb-communicate/orb-communicate-hub.tsx')
    for (const card of [
      'easy_read',
      'visual_board',
      'social_story',
      'my_voice_profile',
      'reflect_record'
    ]) {
      assert.match(hub, new RegExp(card))
    }
    const station = read('components/orb-communicate/orb-communicate-station.tsx')
    assert.match(station, /ORB Communicate/)
    assert.match(station, /data-orb-communicate-safety-banner|OrbCommunicateSafetyBanner/)
  })
})
