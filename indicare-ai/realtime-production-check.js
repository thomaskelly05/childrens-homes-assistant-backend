(function(){
  if(window.__IndiCareRealtimeProductionCheckInstalled)return;
  window.__IndiCareRealtimeProductionCheckInstalled=true;

  var result={ok:false,checks:{},updated_at:null};

  function has(name){return !!window[name];}
  function mark(){
    result={
      ok:true,
      updated_at:new Date().toISOString(),
      checks:{
        webrtc:!!window.RTCPeerConnection,
        media_devices:!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia),
        secure_context:window.isSecureContext||location.hostname==='localhost',
        realtime_runtime:has('IndiCareRealtime'),
        realtime_webrtc:has('IndiCareRealtimeWebRTC'),
        voice_live:has('IndiCareIntelligenceLive'),
        voice_fallback:has('IndiCareVoice'),
        audio_reactor:has('IndiCareVoiceAudioReactor'),
        soundscape:has('IndiCareVoiceSoundscape'),
        readiness:has('IndiCareRealtimeReadiness')
      }
    };
    Object.keys(result.checks).forEach(function(k){if(!result.checks[k])result.ok=false;});
    document.body.classList.toggle('ai-production-ready',result.ok);
    window.dispatchEvent(new CustomEvent('indicare:production-check',{detail:result}));
    return result;
  }

  async function checkServer(){
    try{
      var r=await fetch('/assistant/realtime/health',{credentials:'include'});
      var data=await r.json();
      result.server=data;
      result.checks.server_configured=!!data.configured;
      result.checks.server_ready=!!data.production_ready;
      result.ok=result.ok&&!!data.production_ready;
    }catch(e){
      result.server_error=e.message||String(e);
      result.ok=false;
    }
    document.body.classList.toggle('ai-production-ready',result.ok);
    window.dispatchEvent(new CustomEvent('indicare:production-check',{detail:result}));
    return result;
  }

  async function run(){mark();await checkServer();return result;}
  window.IndiCareRealtimeProductionCheck={run:run,get:function(){return result;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(run,250);});else setTimeout(run,250);
})();