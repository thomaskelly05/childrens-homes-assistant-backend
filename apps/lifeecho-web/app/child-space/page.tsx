import { EmotionalAtmosphere } from '@/components/EmotionalAtmosphere'
import { MemoryVault } from '@/components/MemoryVault'

export default function ChildSpacePage() {
  return (
    <main className="min-h-screen bg-[#060912] px-6 py-12 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <EmotionalAtmosphere
          atmosphere="safe_reflective_space"
          description="A calm and protected space designed for emotional reflection, positive memories and growth."
        />

        <MemoryVault
          items={[
            {
              id: 'memory_1',
              title: 'Favourite football memory',
              media_type: 'photo',
              description:
                'A positive memory connected to teamwork, encouragement and confidence.',
            },
            {
              id: 'memory_2',
              title: 'Achievement certificate',
              media_type: 'achievement',
              description:
                'Recognition of emotional growth, resilience and effort.',
            },
          ]}
        />
      </div>
    </main>
  )
}
