import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  createCommunicationPlan,
  safeguardingGuardrailLines,
  textContainsLeadingQuestions
} from './orb-communicate-plan.ts'
import { generateCommunicationSupportPack } from './orb-communicate-support-pack-generator.ts'
import type { MyVoiceProfile } from './orb-communicate-types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const SAMPLE_PROFILE: MyVoiceProfile = {
  howICommunicate: 'Uses short phrases and a symbol board',
  howISayYes: 'Thumbs up',
  howISayNo: 'Shakes head and pushes board away',
  howIShowPain: 'Holds stomach and becomes quiet',
  howIShowAnxiety: 'Pacing and humming',
  wordsSignsOrSymbolsIUse: 'Help, Wait, Finished',
  whatIUnderstandWell: 'Now/next routines',
  whatIFindHardToUnderstand: 'Long verbal explanations',
  whatHelpsMeProcessInformation: 'Quiet space and one step at a time',
  whatMakesCommunicationHarder: 'Multiple adults talking at once',
  sensoryNeeds: 'Low lighting and reduced noise',
  trustedAdults: 'Key worker and evening shift lead',
  thingsStaffShouldNotAssume: 'Silence does not mean agreement',
  preferredCommunicationFormat: 'symbols',
  recordingGuidance: 'Record exact gestures and board selections'
}

