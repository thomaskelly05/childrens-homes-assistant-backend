/** Browser speech rate presets for standalone ORB read-aloud. */

export const ORB_SPEECH_RATE_PRESETS = {
  slow: 0.82,
  normal: 0.92,
  fast: 1.02
} as const

export type OrbSpeechRatePreset = keyof typeof ORB_SPEECH_RATE_PRESETS

export function speechRatePresetFor(rate: number): OrbSpeechRatePreset {
  const entries = Object.entries(ORB_SPEECH_RATE_PRESETS) as Array<[OrbSpeechRatePreset, number]>
  let closest: OrbSpeechRatePreset = 'normal'
  let minDiff = Number.POSITIVE_INFINITY
  for (const [preset, value] of entries) {
    const diff = Math.abs(value - rate)
    if (diff < minDiff) {
      minDiff = diff
      closest = preset
    }
  }
  return closest
}
