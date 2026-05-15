import { OrbInteractionLayer } from '@/components/orb-core/orb-interaction-layer'
import { OrbRenderer } from '@/components/orb-core/orb-renderer'

export function OrbStandaloneVoice() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
      <OrbRenderer state="listening" captionsEnabled caption="Voice uses standalone context only. No OS records are available here." presenceLabel="Voice-first standalone ORB" />
      <OrbInteractionLayer captionText="Voice connection will use realtime only when configured; text and captions remain available." />
    </div>
  )
}

