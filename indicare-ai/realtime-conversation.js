(function(){
  if(window.__IndiCareRealtimeInstalled)return;
  window.__IndiCareRealtimeInstalled=true;

  var state={connected:false,listening:false,speaking:false,thinking:false,lastActivity:0,queue:[]};
  var listeners=[];

  function emit(type,detail){
    listeners.forEach(function(fn){try{fn(type,detail||{});}catch(e){}});
    window.dispatchEvent(new CustomEvent('indicare:realtime',{detail:Object.assign({type:type},detail||{})}));
  }

  function set(partial){
    state=Object.assign({},state,partial,{lastActivity:Date.now()});
    emit('state',state);
    document.body.classList.toggle('ai-live-connected',!!state.connected);
    document.body.classList.toggle('ai-live-listening',!!state.listening);
    document.body.classList.toggle('ai-live-speaking',!!state.speaking);
    document.body.classList.toggle('ai-live-thinking',!!state.thinking);
  }

  function connect(){
    set({connected:true,thinking:false});
    return Promise.resolve(true);
  }

  function disconnect(){
    set({connected:false,listening:false,speaking:false,thinking:false});
  }

  function listen(active){
    set({listening:!!active});
  }

  function think(active){
    set({thinking:!!active});
  }

  function speak(active){
    set({speaking:!!active});
  }

  function pushTranscript(role,text){
    state.queue.push({role:role,text:text,ts:Date.now()});
    if(state.queue.length>40)state.queue.shift();
    emit('transcript',{role:role,text:text,history:state.queue.slice()});
  }

  function subscribe(fn){
    listeners.push(fn);
    return function(){listeners=listeners.filter(function(x){return x!==fn;});};
  }

  window.IndiCareRealtime={connect:connect,disconnect:disconnect,listen:listen,think:think,speak:speak,pushTranscript:pushTranscript,subscribe:subscribe,getState:function(){return state;}};
})();
