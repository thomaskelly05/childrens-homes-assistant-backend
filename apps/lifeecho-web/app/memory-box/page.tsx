import { EmotionalAtmosphere } from '@/components/EmotionalAtmosphere'
import { EmotionalTimeline } from '@/components/EmotionalTimeline'
import { MemoryVault } from '@/components/MemoryVault'
import { PlaybackViewer } from '@/components/PlaybackViewer'
import { RelationshipConstellation } from '@/components/RelationshipConstellation'
import { VoiceMemoryPlayer } from '@/components/VoiceMemoryPlayer'

export default function MemoryBoxPage() {
  return (
    <main className="min-h-screen bg-[#060912] px-6 py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <EmotionalAtmosphere
          atmosphere="warming_and_settling"
          description="The emotional atmosphere suggests growing safety, connection and emotional continuity over time."
        />

        <PlaybackViewer
          scenes={[
            {
              scene_id: 'scene_1',
              title: 'First football achievement',
              emotional_tone: 'proud',
              narrative:
                'This moment reflected increasing confidence, belonging and emotional safety.',
            },
          ]}
        />

        <EmotionalTimeline
          nodes={[
            {
              id: '1',
              title: 'Settling into placement',
              emotional_tone: 'calm',
              timestamp: new Date().toISOString(),
            },
          ]}
        />

        <RelationshipConstellation
          nodes={[
            {
              id: 'node_1',
              label: 'Key worker relationship',
              emotion: 'safe',
            },
          ]}
          links={[]}
        />

        <VoiceMemoryPlayer
          tracks={[
            {
              id: 'voice_1',
              title: 'Positive affirmation',
              speaker: 'Key worker',
              transcript: 'You should feel proud of how far you have come.',
            },
          ]}
        />

        <MemoryVault
          items={[
            {
              id: 'memory_1',
              title: 'School achievement certificate',
              media_type: 'achievement',
              description:
                'Recognition of resilience, attendance and emotional progress.',
            },
          ]}
        />
      </div>
    </main>
  )
}
