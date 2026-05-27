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
      <button type="button" onClick={onListen} disabled={!onListen} className="orb-primary-action min-h-12 rounded-full px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50">
        <Mic className="mr-2 inline h-4 w-4" aria-hidden />
        Listen
      </button>
      <button type="button" onClick={onInterrupt} disabled={!onInterrupt} className="orb-quiet-action min-h-12 rounded-full px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
        <Pause className="mr-2 inline h-4 w-4" aria-hidden />
        Interrupt
      </button>
      <button type="button" onClick={onCaptions} disabled={!onCaptions} className="orb-quiet-action min-h-12 rounded-full px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
        <Captions className="mr-2 inline h-4 w-4" aria-hidden />
        Captions
      </button>
      <button type="button" onClick={onType} disabled={!onType} className="orb-quiet-action min-h-12 rounded-full px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
        <Keyboard className="mr-2 inline h-4 w-4" aria-hidden />
        Type
      </button>
    </div>
  )
}

