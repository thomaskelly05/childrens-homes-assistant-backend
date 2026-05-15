import { OrbStandaloneHome } from '@/components/orb-standalone/orb-standalone-home'
import { OrbStandaloneShell } from '@/components/orb-standalone/orb-standalone-shell'

export default function AssistantOrbPage() {
  return (
    <OrbStandaloneShell>
      <OrbStandaloneHome />
    </OrbStandaloneShell>
  )
}

