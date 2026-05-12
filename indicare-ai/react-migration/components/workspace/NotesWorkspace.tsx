"use client"

export function NotesWorkspace(){
  return (
    <section style={{display:'grid',gridTemplateColumns:'360px minmax(0,1fr)',gap:22,padding:'42px 42px 180px',height:'100%'}}>
      <aside className='glass' style={{borderRadius:32,padding:28,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div className='orb orb-animate' style={{width:140,height:140,marginBottom:28}} />
        <h2 style={{fontSize:38,margin:'0 0 12px'}}>Voice-aware notes</h2>
        <p style={{color:'#cbd5e1',textAlign:'center',lineHeight:1.8}}>Capture rough thoughts and transform them into professional operational documents.</p>
      </aside>

      <main className='glass' style={{borderRadius:32,padding:28,display:'flex',flexDirection:'column'}}>
        <textarea
          placeholder='Rough notes...'
          style={{flex:1,background:'transparent',border:'none',outline:'none',resize:'none',color:'white',fontSize:18,lineHeight:1.8}}
        />

        <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:18}}>
          {['Summary','Supervision','Minutes','Care review','Handover'].map(action=>(
            <button key={action} className='glass' style={{padding:'12px 18px',borderRadius:999,color:'white'}}>{action}</button>
          ))}
        </div>
      </main>
    </section>
  )
}
