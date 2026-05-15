import { Accessibility } from 'lucide-react'

export function OrbAccessibilityToggle({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-sm font-black text-white">
      <Accessibility className="h-4 w-4" aria-hidden />
      Accessibility
    </button>
  )
}

