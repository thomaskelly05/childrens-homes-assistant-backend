"use client"

import { useState } from 'react'
import { safeAssistant } from '../../lib/api'
import { useRuntime } from '../../lib/store'

export function Composer(){
  const [loading,setLoading]=useState(false)
  const [value,setValue]=useState('')

  const messages=useRuntime(s=>s.messages)
  const addMessage=useRuntime(s=>s.addMessage)

  async function send(){
    const text=value.trim()
    if(!text||loading)return

    setValue('')
    addMessage({role:'user',content:text})
    setLoading(true)

    try{
      const response=await safeAssistant(text,messages)
      addMessage({role:'assistant',content:response})
    }catch(e:any){
      addMessage({role:'assistant',content:e?.message||'Connection issue'})
    }finally{
      setLoading(false)
    }
  }

  return (
    <div style={{position:'absolute',left:0,right:0,bottom:0,padding:'28px 40px',background:'linear-gradient(180deg,rgba(2,6,23,0),#020617 42%)'}}>
      <div className='glass' style={{maxWidth:1100,margin:'0 auto',borderRadius:34,padding:18}}>
        <textarea
          value={value}
          onChange={(e)=>setValue(e.target.value)}
          placeholder='Message IndiCare AI...'
          style={{width:'100%',minHeight:88,background:'transparent',border:'none',outline:'none',resize:'none',color:'white',fontSize:18}}
        />

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
          <div style={{display:'flex',gap:10}}>
            <button className='glass' style={{padding:'12px 16px',borderRadius:999,color:'white'}}>Upload</button>
            <button className='glass' style={{padding:'12px 16px',borderRadius:999,color:'white'}}>Voice</button>
          </div>

          <button
            onClick={send}
            disabled={loading}
            style={{padding:'14px 22px',borderRadius:999,border:'none',background:'#2563eb',color:'white',fontWeight:800}}>
            {loading?'Thinking...':'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
