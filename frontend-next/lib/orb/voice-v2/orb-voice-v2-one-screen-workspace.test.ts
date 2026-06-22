import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_V2_DIDNT_CATCH_COPY,
  ORB_VOICE_V2_ONE_SCREEN_WORKSPACE,
  orbVoiceV2PrimaryActionLabel,
  resolveOrbVoiceLiveRailTab,
  resolveOrbVoiceV2LiveStatusCopy
} from './orb-voice-v2-one-screen-workspace.ts'

describe('ORB Voice v2 one-screen workspace', () => {
  it('workspace mode constant is stable', () => {
    assert.equal(ORB_VOICE_V2_ONE_SCREEN_WORKSPACE, 'one_screen_live')
  })

  it('primary action shows Interrupt while speaking', () => {
    assert.equal(orbVoiceV2PrimaryActionLabel('speaking', { speaking: true }), 'Interrupt')
    assert.equal(orbVoiceV2PrimaryActionLabel('idle'), 'Start conversation')
  })

  it('live status copy prioritises acknowledgement then thinking', () => {
    assert.equal(
      resolveOrbVoiceV2LiveStatusCopy({ state: 'thinking', acknowledgement: 'I’ve got that.' }),
      'I’ve got that.'
    )
    assert.match(
      resolveOrbVoiceV2LiveStatusCopy({ state: 'thinking', brainTier: 'voice_specialist' }) ?? '',
      /residential childcare brain/
    )
  })

  it('summary state opens summary rail tab', () => {
    assert.equal(resolveOrbVoiceLiveRailTab('summary_ready'), 'summary')
    assert.equal(resolveOrbVoiceLiveRailTab('listening'), 'transcript')
  })

  it('didnt catch copy is non-alarming', () => {
    assert.match(ORB_VOICE_V2_DIDNT_CATCH_COPY, /didn’t catch enough/i)
    assert.doesNotMatch(ORB_VOICE_V2_DIDNT_CATCH_COPY, /error|failed/i)
  })
})
