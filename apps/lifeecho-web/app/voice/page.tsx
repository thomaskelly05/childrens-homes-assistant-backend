import { VoiceMemoryPlayer } from '@/components/VoiceMemoryPlayer'

export default function VoicePage() {
  return (
    <main className="min-h-screen bg-[#060912] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <VoiceMemoryPlayer
          tracks={[
            {
              id: 'voice_1',
              title: 'Positive encouragement',
              speaker: 'Key worker',
              transcript:
                'You handled today really well and should feel proud of yourself.',
            },
            {
              id: 'voice_2',
              title: 'Achievement reflection',
              speaker: 'Football mentor',
              transcript:
                'You showed confidence, teamwork and resilience throughout the session.',
            },
          ]}
        />
      </div>
    </main>
  )
}
