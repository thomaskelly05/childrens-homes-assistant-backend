"use client"

import { useEffect,useState } from 'react'
import { IntelligenceOrb } from '../orb/IntelligenceOrb'
import { RealtimeStatus } from './RealtimeStatus'
import { AudioActivityVisualizer } from '../audio/AudioActivityVisualizer'
import { useRuntime } from '../../lib/store'

export function VoicePresence(){
  const voice=useRuntime(s=>s.voice)
  const toggleVoice=useRuntime(s=>s.toggleVoice)
  const [state,setState]=useState<'idle'|'listening'|'thinking'|'speaking'>('idle')

  useEffect(()=>{
    const handler=(event:any)=>{
      const detail=event?.detail||{}
      if(detail.state==='listening')setState('listening')
      if(detail.state==='thinking')setState('thinking')
      if(detail.state==='speaking')setState('speaking')
      if(detail.state==='spoken'||detail.state==='idle')setState(voice?'listening':'idle')
    }

    window.addEventListener('indicare:voice',handler)
    return ()=>window.removeEventListener('indicare:voice',handler)
  },[voice])

  function toggle(){
    toggleVoice()

    if(window?.IndiCareIntelligenceLive){
      if(!voice)window.IndiCareIntelligenceLive.start()
      else window.IndiCareIntelligenceLive.stop()
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',position:'relative'}}>
      <RealtimeStatus />

      <div style={{display:'flex',gap:12,marginBottom:32,flexWrap:'wrap',justifyContent:'center'}}>
        <div className='glass' style={{padding:'10px 16px',borderRadius:999}}>Realtime conversational</div>
        <div className='glass' style={{padding:'10px 16px',borderRadius:999}}>Continuous listening</div>
        <div className='glass' style={{padding:'10px 16px',borderRadius:999}}>British female voice</div>
      </div>

      <AudioActivityVisualizer active={state==='listening'||state==='speaking'} />

      <div style={{margin:'36px 0'}}>
        <IntelligenceOrb
          listening={state==='listening'}
          thinking={state==='thinking'}
          speaking={state==='speaking'}
          onClick={toggle}
        />
      </div>

      <h1 style={{fontSize:72,fontWeight:900,margin:'24px 0 12px'}}>Talk naturally</h1>

      <p style={{fontSize:22,color:'#cbd5e1',maxWidth:760,textAlign:'center',lineHeight:1.7}}>
        Presence-led conversational intelligence for residential care professionals.
      </p>
    </div>
  )
}
