'use client'

import { useState } from 'react'

import { OrbCaptionLayer } from './orb-caption-layer'
import { OrbControlRing } from './orb-control-ring'

export function OrbInteractionLayer({ captionText }: { captionText?: string }) {
  const [captions, setCaptions] = useState(false)
  const [typed, setTyped] = useState(false)

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <OrbCaptionLayer enabled={captions} text={captionText} />
      {typed ? (
        <label className="w-full max-w-xl">
          <span className="sr-only">Type to ORB</span>
          <input className="min-h-12 w-full rounded-full border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white outline-none placeholder:text-slate-400" placeholder="Type to ORB..." />
        </label>
      ) : null}
      <OrbControlRing onCaptions={() => setCaptions((value) => !value)} onType={() => setTyped((value) => !value)} />
    </div>
  )
}

