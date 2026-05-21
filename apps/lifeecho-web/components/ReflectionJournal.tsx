type Reflection = {
  id: string
  title: string
  content: string
  created_at: string
}

type Props = {
  reflections: Reflection[]
}

export function ReflectionJournal({ reflections }: Props) {
  return (
    <section className="rounded-[36px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold tracking-[-0.05em] text-white">
            Reflection journal
          </h2>

          <p className="mt-3 max-w-2xl text-white/60">
            A protected emotional space for thoughts, memories and reflective growth.
          </p>
        </div>

        <button className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm text-white/80 transition hover:bg-white/15">
          New reflection
        </button>
      </div>

      <div className="space-y-5">
        {reflections.map((reflection) => (
          <article
            key={reflection.id}
            className="rounded-3xl border border-white/10 bg-black/20 p-6"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                {reflection.title}
              </h3>

              <span className="text-sm text-white/50">
                {new Date(reflection.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="max-w-3xl text-base leading-8 text-white/70">
              {reflection.content}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
