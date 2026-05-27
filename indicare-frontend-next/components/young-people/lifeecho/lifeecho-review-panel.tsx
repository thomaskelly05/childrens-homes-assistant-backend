import { LifeEchoSuggestionCard } from '@/components/young-people/lifeecho/lifeecho-suggestion-card'

export function LifeEchoReviewPanel({
  childId,
  suggestions
}: {
  childId: string
  suggestions: Array<Record<string, unknown>>
}) {
  if (!suggestions.length) {
    return (
      <p data-testid="lifeecho-review-panel" className="text-sm text-slate-500">
        No memory suggestions pending for child {childId}.
      </p>
    )
  }

  return (
    <section data-testid="lifeecho-review-panel" className="space-y-3">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-amber-800">Suggested memories</h2>
      {suggestions.map((suggestion, index) => (
        <LifeEchoSuggestionCard key={String(suggestion.id || index)} suggestion={suggestion} />
      ))}
    </section>
  )
}
