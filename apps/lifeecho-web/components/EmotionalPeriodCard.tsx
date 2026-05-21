type Props = {
  title: string
  atmosphere: string
  summary?: string
  themes?: string[]
}

export function EmotionalPeriodCard({
  title,
  atmosphere,
  summary,
  themes = [],
}: Props) {
  return (
    <article className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">
          {title}
        </h3>

        <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/60">
          {atmosphere}
        </div>
      </div>

      {summary ? (
        <p className="text-base leading-8 text-white/70">{summary}</p>
      ) : null}

      {themes.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {themes.map((theme) => (
            <div
              key={theme}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
            >
              {theme}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}
