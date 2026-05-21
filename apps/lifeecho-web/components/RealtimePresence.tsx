'use client'

import { useEffect, useState } from 'react'

export function RealtimePresence() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setConnected(true)
    }, 1200)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-full border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-2xl">
      <div className="flex items-center gap-3 text-sm text-white/70">
        <span
          className={`h-2 w-2 rounded-full ${
            connected
              ? 'bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]'
              : 'bg-yellow-300 shadow-[0_0_18px_rgba(253,224,71,0.9)]'
          }`}
        />

        {connected
          ? 'LifeEcho realtime connected'
          : 'Connecting emotional presence'}
      </div>
    </div>
  )
}
