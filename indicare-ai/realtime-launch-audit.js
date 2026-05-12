(function(){
  if(window.__IndiCareRealtimeLaunchAuditInstalled)return;
  window.__IndiCareRealtimeLaunchAuditInstalled=true;

  var audit={ok:false,items:{},updated_at:null};

  function exists(path){return !!path;}
  function setClass(){document.body.classList.toggle('ai-launch-ready',audit.ok);document.body.classList.toggle('ai-launch-warning',!audit.ok&&!!audit.updated_at);}
  function emit(){window.dispatchEvent(new CustomEvent('indicare:launch-audit',{detail:audit}));}

  async function ping(url){
    try{var r=await fetch(url,{credentials:'include'});return {ok:r.ok,status:r.status,data:await r.json().catch(function(){return null;})};}
    catch(e){return {ok:false,status:0,error:e.message||String(e)};}
  }

  async function run(){
    var realtimeHealth=await ping('/assistant/realtime/health');
    var frontendHealth=await ping('/health/frontend');
    audit={
      updated_at:new Date().toISOString(),
      ok:true,
      items:{
        secure_context:window.isSecureContext||location.hostname==='localhost',
        webrtc:!!window.RTCPeerConnection,
        media_devices:!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia),
        realtime_health:!!(realtimeHealth.ok&&realtimeHealth.data&&realtimeHealth.data.production_ready),
        frontend_health:!!frontendHealth.ok,
        runtime:!!window.IndiCareRealtime,
        webrtc_client:!!window.IndiCareRealtimeWebRTC,
        live_orb:!!window.IndiCareIntelligenceLive,
        voice_fallback:!!window.IndiCareVoice,
        soundscape:!!window.IndiCareVoiceSoundscape,
        audio_reactor:!!window.IndiCareVoiceAudioReactor,
        emotion_engine:!!window.IndiCareVoiceEmotion,
        readiness:!!window.IndiCareRealtimeReadiness,
        production_check:!!window.IndiCareRealtimeProductionCheck
      },
      server:{realtime:realtimeHealth.data||realtimeHealth,frontend:frontendHealth.data||frontendHealth}
    };
    Object.keys(audit.items).forEach(function(k){if(!audit.items[k])audit.ok=false;});
    setClass();emit();return audit;
  }

  function badge(){
    var stage=document.querySelector('.voice-stage');
    if(!stage||document.getElementById('launchAuditBadge'))return;
    var b=document.createElement('div');
    b.id='launchAuditBadge';
    b.className='launch-audit-badge';
    b.innerHTML='<strong>Launch audit</strong><span>Checking realtime voice...</span>';
    stage.appendChild(b);
  }

  window.addEventListener('indicare:launch-audit',function(e){
    badge();
    var b=document.getElementById('launchAuditBadge');
    if(!b)return;
    var d=e.detail||{};
    b.innerHTML=d.ok?'<strong>Production ready</strong><span>Realtime voice checks passed</span>':'<strong>Launch warning</strong><span>Realtime fallback or configuration check needed</span>';
  });

  var mo=new MutationObserver(badge);
  mo.observe(document.body,{childList:true,subtree:true});
  window.IndiCareRealtimeLaunchAudit={run:run,get:function(){return audit;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,500);});else setTimeout(run,500);
})();