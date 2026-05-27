import { Accessibility } from 'lucide-react'

export function OrbAccessibilityToggle({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="orb-quiet-action inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-black text-white">
      <Accessibility className="h-4 w-4" aria-hidden />
      Accessibility
    </button>
  )
}

