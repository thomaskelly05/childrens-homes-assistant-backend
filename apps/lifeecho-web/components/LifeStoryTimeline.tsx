type TimelineChapter = {
  id: string
  title: string
  summary: string
  emotional_tone: string
}

type Props = {
  chapters: TimelineChapter[]
}

export function LifeStoryTimeline({ chapters }: Props) {
  return (
    <section className="rounded-[36px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold tracking-[-0.05em] text-white">
            Life story timeline
          </h2>

          <p className="mt-3 max-w-2xl text-white/60">
            Emotional chapters and reflective continuity across the young person’s journey.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {chapters.map((chapter) => (
          <article
            key={chapter.id}
            className="rounded-3xl border border-white/10 bg-black/20 p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                {chapter.title}
              </h3>

              <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/60">
                {chapter.emotional_tone}
              </div>
            </div>

            <p className="max-w-3xl text-base leading-8 text-white/70">
              {chapter.summary}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
