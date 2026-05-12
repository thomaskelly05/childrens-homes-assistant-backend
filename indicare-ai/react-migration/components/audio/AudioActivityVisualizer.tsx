"use client"

import { motion } from 'framer-motion'

export function AudioActivityVisualizer({active=false}:{active?:boolean}){
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:72}}>
      {[0,1,2,3,4].map((bar)=>(
        <motion.div
          key={bar}
          animate={{height:active?[18,64,26,54,18][bar]:14,opacity:active?1:.45}}
          transition={{repeat:Infinity,duration:0.9,repeatType:'mirror',delay:bar*.08}}
          style={{width:10,borderRadius:999,background:'linear-gradient(180deg,#7dd3fc,#2563eb)'}}
        />
      ))}
    </div>
  )
}
