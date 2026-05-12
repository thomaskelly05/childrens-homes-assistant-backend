export class ReconnectOrchestrator {
  constructor({connect=async()=>{},maxRetries=10,baseDelay=1000,onStateChange=()=>{}}={}){
    this.connectFn=connect
    this.maxRetries=maxRetries
    this.baseDelay=baseDelay
    this.onStateChange=onStateChange
    this.retryCount=0
    this.connected=false
    this.reconnecting=false
  }

  async connectedState(){
    this.connected=true
    this.reconnecting=false
    this.retryCount=0
    this.onStateChange('connected')
  }

  async disconnectedState(){
    if(this.reconnecting)return

    this.connected=false
    this.reconnecting=true

    this.onStateChange('reconnecting')

    while(this.retryCount<this.maxRetries&&!this.connected){
      try{
        const delay=this.baseDelay*Math.max(1,this.retryCount+1)
        await new Promise(resolve=>setTimeout(resolve,delay))

        await this.connectFn()

        this.connected=true
        this.reconnecting=false
        this.retryCount=0

        this.onStateChange('reconnected')

        return
      }catch(error){
        this.retryCount++
        this.onStateChange('retry-failed',error)
      }
    }

    this.reconnecting=false
    this.onStateChange('failed')
  }

  reset(){
    this.retryCount=0
    this.connected=false
    this.reconnecting=false
  }
}
