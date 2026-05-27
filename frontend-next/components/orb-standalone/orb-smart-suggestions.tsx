'use client'

import { suggestionsForMode } from '@/lib/orb/residential-agents'

export function OrbSmartSuggestions({
  mode,
  onSelect,
  disabled
}: {
  mode: string
  onSelect: (text: string) => void
  disabled?: boolean
}) {
  const suggestions = suggestionsForMode(mode)
  if (!suggestions.length) return null

  return (
    <div
      className="mx-auto mb-2 flex w-full max-w-[var(--orb-composer-max,53.125rem)] gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-orb-smart-suggestions
    >
      {suggestions.map((text) => (
        <button
          key={text}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(text)}
          className="shrink-0 rounded-full border border-[#93C5FD] bg-[#F8FCFF] px-3 py-1.5 text-xs font-semibold text-[#075985] transition hover:border-[#7DD3FC] hover:bg-[#E0F2FE] hover:text-[#0369A1] disabled:opacity-40"
        >
          {text}
        </button>
      ))}
    </div>
  )
}
