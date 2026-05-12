"use client"

import { useEffect,useState } from 'react'

export function RuntimeTelemetry(){
  const [metrics,setMetrics]=useState({
    latency:'--',
    voice:'idle',
    realtime:'offline'
  })

  useEffect(()=>{
    const handler=(event:any)=>{
      const detail=event?.detail||{}

      setMetrics((m)=>(
        {
          ...m,
          voice:detail.state||m.voice,
          latency:detail.latency||m.latency
        }
      ))
    }

    window.addEventListener('indicare:voice',handler)

    return ()=>window.removeEventListener('indicare:voice',handler)
  },[])

  return (
    <div className='glass' style={{position:'fixed',bottom:24,right:24,padding:18,borderRadius:24,minWidth:220,zIndex:100}}>
      <div style={{fontSize:12,letterSpacing:'.12em',color:'#93c5fd',fontWeight:900,marginBottom:12}}>RUNTIME TELEMETRY</div>
      <div style={{display:'grid',gap:10}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Voice</span><strong>{metrics.voice}</strong></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Realtime</span><strong>{metrics.realtime}</strong></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Latency</span><strong>{metrics.latency}</strong></div>
      </div>
    </div>
  )
}
