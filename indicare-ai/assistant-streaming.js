(function(){
  if(window.__IndiCareAIStreamingInstalled) return;
  window.__IndiCareAIStreamingInstalled=true;

  function mode(){
    return localStorage.getItem('ic.ai.mode') || document.querySelector('.ai-rail nav button.active')?.dataset?.mode || 'assistant';
  }

  function ensureLiveBubble(){
    var feed=document.querySelector('.voice-transcript,.ai-feed');
    if(!feed) return null;
    var row=document.getElementById('icLiveStreamingAnswer');
    if(row) return row.querySelector('p');
    row=document.createElement('article');
    row.id='icLiveStreamingAnswer';
    row.className='ai-message assistant live-streaming';
    row.innerHTML='<div>AI</div><p></p>';
    feed.appendChild(row);
    feed.scrollTop=feed.scrollHeight;
    return row.querySelector('p');
  }

  function parseSse(buffer,onToken,onMeta){
    var parts=buffer.split('\n\n');
    var rest=parts.pop()||'';
    parts.forEach(function(part){
      var event='message';
      var data=[];
      part.split('\n').forEach(function(line){
        if(line.indexOf('event:')===0) event=line.slice(6).trim();
        if(line.indexOf('data:')===0) data.push(line.slice(5).trim());
      });
      var text=data.join('\n');
      if(!text||text==='[DONE]') return;
      if(event==='meta'){
        try{onMeta&&onMeta(JSON.parse(text));}catch(e){}
      }else if(event==='progress'){
        window.dispatchEvent(new CustomEvent('indicare:stream-progress',{detail:{content:text}}));
      }else{
        onToken(text);
      }
    });
    return rest;
  }

  async function stream(body){
    var activeMode=mode();
    var outbound=Object.assign({},body||{}, {
      assistant_surface:'ai-suite',
      assistant_mode:activeMode,
      response_mode: activeMode==='intelligence' ? 'deep' : (body&&body.response_mode)||'balanced',
      conversation_id: body&&body.conversation_id || ('indicare-ai-'+activeMode),
      use_orchestrator:true
    });
    var bubble=ensureLiveBubble();
    var answer='';
    var meta=null;
    var res=await originalFetch('/assistant/general/stream',{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(outbound)
    });
    if(!res.ok||!res.body) throw new Error('Streaming failed '+res.status);
    var reader=res.body.getReader();
    var decoder=new TextDecoder();
    var buffer='';
    while(true){
      var next=await reader.read();
      if(next.done) break;
      buffer+=decoder.decode(next.value,{stream:true});
      buffer=parseSse(buffer,function(token){
        answer+=token;
        if(bubble){bubble.textContent=answer; bubble.closest('.ai-feed,.voice-transcript')?.scrollTo?.(0,999999);}
        window.dispatchEvent(new CustomEvent('indicare:stream-token',{detail:{token:token,answer:answer,mode:activeMode}}));
      },function(m){meta=m;});
    }
    document.getElementById('icLiveStreamingAnswer')?.remove();
    return {answer:answer.trim()||'I am here. Tell me what you want to work through.',meta:meta};
  }

  var originalFetch=window.fetch.bind(window);
  window.fetch=async function(url,opts){
    if(typeof url==='string' && url.indexOf('/assistant/general-safe')>-1 && opts && opts.method==='POST'){
      try{
        var body=JSON.parse(opts.body||'{}');
        var data=await stream(body);
        return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
      }catch(error){
        return new Response(JSON.stringify({answer:'I could not connect to the live assistant stream just now. '+(error.message||error)}),{status:200,headers:{'Content-Type':'application/json'}});
      }
    }
    return originalFetch(url,opts);
  };

  window.IndiCareAIStream={stream:stream};
})();
