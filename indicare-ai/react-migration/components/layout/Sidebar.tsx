"use client"

import { useRuntime } from '../../lib/store'

const items=['assistant','connect','notes','docs','intelligence']

export function Sidebar(){
  const mode=useRuntime(s=>s.mode)
  const setMode=useRuntime(s=>s.setMode)

  return (
    <aside style={{width:320,padding:20,borderRight:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',backdropFilter:'blur(28px)',display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:14,alignItems:'center'}}>
        <div style={{width:56,height:56,borderRadius:18,background:'linear-gradient(135deg,#38bdf8,#2563eb)'}} />
        <div>
          <h2 style={{margin:0}}>IndiCare AI</h2>
          <p style={{margin:'4px 0 0',color:'#94a3b8'}}>Residential care professional</p>
        </div>
      </div>

      <button style={{padding:16,borderRadius:18,border:'none',background:'#2563eb',color:'#fff',fontWeight:800}}>+ New conversation</button>

      <nav style={{display:'flex',flexDirection:'column',gap:8}}>
        {items.map(item=>(
          <button
            key={item}
            onClick={()=>setMode(item)}
            style={{
              textAlign:'left',
              padding:16,
              borderRadius:18,
              border:'1px solid rgba(255,255,255,.08)',
              background:mode===item?'rgba(37,99,235,.28)':'rgba(255,255,255,.03)',
              color:'white'
            }}>
            <strong style={{textTransform:'capitalize'}}>{item}</strong>
          </button>
        ))}
      </nav>
    </aside>
  )
}
