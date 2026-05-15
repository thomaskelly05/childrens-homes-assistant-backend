import { OrbAmbientFrame } from './orb-ambient-frame'
import { OrbCaptionLayer } from './orb-caption-layer'
import { OrbPresenceIndicator } from './orb-presence-indicator'
import { OrbSphere, type OrbRenderState } from './orb-sphere'
import { OrbStateLayer } from './orb-state-layer'

export function OrbRenderer({
  state = 'idle',
  caption,
  captionsEnabled,
  presenceLabel = 'ORB powered by IndiCare',
  compact = false,
  immersive = false
}: {
  state?: OrbRenderState
  caption?: string
  captionsEnabled?: boolean
  presenceLabel?: string
  compact?: boolean
  immersive?: boolean
}) {
  const size = immersive ? 'xlarge' : compact ? 'medium' : 'large'
  const chrome = immersive
    ? 'min-h-[620px] bg-transparent p-4 shadow-none'
    : `orb-renderer-panel rounded-[40px] p-8 ${compact ? 'min-h-80' : 'min-h-[560px]'}`

  return (
    <div className={`orb-renderer relative flex flex-col items-center justify-center gap-6 text-white ${chrome}`} data-orb-state={state}>
      <OrbAmbientFrame state={state} compact={compact} />
      <OrbPresenceIndicator label={presenceLabel} />
      <OrbSphere state={state} size={size} />
      <OrbStateLayer state={state} />
      <OrbCaptionLayer enabled={captionsEnabled} text={caption} privacySensitive={state === 'child_present' || state === 'safeguarding_cautious'} />
    </div>
  )
}

