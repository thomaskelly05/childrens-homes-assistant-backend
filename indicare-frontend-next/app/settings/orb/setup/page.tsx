import { PageHeader } from '@/components/indicare/ui'
import { OrbSetup } from '@/components/indicare/orb/orb-setup'

export default function OrbSetupPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orb onboarding"
        title="Set up Orb voice"
        description="Privacy, microphone permission, voice style, activation options, test phrases and safe recording preferences."
      />
      <OrbSetup />
    </div>
  )
}

