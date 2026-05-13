type AssistantWaveformProps = {
  active?: boolean
}

export function AssistantWaveform({
  active = false
}: AssistantWaveformProps) {
  return (
    <div className="flex items-end gap-1.5">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className={`w-1.5 rounded-full bg-emerald-400 transition-all duration-300 ${active ? 'animate-pulse' : 'opacity-30'}`}
          style={{
            height: `${12 + ((index % 5) + 1) * 8}px`
          }}
        />
      ))}
    </div>
  )
}
