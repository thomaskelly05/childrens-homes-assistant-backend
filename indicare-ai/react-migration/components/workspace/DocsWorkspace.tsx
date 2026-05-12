"use client"

const templates=[
  'Supervision template',
  'SCCIF evidence',
  'Reg 44 response',
  'Meeting minutes',
  'Safeguarding chronology'
]

export function DocsWorkspace(){
  return (
    <section style={{display:'grid',gridTemplateColumns:'320px minmax(0,1fr)',gap:22,padding:'42px 42px 180px',height:'100%'}}>
      <aside className='glass' style={{borderRadius:32,padding:24,overflow:'auto'}}>
        <h2 style={{margin:'0 0 20px',fontSize:32}}>Templates</h2>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {templates.map(template=>(
            <button
              key={template}
              className='glass'
              style={{padding:'18px 20px',borderRadius:22,color:'white',textAlign:'left'}}>
              {template}
            </button>
          ))}
        </div>
      </aside>

      <main className='glass' style={{borderRadius:32,padding:32,display:'flex',flexDirection:'column'}}>
        <input
          defaultValue='Untitled professional document'
          style={{background:'transparent',border:'none',outline:'none',fontSize:44,fontWeight:900,color:'white',marginBottom:22}}
        />

        <textarea
          placeholder='Start writing...'
          style={{flex:1,background:'transparent',border:'none',outline:'none',resize:'none',color:'#e2e8f0',fontSize:18,lineHeight:1.9}}
        />

        <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:18}}>
          {['Improve','Professional tone','Safeguarding review','Export'].map(action=>(
            <button key={action} className='glass' style={{padding:'12px 18px',borderRadius:999,color:'white'}}>{action}</button>
          ))}
        </div>
      </main>
    </section>
  )
}
