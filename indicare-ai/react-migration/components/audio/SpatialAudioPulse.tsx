"use client"

import { motion } from 'framer-motion'

export function SpatialAudioPulse({active=false}:{active?:boolean}){
  return (
    <div style={{position:'absolute',inset:0,display:'flex',alignItems':'center',justifyContent':'center',pointerEvents':'none'}}>
      {[0,1,2].map((ring)=>(
        <motion.div
          key={ring}
          animate={{scale:active?[1,1.45,1.9]:1,opacity:active?[0.55,0.15,0]:0}}
          transition={{repeat:Infinity,duration:3,delay:ring*.4,ease:'easeOut'}}
          style={{
            position:'absolute',
            width:420 + ring*90,
            height:420 + ring*90,
            borderRadius:'999px',
            border:'1px solid rgba(125,211,252,.28)'
          }}
        />
      ))}
    </div>
  )
}
