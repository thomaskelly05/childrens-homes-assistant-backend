(function(){
  if(window.__IndiCareIntelligenceLiveInstalled)return;
  window.__IndiCareIntelligenceLiveInstalled=true;

  var realtimeActive=false;
  var assistantBuffer='';

  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function isIntelligence(){return localStorage.getItem('ic.ai.mode')==='intelligence'||document.querySelector('.intelligence-mode');}
  function transcript(){return document.querySelector('.voice-transcript');}
  function orb(){return document.querySelector('.voice-orb');}

  function addPresence(){
    var stage=document.querySelector('.voice-stage');
    if(!stage||stage.dataset.liveEnhanced==='1')return;
    stage.dataset.liveEnhanced='1';
    stage.insertAdjacentHTML('afterbegin','<div class="voice-presence-bar"><div class="presence-pill active" id="rtPill">Realtime ready</div><div class="presence-pill">Memory active</div><div class="presence-pill">British voice</div></div><div class="voice-live">Live conversational Intelligence</div>');
    if(!stage.querySelector('.voice-stream'))stage.insertAdjacentHTML('beforeend','<div class="voice-stream"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="voice-thinking">Thinking naturally...</div>');
  }

  function pill(text){var p=document.getElementById('rtPill');if(p)p.textContent=text;}
  function append(role,text){var t=transcript();if(!t||!text)return;var line=document.createElement('span');line.className='stream-line '+role;line.innerHTML=esc(text);t.appendChild(line);t.scrollTop=t.scrollHeight;}
  function delta(text){var t=transcript();if(!t||!text)return;var line=t.querySelector('.stream-line.assistant.live-assistant');if(!line){line=document.createElement('span');line.className='stream-line assistant live-assistant';t.appendChild(line);assistantBuffer='';}assistantBuffer+=text;line.innerHTML=esc(assistantBuffer);t.scrollTop=t.scrollHeight;}
  function finishDelta(){var line=document.querySelector('.stream-line.live-assistant');if(line)line.classList.remove('live-assistant');assistantBuffer='';}
  function setOrb(label){var o=orb();if(o){var b=o.querySelector('b');if(b)b.textContent=label;}}
  function enhance(){if(isIntelligence())addPresence();}

  async function startRealtime(){
    enhance();
    if(window.IndiCareVoice&&window.IndiCareVoice.interrupt)window.IndiCareVoice.interrupt();
    if(window.IndiCareRealtimeWebRTC){
      setOrb('Connecting');pill('Connecting');
      var ok=await window.IndiCareRealtimeWebRTC.connect();
      if(ok){realtimeActive=true;setOrb('Listening');pill('Realtime live');if(window.IndiCareRealtime)window.IndiCareRealtime.listen(true);return true;}
      pill('Fallback voice');
    }
    realtimeActive=false;
    if(window.IndiCareVoice)return window.IndiCareVoice.start();
    return false;
  }

  function stopRealtime(){
    if(window.IndiCareRealtimeWebRTC&&realtimeActive){window.IndiCareRealtimeWebRTC.disconnect();realtimeActive=false;}
    if(window.IndiCareVoice)window.IndiCareVoice.stop('manual');
    setOrb('Start');pill('Realtime ready');
    if(window.IndiCareRealtime)window.IndiCareRealtime.listen(false);
  }

  window.IndiCareIntelligenceLive={start:startRealtime,stop:stopRealtime,isRealtime:function(){return realtimeActive;}};

  document.addEventListener('click',function(e){
    var v=e.target.closest('[data-action="voice"],.voice-orb');
    if(!v||!isIntelligence())return;
    e.preventDefault();
    e.stopPropagation();
    if(realtimeActive)stopRealtime();else startRealtime();
  },true);

  window.addEventListener('indicare:voice',function(e){
    enhance();
    if(realtimeActive)return;
    var d=e.detail||{};
    if(d.state==='listening'){setOrb('Listening');if(window.IndiCareRealtime)window.IndiCareRealtime.listen(true);}
    if(d.interim){var t=transcript();if(t){var live=t.querySelector('.stream-line.live-user');if(!live){live=document.createElement('span');live.className='stream-line user live-user';t.appendChild(live);}live.innerHTML=esc(d.interim);t.scrollTop=t.scrollHeight;}}
    if(d.state==='idle'){setOrb('Start');if(window.IndiCareRealtime)window.IndiCareRealtime.listen(false);var live=document.querySelector('.stream-line.live-user');if(live)live.remove();}
    if(d.state==='speaking'){setOrb('Speaking');if(window.IndiCareRealtime)window.IndiCareRealtime.speak(true);}
    if(d.state==='spoken'){setOrb('Start');if(window.IndiCareRealtime)window.IndiCareRealtime.speak(false);}
  });

  window.addEventListener('indicare:realtime-webrtc',function(e){
    enhance();
    var d=e.detail||{};
    if(d.type==='ready'){realtimeActive=true;setOrb('Listening');pill('Realtime live');append('assistant','I am listening.');}
    if(d.type==='fallback'){realtimeActive=false;setOrb('Fallback');pill('Fallback voice');if(window.IndiCareVoice)window.IndiCareVoice.start();}
    if(d.type==='assistant_delta')delta(d.text||'');
    if(d.type==='transcript'){finishDelta();append(d.role,d.text);}
    if(d.type==='event'&&d.type){}
  });

  window.addEventListener('indicare:realtime',function(e){
    var d=e.detail||{};
    if(d.type==='state'){
      if(d.speaking)setOrb('Speaking');
      else if(d.thinking)setOrb('Thinking');
      else if(d.listening)setOrb('Listening');
    }
  });

  window.addEventListener('indicare:stream-start',function(){enhance();setOrb('Thinking');if(window.IndiCareRealtime)window.IndiCareRealtime.think(true);});
  window.addEventListener('indicare:stream-done',function(e){enhance();if(window.IndiCareRealtime){window.IndiCareRealtime.think(false);window.IndiCareRealtime.speak(true);}var d=e.detail||{};if(d.answer&&isIntelligence()&&!realtimeActive)append('assistant',d.answer);});

  var mo=new MutationObserver(enhance);
  mo.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
