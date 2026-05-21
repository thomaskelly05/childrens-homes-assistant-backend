type MemoryItem = {
  id: string
  title: string
  media_type: string
  description?: string
}

type Props = {
  items: MemoryItem[]
}

export function MemoryVault({ items }: Props) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            Memory vault
          </h2>
          <p className="mt-2 max-w-2xl text-white/60">
            A protected emotional archive preserving achievements, voice memories,
            relationships and meaningful life moments.
          </p>
        </div>

        <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
          {items.length} preserved memories
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="group rounded-3xl border border-white/10 bg-black/20 p-6 transition hover:border-white/20 hover:bg-black/30"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/50">
                {item.media_type}
              </div>

              <div className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
            </div>

            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
              {item.title}
            </h3>

            {item.description ? (
              <p className="mt-3 text-sm leading-7 text-white/65">
                {item.description}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
