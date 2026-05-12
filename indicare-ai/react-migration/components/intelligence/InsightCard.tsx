"use client"

export function InsightCard(){
  return (
    <div className='glass' style={{position:'absolute',left:32,bottom:32,padding:22,borderRadius:28,maxWidth:360,zIndex:20}}>
      <div style={{fontSize:12,fontWeight:900,letterSpacing:'.12em',color:'#93c5fd',marginBottom:12}}>LIVE INSIGHT</div>
      <h3 style={{margin:'0 0 10px',fontSize:24}}>Conversation continuity active</h3>
      <p style={{margin:0,color:'#cbd5e1',lineHeight:1.7}}>
        Runtime maintaining contextual continuity across interactions.
      </p>
    </div>
  )
}
