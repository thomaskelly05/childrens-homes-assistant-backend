import { OrbShell } from '@/components/orb/orb-shell'
import { OrbClientFlightRecorder } from '@/components/orb-standalone/orb-client-flight-recorder'

export default function OrbPage() {
  return (
    <>
      <OrbShell />
      <OrbClientFlightRecorder />
    </>
  )
}
