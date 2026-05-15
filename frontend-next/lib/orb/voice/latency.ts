export function orbLatencyStrategy(options: { realtimeConfigured: boolean; networkQuality?: 'good' | 'normal' | 'poor' }) {
  if (options.realtimeConfigured && options.networkQuality !== 'poor') {
    return { route: 'realtime_voice', fallback: 'caption_text', targetAckMs: 350, streamFirstToken: true }
  }
  return { route: 'caption_text', fallback: 'browser_tts_optional', targetAckMs: 700, streamFirstToken: false }
}

