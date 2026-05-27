type AssistantStatusBarProps = {
  connected: boolean
  listening: boolean
  speaking: boolean
  streaming: boolean
  error?: string
}

export function AssistantStatusBar({
  connected,
  listening,
  speaking,
  streaming,
  error
}: AssistantStatusBarProps) {
  const status = error
    ? 'Runtime issue detected'
    : listening
      ? 'Listening'
      : speaking || streaming
        ? 'Responding'
        : connected
          ? 'Ready'
          : 'Offline'

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 backdrop-blur-xl">
      <div
        className={`h-2.5 w-2.5 rounded-full ${error ? 'bg-amber-400' : connected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]' : 'bg-red-400'}`}
      />

      <span>{status}</span>
    </div>
  )
}
