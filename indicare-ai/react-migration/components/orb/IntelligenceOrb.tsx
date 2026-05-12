"use client"

import { motion } from 'framer-motion'

type Props={
listening?:boolean
thinking?:boolean
speaking?:boolean
onClick?:()=>void
}

export function IntelligenceOrb({listening,thinking,speaking,onClick}:Props){
  const label=speaking?'Speaking':thinking?'Thinking':listening?'Listening':'Start'

  return (
    <motion.button
      onClick={onClick}
      whileTap={{scale:.96}}
      animate={{scale:listening?[1,1.05,1]:1}}
      transition={{repeat:listening?Infinity:0,duration:2.8}}
      style={{
        width:320,
        height:320,
        borderRadius:'999px',
        border:'none',
        cursor:'pointer',
        position:'relative',
        background:'radial-gradient(circle at 30% 30%,#bae6fd,#38bdf8 38%,#2563eb 72%,#1e3a8a)',
        boxShadow:listening?'0 0 220px rgba(56,189,248,.75)':'0 0 180px rgba(56,189,248,.45)',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        color:'white',
        fontWeight:900,
        fontSize:36
      }}>
      <motion.div
        animate={{opacity:[.3,.8,.3],scale:[1,1.12,1]}}
        transition={{repeat:Infinity,duration:4}}
        style={{
          position:'absolute',
          inset:-20,
          borderRadius:'999px',
          border:'1px solid rgba(255,255,255,.12)'
        }}
      />
      <span>{label}</span>
    </motion.button>
  )
}
