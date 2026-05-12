import { create } from 'zustand'

type Message={role:'user'|'assistant',content:string}

type RuntimeStore={
mode:string
voice:boolean
messages:Message[]
setMode:(mode:string)=>void
toggleVoice:()=>void
addMessage:(message:Message)=>void
}

export const useRuntime=create<RuntimeStore>((set)=>(
{
mode:'assistant',
voice:false,
messages:[],
setMode:(mode)=>set({mode}),
toggleVoice:()=>set((s)=>({voice:!s.voice})),
addMessage:(message)=>set((s)=>({messages:[...s.messages,message]}))
}
))