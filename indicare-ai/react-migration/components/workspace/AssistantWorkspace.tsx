"use client"

import { useRuntime } from '../../lib/store'

export function AssistantWorkspace(){
  const messages=useRuntime(s=>s.messages)

  return (
    <section style={{flex:1,overflow:'auto',padding:'80px 60px 180px',position:'relative'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        {!messages.length&&(
          <div style={{textAlign:'center',marginTop:'10vh'}}>
            <div className='orb orb-animate' style={{width:120,height:120,margin:'0 auto 32px'}} />
            <h1 style={{fontSize:84,fontWeight:900,letterSpacing:'-0.08em',margin:'0 0 18px'}}>Think, write and work naturally.</h1>
            <p style={{fontSize:24,color:'#cbd5e1'}}>Professional AI support for residential care leadership and operational practice.</p>
          </div>
        )}

        {!!messages.length&&messages.map((message,index)=>(
          <article key={index} style={{display:'flex',gap:18,marginBottom:28}}>
            <div style={{width:48,height:48,borderRadius:18,background:message.role==='assistant'?'rgba(255,255,255,.08)':'#2563eb'}} />
            <div className='glass' style={{padding:24,borderRadius:28,maxWidth:'80%'}}>
              <strong style={{display:'block',marginBottom:10}}>{message.role==='assistant'?'IndiCare':'You'}</strong>
              <p style={{margin:0,lineHeight:1.8,color:'#e2e8f0'}}>{message.content}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
