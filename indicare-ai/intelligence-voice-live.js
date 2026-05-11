(function(){
  if(window.__IndiCareIntelligenceLiveInstalled)return;
  window.__IndiCareIntelligenceLiveInstalled=true;

  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function isIntelligence(){return localStorage.getItem('ic.ai.mode')==='intelligence'||document.querySelector('.intelligence-mode');}
  function transcript(){return document.querySelector('.voice-transcript');}
  function orb(){return document.querySelector('.voice-orb');}

  function addPresence(){
    var stage=document.querySelector('.voice-stage');
    if(!stage||stage.dataset.liveEnhanced==='1')return;
    stage.dataset.liveEnhanced='1';
    stage.insertAdjacentHTML('afterbegin','<div class="voice-presence-bar"><div class="presence-pill active">Realtime</div><div class="presence-pill">Memory active</div><div class="presence-pill">British voice</div></div><div class="voice-live">Live conversational Intelligence</div>');
    var existing=stage.querySelector('.voice-stream');
    if(!existing)stage.insertAdjacentHTML('beforeend','<div class="voice-stream"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="voice-thinking">Thinking naturally...</div>');
  }

  function append(role,text){
    var t=transcript();
    if(!t||!text)return;
    var line=document.createElement('span');
    line.className='stream-line '+role;
    line.innerHTML=esc(text);
    t.appendChild(line);
    t.scrollTop=t.scrollHeight;
  }

  function setOrb(label){var o=orb();if(o){var b=o.querySelector('b');if(b)b.textContent=label;}}
  function enhance(){if(isIntelligence())addPresence();}

  window.addEventListener('indicare:voice',function(e){
    enhance();
    var d=e.detail||{};
    if(d.state==='listening'){setOrb('Listening');if(window.IndiCareRealtime)window.IndiCareRealtime.listen(true);}
    if(d.interim){var t=transcript();if(t){var live=t.querySelector('.stream-line.live-user');if(!live){live=document.createElement('span');live.className='stream-line user live-user';t.appendChild(live);}live.innerHTML=esc(d.interim);t.scrollTop=t.scrollHeight;}}
    if(d.state==='idle'){setOrb('Start');if(window.IndiCareRealtime)window.IndiCareRealtime.listen(false);var live=document.querySelector('.stream-line.live-user');if(live)live.remove();}
    if(d.state==='speaking'){setOrb('Speaking');if(window.IndiCareRealtime)window.IndiCareRealtime.speak(true);}
    if(d.state==='spoken'){setOrb('Start');if(window.IndiCareRealtime)window.IndiCareRealtime.speak(false);}
  });

  window.addEventListener('indicare:stream-start',function(){enhance();setOrb('Thinking');if(window.IndiCareRealtime)window.IndiCareRealtime.think(true);});
  window.addEventListener('indicare:stream-token',function(){enhance();});
  window.addEventListener('indicare:stream-done',function(e){
    enhance();
    if(window.IndiCareRealtime){window.IndiCareRealtime.think(false);window.IndiCareRealtime.speak(true);}
    var d=e.detail||{};
    if(d.answer&&isIntelligence())append('assistant',d.answer);
  });

  var mo=new MutationObserver(enhance);
  mo.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
