"use client"

import { Sidebar } from './Sidebar'
import { Composer } from '../composer/Composer'
import { AssistantWorkspace } from '../workspace/AssistantWorkspace'
import { VoicePresence } from '../voice/VoicePresence'
import { ConnectWorkspace } from '../workspace/ConnectWorkspace'
import { NotesWorkspace } from '../workspace/NotesWorkspace'
import { DocsWorkspace } from '../workspace/DocsWorkspace'
import { RuntimeTelemetry } from '../observability/RuntimeTelemetry'
import { useRuntime } from '../../lib/store'

export function AppShell(){
  const mode=useRuntime(s=>s.mode)

  function workspace(){
    if(mode==='connect')return <ConnectWorkspace />
    if(mode==='notes')return <NotesWorkspace />
    if(mode==='docs')return <DocsWorkspace />
    if(mode==='intelligence')return <VoicePresence />
    return <AssistantWorkspace />
  }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#020617',color:'white'}}>
      <Sidebar />

      <main style={{flex:1,position:'relative',overflow:'hidden'}}>
        <header style={{height:88,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 32px',borderBottom:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',backdropFilter:'blur(24px)'}}>
          <div>
            <div style={{fontSize:12,fontWeight:900,letterSpacing:'.12em',color:'#93c5fd'}}>INDICARE INTELLIGENCE</div>
            <h1 style={{margin:'6px 0 0',fontSize:28,textTransform:'capitalize'}}>{mode}</h1>
          </div>

          <div style={{display:'flex',gap:12}}>
            <button className='glass' style={{padding:'12px 18px',borderRadius:999,color:'white'}}>New thread</button>
            <button className='glass' style={{padding:'12px 18px',borderRadius:999,color:'white'}}>Save action</button>
          </div>
        </header>

        {workspace()}

        {mode!=='intelligence'&&<Composer />}

        <RuntimeTelemetry />
      </main>
    </div>
  )
}
