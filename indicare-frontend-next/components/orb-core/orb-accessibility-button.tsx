import { Accessibility } from 'lucide-react'

export function OrbAccessibilityButton({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/15">
      <Accessibility className="h-4 w-4" aria-hidden />
      Accessibility
    </button>
  )
}

