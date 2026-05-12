(function(){
  if(window.__IndiCareRuntimeHealthCheck)return;
  window.__IndiCareRuntimeHealthCheck=true;

  function status(){
    return {
      root:!!document.getElementById('indicareAiRoot'),
      bootOk:!!window.__INDICARE_BOOT_OK,
      premiumRuntime:!!window.__IndiCarePremiumRuntime,
      voiceRuntime:!!window.IndiCareVoice,
      liveRuntime:!!window.IndiCareIntelligenceLive,
      timestamp:new Date().toISOString()
    };
  }

  function emit(){
    try{
      window.dispatchEvent(new CustomEvent('indicare:runtime-health',{detail:status()}));
    }catch(e){}
  }

  window.IndiCareRuntimeHealth={status:status,emit:emit};

  setInterval(emit,5000);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',emit,{once:true});
  }else{
    emit();
  }
})();