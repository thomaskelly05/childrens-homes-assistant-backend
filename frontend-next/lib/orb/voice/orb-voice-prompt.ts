import { getOrbVoiceProfile } from '@/lib/orb/voice/orb-voice-profiles'
import { ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS } from '@/lib/orb/voice/orb-voice-conversation-engine'
import type { OrbVoiceModeId, OrbSpokenAnswerLength } from '@/lib/orb/voice/orb-voice-types'

const MODE_INSTRUCTIONS: Record<OrbVoiceModeId, string> = {
  conversational:
    "I'm ORB. Respond as a calm British professional colleague in a children's home. Keep spoken turns short (about 10–30 seconds). One idea at a time. One follow-up question at a time. Acknowledge briefly, then ask thoughtfully.",
  reflective_practice:
    'Support reflective practice: separate facts, staff actions, child voice, and learning points. Ask one curious question at a time. Do not replace professional judgement.',
  recording_support:
    'Help turn spoken notes into clear professional recording wording. Offer to put the full template in chat rather than reading it aloud.',
  inspection_readiness:
    'Support Inspection evidence preparation calmly: evidence, chronology, and quality standards — not roleplay as an inspector unless asked.',
  safeguarding_support:
    'Be calm and procedure-aware. Separate facts, immediate actions, child voice, and manager/DSL oversight. If immediate danger is mentioned, advise following home procedures and emergency services where required. Do not sound like an emergency service.',
  learning_coach:
    'Turn the topic into brief micro-learning suitable for a staff briefing. Keep it practical and residential-childcare-specific.'
}

const LENGTH_HINTS: Record<OrbSpokenAnswerLength, string> = {
  short: 'Keep the spoken answer short — a few sentences plus one follow-up.',
  balanced: 'Aim for a balanced spoken answer — helpful but not a monologue.',
  detailed: 'The user asked for more detail; still avoid reading huge templates aloud — offer written output in chat.'
}

export { ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS }

export function voiceModeInstruction(mode: OrbVoiceModeId): string {
  const modeLine = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.conversational
  return `${modeLine} ${ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS}`
}

export function frameMessageForOrbVoice(
  userText: string,
  options: {
    mode: OrbVoiceModeId
    spokenAnswerLength: OrbSpokenAnswerLength
    voiceProfileId?: string
  }
): string {
  const modeLine = voiceModeInstruction(options.mode)
  const lengthLine = LENGTH_HINTS[options.spokenAnswerLength]
  const profile = getOrbVoiceProfile(options.voiceProfileId)
  return [
    userText.trim(),
    '',
    '[ORB Voice — spoken response]',
    `Voice style: ${profile.label}. ${profile.instructions}`,
    modeLine,
    lengthLine,
    'Use shorter sentences suitable for speech. No internal reasoning labels. No long bullet lists unless asked. If a full template would be long, offer to generate it in chat instead of reading it out.'
  ].join('\n')
}
