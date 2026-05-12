"use client"

import { useEffect } from 'react'

export function ConversationChime(){
  useEffect(()=>{
    function handler(){
      console.log('conversation-active')
    }

    window.addEventListener('indicare:conversation-start',handler)

    return ()=>window.removeEventListener('indicare:conversation-start',handler)
  },[])

  return null
}
