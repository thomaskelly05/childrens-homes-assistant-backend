import { Captions, Keyboard, Mic, Pause } from 'lucide-react'

export function OrbControlRing({
  onListen,
  onInterrupt,
  onCaptions,
  onType
}: {
  onListen?: () => void
  onInterrupt?: () => void
  onCaptions?: () => void
  onType?: () => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <button type="button" onClick={onListen} className="orb-primary-action min-h-12 rounded-full px-5 text-sm font-black">
        <Mic className="mr-2 inline h-4 w-4" aria-hidden />
        Listen
      </button>
      <button type="button" onClick={onInterrupt} className="orb-quiet-action min-h-12 rounded-full px-5 text-sm font-black text-white">
        <Pause className="mr-2 inline h-4 w-4" aria-hidden />
        Interrupt
      </button>
      <button type="button" onClick={onCaptions} className="orb-quiet-action min-h-12 rounded-full px-5 text-sm font-black text-white">
        <Captions className="mr-2 inline h-4 w-4" aria-hidden />
        Captions
      </button>
      <button type="button" onClick={onType} className="orb-quiet-action min-h-12 rounded-full px-5 text-sm font-black text-white">
        <Keyboard className="mr-2 inline h-4 w-4" aria-hidden />
        Type
      </button>
    </div>
  )
}

