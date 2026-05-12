export type AssistantMessage={role:'user'|'assistant';content:string}

export async function safeAssistant(message:string,history:AssistantMessage[]=[]){
  const response=await fetch('/assistant/general-safe',{
    method:'POST',
    credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message,history})
  })
  if(!response.ok)throw new Error(`Assistant request failed: ${response.status}`)
  const data=await response.json()
  return data.answer||data.response||'Ready.'
}

export async function realtimeConfig(){
  const response=await fetch('/assistant/realtime/config',{credentials:'include'})
  if(!response.ok)return {configured:false,provider:'fallback'}
  return response.json()
}

export async function realtimeSession(payload:Record<string,unknown>={}){
  const response=await fetch('/assistant/realtime/session',{
    method:'POST',
    credentials:'include',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  })
  if(!response.ok)throw new Error(`Realtime session failed: ${response.status}`)
  return response.json()
}

export async function assistantSystem(){
  const response=await fetch('/assistant/system',{credentials:'include'})
  if(!response.ok)return null
  return response.json()
}
