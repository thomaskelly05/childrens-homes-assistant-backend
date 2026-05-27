'use client'

import { useState } from 'react'

import { OrbCaptionLayer } from './orb-caption-layer'
import { OrbControlRing } from './orb-control-ring'

export function OrbInteractionLayer({
  captionText,
  onListen,
  onInterrupt,
  onSendText
}: {
  captionText?: string
  onListen?: () => void
  onInterrupt?: () => void
  onSendText?: (text: string) => void
}) {
  const [captions, setCaptions] = useState(false)
  const [typed, setTyped] = useState(false)
  const [input, setInput] = useState('')

  function sendTyped() {
    const message = input.trim()
    if (!message || !onSendText) return
    setInput('')
    onSendText(message)
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <OrbCaptionLayer enabled={captions} text={captionText} />
      {typed ? (
        <form className="flex w-full max-w-xl gap-2" onSubmit={(event) => { event.preventDefault(); sendTyped() }}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Type to ORB</span>
            <input value={input} onChange={(event) => setInput(event.target.value)} className="orb-input min-h-12 w-full px-5 text-sm font-semibold text-white outline-none placeholder:text-slate-400" placeholder="Type to ORB..." />
          </label>
          <button type="submit" disabled={!input.trim() || !onSendText} className="orb-primary-action rounded-full px-5 text-sm font-black disabled:opacity-50">Send</button>
        </form>
      ) : null}
      <OrbControlRing onListen={onListen} onInterrupt={onInterrupt} onCaptions={() => setCaptions((value) => !value)} onType={() => setTyped((value) => !value)} />
    </div>
  )
}

