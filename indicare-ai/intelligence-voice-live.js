(function(){
  if(window.__IndiCareIntelligenceLiveInstalled)return;
  window.__IndiCareIntelligenceLiveInstalled=true;

  var realtimeActive=false;
  var assistantBuffer='';
  var speaking=false;
  var interrupted=false;

  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function isIntelligence(){return localStorage.getItem('ic.ai.mode')==='intelligence'||document.querySelector('.intelligence-mode');}
  function transcript(){return document.querySelector('.voice-transcript');}
  function orb(){return document.querySelector('.voice-orb');}
  function orbLabel(text){var o=orb();if(!o)return;var b=o.querySelector('b');if(b)b.textContent=text;}

  function ensurePresence(){
    var stage=document.querySelector('.voice-stage');
    if(!stage||stage.dataset.presenceReady==='1')return;
    stage.dataset.presenceReady='1';

    var hero=stage.querySelector('h2');
    if(hero)hero.textContent='Talk naturally with IndiCare Intelligence';

    var sub=stage.querySelector('p');
    if(sub)sub.textContent='Realtime British conversational intelligence with memory, emotional awareness and live interruption support.';

    var existing=stage.querySelector('.voice-presence-bar');
    if(existing)existing.remove();

    stage.insertAdjacentHTML('afterbegin','<div class="voice-presence-bar"><div class="presence-pill active" id="rtState">Realtime conversational</div><div class="presence-pill">Low latency</div><div class="presence-pill">British female voice</div></div>');
  }

  function state(text){
    var el=document.getElementById('rtState');
    if(el)el.textContent=text;
  }

  function append(role,text){
    if(!text)return;
    var t=transcript();
    if(!t)return;

    var wrap=document.createElement('div');
    wrap.className='voice-line '+role;
    wrap.innerHTML='<label>'+(role==='assistant'?'IndiCare':'You')+'</label><span>'+esc(text)+'</span>';
    t.appendChild(wrap);
    t.scrollTop=t.scrollHeight;
  }

  function delta(text){
    var t=transcript();
    if(!t||!text)return;

    var line=t.querySelector('.voice-line.assistant.live');
    if(!line){
      line=document.createElement('div');
      line.className='voice-line assistant live';
      line.innerHTML='<label>IndiCare</label><span></span>';
      t.appendChild(line);
      assistantBuffer='';
    }

    assistantBuffer+=text;
    var span=line.querySelector('span');
    if(span)span.innerHTML=esc(assistantBuffer);

    t.scrollTop=t.scrollHeight;
  }

  function finishDelta(){
    var live=document.querySelector('.voice-line.assistant.live');
    if(live)live.classList.remove('live');
    assistantBuffer='';
  }

  async function startRealtime(){
    ensurePresence();

    interrupted=false;
    orbLabel('Connecting');
    state('Connecting');

    if(window.IndiCareVoice&&window.IndiCareVoice.interrupt){
      window.IndiCareVoice.interrupt();
    }

    if(window.IndiCareRealtimeWebRTC){
      try{
        var ok=await window.IndiCareRealtimeWebRTC.connect();

        if(ok){
          realtimeActive=true;
          orbLabel('Listening');
          state('Live');
          append('assistant','Hello. I am listening.');
          return true;
        }
      }catch(e){}
    }

    realtimeActive=false;
    state('Fallback voice');

    if(window.IndiCareVoice&&window.IndiCareVoice.start){
      window.IndiCareVoice.start();
    }

    return false;
  }

  function stopRealtime(){
    interrupted=true;

    if(window.IndiCareRealtimeWebRTC&&realtimeActive){
      window.IndiCareRealtimeWebRTC.disconnect();
    }

    realtimeActive=false;
    speaking=false;

    if(window.IndiCareVoice&&window.IndiCareVoice.stop){
      window.IndiCareVoice.stop('manual');
    }

    orbLabel('Start');
    state('Realtime ready');
  }

  window.IndiCareIntelligenceLive={
    start:startRealtime,
    stop:stopRealtime,
    interrupt:function(){
      interrupted=true;
      if(window.IndiCareVoice&&window.IndiCareVoice.interrupt){
        window.IndiCareVoice.interrupt();
      }
      orbLabel('Listening');
      state('Interrupted');
    }
  };

  document.addEventListener('click',function(e){
    var target=e.target.closest('.voice-orb,[data-action="voice"]');
    if(!target||!isIntelligence())return;

    e.preventDefault();
    e.stopPropagation();

    if(realtimeActive)stopRealtime();
    else startRealtime();
  },true);

  window.addEventListener('indicare:voice',function(e){
    ensurePresence();

    if(realtimeActive)return;

    var d=e.detail||{};

    if(d.state==='listening'){
      orbLabel('Listening');
      state('Listening');
    }

    if(d.interim){
      var t=transcript();
      if(t){
        var live=t.querySelector('.voice-line.user.live');

        if(!live){
          live=document.createElement('div');
          live.className='voice-line user live';
          live.innerHTML='<label>You</label><span></span>';
          t.appendChild(live);
        }

        var span=live.querySelector('span');
        if(span)span.innerHTML=esc(d.interim);
        t.scrollTop=t.scrollHeight;
      }
    }

    if(d.transcript){
      var liveUser=document.querySelector('.voice-line.user.live');
      if(liveUser)liveUser.remove();
      append('user',d.transcript);
    }

    if(d.state==='thinking'){
      orbLabel('Thinking');
      state('Thinking');
    }

    if(d.state==='speaking'){
      speaking=true;
      orbLabel('Speaking');
      state('Responding');
    }

    if(d.state==='spoken'){
      speaking=false;
      orbLabel('Listening');
      state('Listening');
    }

    if(d.state==='idle'&&!speaking){
      orbLabel('Start');
      state('Realtime ready');
    }
  });

  window.addEventListener('indicare:realtime-webrtc',function(e){
    ensurePresence();

    var d=e.detail||{};

    if(d.type==='ready'){
      realtimeActive=true;
      orbLabel('Listening');
      state('Live conversation');
    }

    if(d.type==='fallback'){
      realtimeActive=false;
      orbLabel('Fallback');
      state('Fallback voice');
    }

    if(d.type==='assistant_delta'){
      delta(d.text||'');
    }

    if(d.type==='transcript'){
      finishDelta();
      append(d.role,d.text);
    }
  });

  var mo=new MutationObserver(ensurePresence);
  mo.observe(document.body,{childList:true,subtree:true});

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',ensurePresence,{once:true});
  }else{
    ensurePresence();
  }
})();