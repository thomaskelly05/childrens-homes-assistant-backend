import { OrbStandaloneChat } from '@/components/orb-standalone/orb-standalone-chat'
import { OrbStandaloneHome } from '@/components/orb-standalone/orb-standalone-home'
import { OrbStandaloneShell } from '@/components/orb-standalone/orb-standalone-shell'

export default function AssistantPage() {
  return (
    <OrbStandaloneShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <OrbStandaloneHome />
        <OrbStandaloneChat />
      </div>
    </OrbStandaloneShell>
  )
}
