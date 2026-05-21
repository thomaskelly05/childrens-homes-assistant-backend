type VoiceTrack = {
  id: string
  title: string
  speaker: string
  transcript: string
}

type Props = {
  tracks: VoiceTrack[]
}

export function VoiceMemoryPlayer({ tracks }: Props) {
  return (
    <div className="space-y-4">
      {tracks.map((track) => (
        <div
          key={track.id}
          className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{track.title}</h3>
              <p className="mt-1 text-sm text-white/60">{track.speaker}</p>
            </div>

            <button className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/15">
              Play
            </button>
          </div>

          <p className="mt-4 text-white/70">{track.transcript}</p>
        </div>
      ))}
    </div>
  )
}
