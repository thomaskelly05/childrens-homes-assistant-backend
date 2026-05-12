"use client"

import { useRuntime } from '../../lib/store'

export function SessionContinuityBanner(){
  const messages=useRuntime(s=>s.messages)

  const summary=messages.length
    ? `Conversation continuity active · ${messages.length} conversational events retained`
    : 'New conversational session ready'

  return (
    <div
      className='glass'
      style={{
        position:'absolute',
        top:108,
        left:'50%',
        transform:'translateX(-50%)',
        borderRadius:999,
        padding:'12px 20px',
        color:'white',
        fontSize:14,
        zIndex:50
      }}>
      {summary}
    </div>
  )
}
