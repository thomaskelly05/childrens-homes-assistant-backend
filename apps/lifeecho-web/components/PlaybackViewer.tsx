type PlaybackScene = {
  scene_id: string
  title: string
  emotional_tone: string
  narrative: string
}

type Props = {
  scenes: PlaybackScene[]
}

export function PlaybackViewer({ scenes }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(155,126,255,0.18),transparent_45%)]" />

      <div className="relative z-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-semibold tracking-[-0.05em] text-white">
              Emotional playback
            </h2>
            <p className="mt-3 max-w-2xl text-white/60">
              Replay emotionally important moments through reflective memory sequencing.
            </p>
          </div>

          <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
            {scenes.length} memory scenes
          </div>
        </div>

        <div className="space-y-6">
          {scenes.map((scene) => (
            <article
              key={scene.scene_id}
              className="rounded-3xl border border-white/10 bg-black/20 p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  {scene.title}
                </h3>

                <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/60">
                  {scene.emotional_tone}
                </div>
              </div>

              <p className="max-w-3xl text-base leading-8 text-white/70">
                {scene.narrative}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
