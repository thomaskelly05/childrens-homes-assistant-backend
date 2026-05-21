type Props = {
  samples: number[]
}

export function WaveformVisualizer({ samples }: Props) {
  return (
    <div className="flex h-24 items-end gap-1 rounded-3xl border border-white/10 bg-black/20 p-4">
      {samples.map((sample, index) => (
        <div
          key={`${sample}-${index}`}
          className="w-full rounded-full bg-sky-300/80 shadow-[0_0_12px_rgba(125,211,252,0.55)]"
          style={{
            height: `${Math.max(sample * 100, 6)}%`,
          }}
        />
      ))}
    </div>
  )
}
