(function(){
  if(window.__IndiCareMobileVoiceInstalled)return;
  window.__IndiCareMobileVoiceInstalled=true;
  function mobile(){return /iPhone|iPad|Android/i.test(navigator.userAgent||'');}
  function optimise(){
    if(!mobile())return;
    document.body.classList.add('ai-mobile-voice');
    try{
      var meta=document.querySelector('meta[name="viewport"]');
      if(meta)meta.setAttribute('content','width=device-width,initial-scale=1,viewport-fit=cover');
    }catch(e){}
  }
  function wake(){try{if(navigator.wakeLock&&navigator.wakeLock.request)navigator.wakeLock.request('screen');}catch(e){}}
  document.addEventListener('visibilitychange',function(){if(!document.hidden)wake();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){optimise();wake();});else{optimise();wake();}
  window.IndiCareMobileVoice={mobile:mobile};
})();