import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_RESIDENTIAL_INTELLIGENCE_PRINCIPLES } from '../orb-residential-intelligence-principles.ts'
import {
  ORB_ADULT_REVIEW_REQUIRED_COPY,
  ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY
} from '../orb-residential-safety-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB residential brain convergence across modes', () => {
  it('shared intelligence principles include adult review and safeguarding boundaries', () => {
    const joined = ORB_RESIDENTIAL_INTELLIGENCE_PRINCIPLES.join(' ')
    assert.match(joined, /Adult review is always required/)
    assert.match(joined, /does not replace safeguarding/)
    assert.match(joined, /child central/i)
  })

  it('chat brain scaffold includes shared recording framework', () => {
    const framework = readSource('lib/orb/recording/orb-recording-framework.ts')
    assert.match(framework, /buildOrbRecordingBrainPromptBlock/)
    assert.match(framework, /ORB_THERAPEUTIC_RECORDING_PRINCIPLES/)
    assert.match(framework, /Required sections/)
  })

  it('dictate brain analysis uses buildOrbRecordingBrainContext', () => {
    const analysis = readSource('lib/orb/dictate/orb-dictate-brain-analysis.ts')
    assert.match(analysis, /buildOrbRecordingBrainContext/)
    assert.match(analysis, /manager_oversight_note/)
    assert.match(analysis, /child_voice_check/)
  })

  it('voice after-call derives from transcript only', () => {
    const afterCall = readSource('lib/orb/voice/orb-voice-after-call.ts')
    assert.match(afterCall, /derived from transcript only/)
    assert.match(afterCall, /buildOrbVoiceAfterCallSections/)
    assert.match(afterCall, /orbVoiceNeedsManagementOversight/)
  })

  it('voice launch mode re-exports shared safety strip', () => {
    const launch = readSource('lib/orb/voice/orb-voice-launch-mode.ts')
    assert.match(launch, /ORB_RESIDENTIAL_VOICE_SAFETY_STRIP/)
    const voiceSafety = readSource('lib/orb/orb-residential-safety-copy.ts')
    assert.match(voiceSafety, /ORB_RESIDENTIAL_VOICE_SAFETY_STRIP/)
    assert.match(voiceSafety, /safeguarding/i)
  })

  it('ORB Write review statement requires adult review', () => {
    const types = readSource('lib/orb/write/orb-write-types.ts')
    assert.match(types, /ORB_WRITE_REVIEW_STATEMENT/)
    assert.match(types, /adult review/i)
    assert.equal(ORB_ADULT_REVIEW_REQUIRED_COPY.toLowerCase().includes('adult review'), true)
  })

  it('recording framework version is exported for all modes', () => {
    const framework = readSource('lib/orb/recording/orb-recording-framework.ts')
    assert.match(framework, /ORB_RECORDING_FRAMEWORK_VERSION/)
    assert.match(framework, /buildOrbRecordingBrainPromptBlock/)
    const json = JSON.parse(readSource('lib/orb/recording/orb-recording-framework.json'))
    assert.ok(json.version)
  })

  it('safety copy is shared and visible', () => {
    assert.ok(ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY.includes('safeguarding'))
    const safety = readSource('lib/orb/orb-residential-safety-copy.ts')
    assert.match(safety, /ORB_ADULT_REVIEW_REQUIRED_COPY/)
    assert.match(safety, /ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY/)
  })

  it('record type flows through converged handoff', () => {
    const handoff = readSource('lib/orb/write/orb-write-converged-handoff.ts')
    assert.match(handoff, /recordTypeId/)
    assert.match(handoff, /convergedHandoffToOrbWrite/)
    const content = readSource('lib/orb/write/orb-write-content-handoff.ts')
    assert.match(content, /record_type_id/)
  })

  it('dictate generate uses recording framework not duplicate brain', () => {
    const client = readSource('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(client, /\/orb\/dictate\//)
    assert.doesNotMatch(client, /newBrain|duplicateBrain/i)
  })
})
