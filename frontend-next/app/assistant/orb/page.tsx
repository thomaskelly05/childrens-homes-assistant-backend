import { OrbStandaloneExperience } from '@/components/orb-standalone/orb-standalone-experience'
import { OrbStandaloneShell } from '@/components/orb-standalone/orb-standalone-shell'

export default function AssistantOrbPage() {
  return (
    <OrbStandaloneShell>
      <OrbStandaloneExperience />
    </OrbStandaloneShell>
  )
}