describe('ORB Communicate intelligent support pack (Phase 1N)', () => {
  it('main screen shows natural-language creation input and examples', () => {
    const createFlow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    const station = read('components/orb-communicate/orb-communicate-station.tsx')
    assert.match(createFlow, /data-orb-communicate-create-flow/)
    assert.match(createFlow, /data-orb-communicate-prompt-input/)
    assert.match(createFlow, /data-orb-communicate-subtitle/)
    assert.match(createFlow, /data-orb-communicate-example-chips/)
    assert.match(createFlow, /Create support/)
    assert.match(station, /OrbCommunicateCreateFlow/)
  })

  it('Guide ORB panel exists and is secondary to the main prompt', () => {
    const guide = read('components/orb-communicate/orb-communicate-guide-panel.tsx')
    const createFlow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(guide, /data-orb-communicate-guide-panel/)
    assert.match(guide, /Let ORB choose/)
    assert.match(createFlow, /OrbCommunicateGuidePanel/)
  })

  it('advanced tools remain accessible but do not dominate', () => {
    const hub = read('components/orb-communicate/orb-communicate-hub.tsx')
    const createFlow = read('components/orb-communicate/orb-communicate-create-flow.tsx')
    assert.match(hub, /data-orb-communicate-advanced-tools/)
    assert.match(hub, /Advanced tools/)
    assert.match(createFlow, /OrbCommunicateAdvancedTools/)
    assert.doesNotMatch(createFlow, /grid gap-4 sm:grid-cols-2.*ORB_COMMUNICATE_HUB_CARDS/s)
  })

  it('createCommunicationPlan returns expected sections for key scenarios', () => {
    const contact = createCommunicationPlan({
      prompt: 'I need to explain that contact with Mum has changed today and he usually struggles with changes.'
    })
    assert.equal(contact.intent, 'contact_change')
    assert.deepEqual(contact.sectionTypes, [
      'easy_read',
      'visual_cards',
      'regulation_support',
      'staff_guidance',
      'recording_prompts'
    ])

    const staff = createCommunicationPlan({ prompt: 'We have a new staff member starting on shift tonight.' })
    assert.equal(staff.intent, 'new_staff_member')
    assert.deepEqual(staff.sectionTypes, ['social_story', 'visual_cards', 'staff_guidance'])

    const hospital = createCommunicationPlan({ prompt: 'Hospital appointment on Tuesday morning.' })
    assert.equal(hospital.intent, 'hospital_appointment')
    assert.ok(hospital.sectionTypes.includes('easy_read'))
    assert.ok(hospital.sectionTypes.includes('recording_prompts'))

    const bedtime = createCommunicationPlan({ prompt: 'Bedtime worries and trouble settling at night.' })
    assert.equal(bedtime.intent, 'bedtime_worries')
    assert.ok(bedtime.sectionTypes.includes('visual_cards'))
    assert.ok(bedtime.sectionTypes.includes('regulation_support'))

    const feelings = createCommunicationPlan({ prompt: 'Help someone say how they feel after a difficult day.' })
    assert.equal(feelings.intent, 'feelings_expression')
    assert.deepEqual(feelings.sectionTypes, ['visual_cards', 'staff_guidance', 'recording_prompts'])

    const safeguarding = createCommunicationPlan({
      prompt: 'A young person told me something worrying and I need to support communication safely.'
    })
    assert.equal(safeguarding.intent, 'safeguarding_disclosure')
    assert.ok(safeguarding.safeguardingMode)
    assert.ok(safeguarding.sectionTypes.includes('reflection_draft'))
  })

  it('safeguarding-sensitive plans include guardrails and avoid leading question wording', () => {
    const pack = generateCommunicationSupportPack({
      prompt: 'Safeguarding worry — the young person told me something that needs careful recording.'
    })
    assert.equal(pack.sensitivity, 'safeguarding_sensitive')
    assert.ok(safeguardingGuardrailLines(true).length >= 3)
    const combined = pack.sections.map((section) => section.content).join('\n')
    assert.doesNotMatch(combined, /why did you|why do you|manipulative|non-compliant/i)
    assert.match(combined, /staff observed|communicated by|appeared to|local safeguarding/i)
    assert.equal(textContainsLeadingQuestions('Why did you do that?'), true)
  })

  it('generateCommunicationSupportPack works locally without backend', () => {
    const pack = generateCommunicationSupportPack({
      prompt: 'Contact has changed today.'
    })
    assert.ok(pack.packTitle.length > 5)
    assert.ok(pack.sections.length >= 3)
    assert.ok(pack.createdAt)
    assert.ok(pack.safetyNotes.length >= 2)
  })

  it('support pack renders sections and actions in UI', () => {
    const view = read('components/orb-communicate/orb-communicate-support-pack-view.tsx')
    assert.match(view, /data-orb-communicate-support-pack/)
    assert.match(view, /data-orb-communicate-pack-section/)
    assert.match(view, /data-orb-communicate-section-action/)
    assert.match(view, /Copy all/)
    assert.match(view, /Start Reflect & Record/)
  })

  it('visual actions are placeholders and do not call missing endpoints', () => {
    const view = read('components/orb-communicate/orb-communicate-support-pack-view.tsx')
    const generator = read('lib/orb/communicate/orb-communicate-support-pack-generator.ts')
    assert.match(view, /data-orb-communicate-action-placeholder/)
    assert.match(view, /Create image/)
    assert.match(view, /Save to library/)
    assert.doesNotMatch(view, /authFetch|tryApiPost|fetch\(/)
    assert.doesNotMatch(generator, /authFetch|tryApiPost/)
  })

  it('My Voice Profile can influence the pack where available', () => {
    const without = generateCommunicationSupportPack({
      prompt: 'New staff member starting tonight.',
      useMyVoiceProfile: true,
      myVoiceProfile: null
    })
    assert.equal(without.myVoiceProfileUsed, false)
    assert.match(without.myVoiceProfileNotice ?? '', /No My Voice Profile found yet/)

    const withProfile = generateCommunicationSupportPack({
      prompt: 'New staff member starting tonight.',
      useMyVoiceProfile: true,
      myVoiceProfile: SAMPLE_PROFILE
    })
    assert.equal(withProfile.myVoiceProfileUsed, true)
    const guidance = withProfile.sections.find((section) => section.type === 'staff_guidance')
    assert.ok(guidance?.content.includes('Uses short phrases and a symbol board'))
  })

  it('existing communicate station routing and workflow cards remain available', () => {
    const station = read('components/orb-communicate/orb-communicate-station.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    for (const card of ['easy_read', 'visual_board', 'social_story', 'my_voice_profile', 'reflect_record']) {
      assert.match(station, new RegExp(card))
    }
    assert.match(companion, /OrbCommunicateStation/)
    assert.match(companion, /stationParam === 'communicate'/)
  })

  it('uses single shell CSS only — no new communicate stylesheet', () => {
    const layout = read('app/orb/layout.tsx')
    const css = read('app/orb/orb-residential-shell.css')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.match(css, /orb-communicate-prompt/)
    assert.match(css, /orb-communicate-create-btn/)
  })
})
