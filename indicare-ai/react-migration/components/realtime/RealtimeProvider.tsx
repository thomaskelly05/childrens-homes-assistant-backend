"use client"

import { createContext,useContext,useEffect,useMemo,useState } from 'react'
import { realtimeConfig,realtimeSession } from '../../lib/api'

type RealtimeContextType={
configured:boolean
provider:string
sessionReady:boolean
loading:boolean
}

const RealtimeContext=createContext<RealtimeContextType>({
configured:false,
provider:'fallback',
sessionReady:false,
loading:true
})

export function RealtimeProvider({children}:{children:React.ReactNode}){
  const [configured,setConfigured]=useState(false)
  const [provider,setProvider]=useState('fallback')
  const [sessionReady,setSessionReady]=useState(false)
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    let mounted=true

    async function boot(){
      try{
        const config=await realtimeConfig()

        if(!mounted)return

        setConfigured(!!config?.configured)
        setProvider(config?.provider||'fallback')

        if(config?.configured){
          await realtimeSession({mode:'voice'})
          if(mounted)setSessionReady(true)
        }
      }catch(e){
        if(mounted){
          setConfigured(false)
          setSessionReady(false)
        }
      }finally{
        if(mounted)setLoading(false)
      }
    }

    boot()

    return ()=>{mounted=false}
  },[])

  const value=useMemo(()=>({configured,provider,sessionReady,loading}),[configured,provider,sessionReady,loading])

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime(){
  return useContext(RealtimeContext)
}
