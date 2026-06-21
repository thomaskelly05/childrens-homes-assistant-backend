import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildOrbVoiceHandoffPayload } from './orb-voice-handoff.ts'
import { buildOrbVoiceReflectiveSummary } from './orb-voice-reflective-summary.ts'
import {
  ORB_KATHERINE_VOICE_DESCRIPTION,
  ORB_KATHERINE_VOICE_ID,
  ORB_KATHERINE_VOICE_LABEL,
  ORB_VOICE_LISTENING_LABEL,
  ORB_VOICE_SLOW_THINKING_MESSAGE,
  ORB_VOICE_SPEAKING_LABEL,
  ORB_VOICE_STOP_ORB,
  buildVoiceBrainMessage,
  buildVoiceSessionMemory,
  resolveTtsVoiceProfileId,
  stripForSpokenReply
} from './orb-voice-human-conversation.ts'
import {
  ORB_VOICE_ADULT_REVIEW_LABEL,
  ORB_VOICE_AUDIO_TRANSCRIPT_REVIEW_NOTE,
  ORB_VOICE_BUTTON_START,
  ORB_VOICE_BUTTON_STOP_LISTENING,
  ORB_VOICE_BUTTON_THINKING,
  ORB_VOICE_CONVERSATION_SUBLABEL,
  ORB_VOICE_MIC_ERROR
} from './orb-voice-reflective-copy.ts'
import { DEFAULT_ORB_VOICE_PROFILE_ID } from './orb-voice-profiles.ts'
import { orbVoiceUiPrimaryLabel } from './orb-voice-ui-state.ts'
import type { VoiceTurn } from './orb-voice-types.ts'

describe('ORB Voice human conversation runtime', () => {
  it('Katherine is the default ORB voice profile', () => {
    assert.equal(DEFAULT_ORB_VOICE_PROFILE_ID, ORB_KATHERINE_VOICE_ID)
    assert.equal(ORB_KATHERINE_VOICE_LABEL, 'Katherine')
    assert.match(ORB_KATHERINE_VOICE_DESCRIPTION, /British, calm and professional/)
  })

  it('maps Katherine to premium TTS profile without hardcoding secrets', () => {
    assert.equal(resolveTtsVoiceProfileId('katherine'), ORB_KATHERINE_VOICE_ID)
    assert.equal(resolveTtsVoiceProfileId('orb_british_female'), ORB_KATHERINE_VOICE_ID)
  })

  it('turn-taking labels match Phase 4B copy', () => {
    assert.equal(ORB_VOICE_BUTTON_START, 'Start conversation')
    assert.equal(ORB_VOICE_BUTTON_STOP_LISTENING, 'Stop')
    assert.equal(ORB_VOICE_LISTENING_LABEL, 'Listening…')
    assert.equal(ORB_VOICE_BUTTON_THINKING, 'ORB is thinking…')
    assert.equal(ORB_VOICE_SPEAKING_LABEL, 'ORB is responding…')
    assert.equal(ORB_VOICE_STOP_ORB, 'Stop ORB')
    assert.equal(orbVoiceUiPrimaryLabel('speaking'), 'Stop ORB')
  })

  it('builds session memory from turns for brain framing', () => {
    const turns: VoiceTurn[] = [
      { id: '1', role: 'user', text: 'I spoke with Jamie after tea.', startedAt: '2026-01-01T10:00:00Z' },
      { id: '2', role: 'assistant', text: 'What happened just before?', startedAt: '2026-01-01T10:00:05Z' }
    ]
    const memory = buildVoiceSessionMemory({ modeId: 'incident_reflection', turns })
    assert.equal(memory.adultTurnCount, 1)
    assert.equal(memory.orbTurnCount, 1)
    assert.match(buildVoiceBrainMessage('More context', { reflectiveModeId: 'incident_reflection', spokenAnswerLength: 'balanced' }), /Reflective topic/)
  })

  it('summary uses full conversation and adult review label', () => {
    const turns: VoiceTurn[] = [
      { id: '1', role: 'user', text: 'First adult turn.', startedAt: '2026-01-01T10:00:00Z' },
      { id: '2', role: 'assistant', text: 'ORB reflection.', startedAt: '2026-01-01T10:00:05Z' },
      { id: '3', role: 'user', text: 'Second adult turn.', startedAt: '2026-01-01T10:01:00Z' }
    ]
    const summary = buildOrbVoiceReflectiveSummary('just_talk', turns)
    assert.equal(summary.label, ORB_VOICE_ADULT_REVIEW_LABEL)
    assert.match(summary.markdown, /First adult turn/)
    assert.match(summary.markdown, /Second adult turn/)
  })

  it('wording support summary has dedicated sections', () => {
    const turns: VoiceTurn[] = [
      { id: '1', role: 'user', text: 'He was being difficult.', startedAt: '2026-01-01T10:00:00Z' },
      { id: '2', role: 'assistant', text: 'Try factual wording and avoid judgement.', startedAt: '2026-01-01T10:00:05Z' }
    ]
    const summary = buildOrbVoiceReflectiveSummary('wording_support', turns)
    assert.match(summary.markdown, /Original wording concern/)
    assert.match(summary.markdown, /Suggested wording/)
  })

  it('handoff payload includes Katherine voice and audio honesty', () => {
    const payload = buildOrbVoiceHandoffPayload({
      mode: 'supervision_prep',
      conversationTranscript: 'Adult: hello\nORB: hi',
      summary: 'Generated for adult review\n\n## What was discussed',
      suggestedTemplateId: 'supervision_prep'
    })
    assert.equal(payload.source, 'orb_voice')
    assert.equal(payload.selectedVoice, 'Katherine')
    assert.equal(payload.audioStored, false)
    assert.equal(payload.adultReviewStatus, 'generated_for_adult_review')
  })

  it('safeguarding summary reminds about local procedure', () => {
    const summary = buildOrbVoiceReflectiveSummary('safeguarding_thinking', [
      { id: '1', role: 'user', text: 'There was a disclosure.', startedAt: '2026-01-01T10:00:00Z' }
    ])
    assert.match(summary.markdown, /local procedure|safeguarding procedure/i)
  })

  it('audio storage and mic error copy are honest', () => {
    assert.match(ORB_VOICE_AUDIO_TRANSCRIPT_REVIEW_NOTE, /Audio is not stored/)
    assert.match(ORB_VOICE_MIC_ERROR, /microphone permission/)
  })

  it('slow thinking message does not freeze the adult', () => {
    assert.match(ORB_VOICE_SLOW_THINKING_MESSAGE, /still thinking/)
    assert.match(ORB_VOICE_SLOW_THINKING_MESSAGE, /pause/)
  })

  it('stripForSpokenReply removes markdown noise', () => {
    assert.equal(stripForSpokenReply('**Hello** ```code```'), 'Hello')
  })

  it('conversation sublabel marks reflection notes', () => {
    assert.equal(ORB_VOICE_CONVERSATION_SUBLABEL, 'Reflection notes — not yet a record')
  })
})
