export function useRealtimeVoice(){
  return {
    connected:false,
    state:'idle',
    start:()=>{},
    stop:()=>{},
    listening:false,
    thinking:false,
    speaking:false
  }
}
