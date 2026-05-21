import { PlaybackViewer } from '@/components/PlaybackViewer'

export default function PlaybackPage() {
  return (
    <main className="min-h-screen bg-[#060912] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <PlaybackViewer
          scenes={[
            {
              scene_id: 'scene_1',
              title: 'First successful overnight stay',
              emotional_tone: 'settled',
              narrative:
                'This memory reflected increasing emotional safety, trust and stability.',
            },
            {
              scene_id: 'scene_2',
              title: 'Achievement in education',
              emotional_tone: 'proud',
              narrative:
                'This moment showed resilience, confidence and emotional growth over time.',
            },
          ]}
        />
      </div>
    </main>
  )
}
