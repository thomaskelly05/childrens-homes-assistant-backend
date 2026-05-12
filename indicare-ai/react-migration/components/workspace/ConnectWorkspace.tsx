"use client"

const cards=[
  ['Mail Intelligence','Draft replies, summarise threads and extract actions.'],
  ['Teams Intelligence','Turn conversations into clear operational actions.'],
  ['Calendar Intelligence','Prepare meetings, follow-ups and supervision prompts.'],
  ['Calls Intelligence','Capture call outcomes and next steps.']
]

export function ConnectWorkspace(){
  return (
    <section style={{padding:'64px 56px 180px',height:'100%',overflow:'auto'}}>
      <div style={{maxWidth:1200,margin:'0 auto'}}>
        <h1 style={{fontSize:72,letterSpacing:'-.07em',margin:'0 0 16px'}}>Connect</h1>
        <p style={{fontSize:22,color:'#cbd5e1',maxWidth:760}}>Email, calls, meetings and calendar intelligence in one professional communication workspace.</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:18,marginTop:42}}>
          {cards.map(([title,body])=>(
            <article key={title} className='glass' style={{borderRadius:30,padding:28,minHeight:190}}>
              <h2 style={{margin:'0 0 12px',fontSize:28}}>{title}</h2>
              <p style={{margin:0,color:'#cbd5e1',lineHeight:1.7}}>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
