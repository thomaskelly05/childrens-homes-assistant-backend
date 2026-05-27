export function AssistantTypingIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-[28px] bg-[#151c31] px-5 py-4 text-slate-300 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-300 [animation-delay:-0.3s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-300 [animation-delay:-0.15s]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-300" />
      </div>

      <span className="text-sm font-medium">IndiCare is thinking...</span>
    </div>
  )
}
