type AssistantEmptyStateProps = {
  onPromptSelect?: (prompt: string) => void
}

const starterPrompts = [
  'Summarise safeguarding concerns from this week',
  'Create an evening handover overview',
  'Identify chronology patterns for manager review',
  'What incidents require immediate escalation?'
]

export function AssistantEmptyState({
  onPromptSelect
}: AssistantEmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-5 py-2 text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
        IndiCare Intelligence
      </div>

      <h2 className="mt-8 text-5xl font-black tracking-[-0.06em] text-white">
        Your operational AI companion
      </h2>

      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
        Unified conversational intelligence for safeguarding, chronology,
        care planning, shift handovers and operational oversight.
      </p>

      <div className="mt-12 grid w-full gap-4 md:grid-cols-2">
        {starterPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptSelect?.(prompt)}
            className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-left transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
          >
            <div className="text-sm font-bold leading-7 text-white">
              {prompt}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
