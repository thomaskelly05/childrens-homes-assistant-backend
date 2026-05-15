import { OrbAccessibilityPanel } from '@/components/orb-accessibility/orb-accessibility-panel'
import { OrbStandaloneShell } from '@/components/orb-standalone/orb-standalone-shell'

export default function AssistantAccessibilitySettingsPage() {
  return (
    <OrbStandaloneShell>
      <OrbAccessibilityPanel />
    </OrbStandaloneShell>
  )
}

