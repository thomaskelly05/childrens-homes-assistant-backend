(function(){
  if(window.__IndiCareRealtimeReadinessInstalled)return;
  window.__IndiCareRealtimeReadinessInstalled=true;

  var status={checked:false,configured:false,provider:'openai_realtime',transport:'webrtc',voice:'shimmer',fallback:'browser_voice'};

  function emit(){window.dispatchEvent(new CustomEvent('indicare:realtime-readiness',{detail:status}));}
  function pill(){var p=document.getElementById('rtPill');if(!p)return;p.textContent=status.configured?'Realtime ready':'Fallback voice';p.classList.toggle('active',!!status.configured);}
  function cls(){document.body.classList.toggle('ai-realtime-ready',!!status.configured);document.body.classList.toggle('ai-realtime-not-configured',!status.configured&&status.checked);}

  async function check(){
    try{
      var r=await fetch('/assistant/realtime/config',{credentials:'include'});
      if(!r.ok)throw new Error('config '+r.status);
      var data=await r.json();
      status=Object.assign(status,data,{checked:true});
    }catch(e){
      status=Object.assign(status,{checked:true,configured:false,error:e.message||String(e)});
    }
    cls();pill();emit();return status;
  }

  function renderBanner(){
    var stage=document.querySelector('.voice-stage');
    if(!stage||document.getElementById('realtimeReadinessBanner'))return;
    if(status.configured)return;
    var banner=document.createElement('div');
    banner.id='realtimeReadinessBanner';
    banner.className='realtime-readiness-banner';
    banner.innerHTML='<strong>Realtime voice fallback active</strong><span>Configure OPENAI_API_KEY in production to enable full speech-to-speech Intelligence.</span>';
    stage.appendChild(banner);
  }

  window.addEventListener('indicare:realtime-readiness',renderBanner);
  var mo=new MutationObserver(function(){pill();if(status.checked)renderBanner();});
  mo.observe(document.body,{childList:true,subtree:true});
  window.IndiCareRealtimeReadiness={check:check,get:function(){return status;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check);else check();
})();