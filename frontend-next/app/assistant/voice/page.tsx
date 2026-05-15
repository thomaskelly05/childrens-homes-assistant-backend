import { OrbStandaloneShell } from '@/components/orb-standalone/orb-standalone-shell'
import { OrbStandaloneExperience } from '@/components/orb-standalone/orb-standalone-experience'

export default function AssistantVoicePage() {
  return (
    <OrbStandaloneShell>
      <OrbStandaloneExperience voiceFirst />
    </OrbStandaloneShell>
  )
}

