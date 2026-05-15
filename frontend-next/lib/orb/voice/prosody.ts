import type { OrbVoiceProfileId } from './orchestration'

export function prosodyForOrbVoice(profile: OrbVoiceProfileId) {
  if (profile === 'british_female_calm') {
    return { pace: 'steady', cadence: 'calm concise human', fillerSuppression: true, silenceTimingMs: 1000 }
  }
  if (profile === 'safeguarding_cautious' || profile === 'inspection_preparation') {
    return { pace: 'measured', cadence: 'evidence-first', fillerSuppression: true, silenceTimingMs: 1400 }
  }
  if (profile === 'child_present' || profile === 'nighttime_handover' || profile === 'emotional_safety') {
    return { pace: 'slow', cadence: 'short phrases', fillerSuppression: true, silenceTimingMs: 1600 }
  }
  return { pace: 'steady', cadence: 'conversational', fillerSuppression: true, silenceTimingMs: 1000 }
}

