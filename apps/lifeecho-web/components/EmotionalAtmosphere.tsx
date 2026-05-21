type Props = {
  atmosphere: string
  description: string
}

export function EmotionalAtmosphere({
  atmosphere,
  description,
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(248,215,122,0.16),transparent_35%),radial-gradient(circle_at_bottom,rgba(123,199,255,0.16),transparent_35%)]" />

      <div className="relative z-10 max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
          <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_16px_rgba(125,211,252,0.9)]" />
          Emotional atmosphere
        </div>

        <h2 className="text-4xl font-semibold tracking-[-0.05em] text-white">
          {atmosphere.replaceAll('_', ' ')}
        </h2>

        <p className="mt-5 text-lg leading-8 text-white/65">
          {description}
        </p>
      </div>
    </section>
  )
}
