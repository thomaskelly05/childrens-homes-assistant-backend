"use client"

import { useEffect,useRef,useState } from 'react'
import { IndiCareRealtimeWebRTC } from '../lib/realtime-webrtc'

export function useRealtimeVoice(){
  const clientRef=useRef<IndiCareRealtimeWebRTC | null>(null)

  const [connected,setConnected]=useState(false)
  const [state,setState]=useState<'idle'|'listening'|'thinking'|'speaking'>('idle')

  useEffect(()=>{
    clientRef.current=new IndiCareRealtimeWebRTC()

    const voiceHandler=(event:any)=>{
      const detail=event?.detail||{}

      if(detail.state==='listening')setState('listening')
      if(detail.state==='thinking')setState('thinking')
      if(detail.state==='speaking')setState('speaking')
      if(detail.state==='spoken'||detail.state==='idle')setState('idle')
    }

    window.addEventListener('indicare:voice',voiceHandler)

    return ()=>{
      window.removeEventListener('indicare:voice',voiceHandler)
      clientRef.current?.disconnect()
    }
  },[])

  async function start(){
    try{
      setConnected(false)

      await clientRef.current?.connect()

      setConnected(true)

      if(window?.IndiCareIntelligenceLive){
        window.IndiCareIntelligenceLive.start()
      }
    }catch(e){
      setConnected(false)
    }
  }

  function stop(){
    clientRef.current?.disconnect()

    if(window?.IndiCareIntelligenceLive){
      window.IndiCareIntelligenceLive.stop()
    }

    setConnected(false)
    setState('idle')
  }

  return {
    connected,
    state,
    start,
    stop,
    listening:state==='listening',
    thinking:state==='thinking',
    speaking:state==='speaking'
  }
}
