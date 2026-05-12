"use client"

import { useRealtime } from '../realtime/RealtimeProvider'

export function RealtimeStatus(){
  const realtime=useRealtime()

  const label=realtime.loading
    ? 'Connecting realtime runtime'
    : realtime.sessionReady
      ? `Realtime active · ${realtime.provider}`
      : 'Fallback conversational runtime'

  return (
    <div
      className='glass'
      style={{
        position:'absolute',
        top:24,
        right:24,
        borderRadius:999,
        padding:'12px 18px',
        color:'white',
        fontSize:14,
        fontWeight:700,
        zIndex:40
      }}>
      {label}
    </div>
  )
}
