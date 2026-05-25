'use client'

type Props = {
  reviews: Array<Record<string, unknown>>
  onSelect: (reviewId: string) => void
}

export function Reg45ReviewHistory({ reviews, onSelect }: Props) {
  if (!reviews.length) return null
  return (
    <section data-testid="reg45-review-history" className="space-y-3">
      <h2 className="text-lg font-black text-slate-950">Review history</h2>
      <ul className="space-y-2">
        {reviews.map((r) => {
          const id = String(r.id || '')
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:border-blue-200"
              >
                <span className="font-black">{String(r.title || 'Draft review')}</span>
                <span className="ml-2 text-[10px] uppercase text-slate-400">{String(r.status || 'draft')}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
