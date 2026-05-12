(function(){
  if(window.__IndiCareRuntimeGuardInstalled)return;
  window.__IndiCareRuntimeGuardInstalled=true;

  var errors=[];

  function report(type,error,source){
    var item={
      type:type,
      message:String(error&&error.message||error||'Unknown runtime issue'),
      source:source||'',
      time:new Date().toISOString()
    };

    errors.unshift(item);
    errors=errors.slice(0,30);

    try{localStorage.setItem('ic.ai.runtime.errors',JSON.stringify(errors));}catch(e){}

    try{
      window.dispatchEvent(new CustomEvent('indicare:runtime-error',{detail:item}));
    }catch(e){}

    if(window.console&&console.warn){
      console.warn('[IndiCare runtime recovered]',item);
    }
  }

  function clearOldNotices(){
    try{
      Array.from(document.querySelectorAll('#runtimeGuardNotice,.runtime-guard-notice')).forEach(function(el){el.remove();});
      Array.from(document.querySelectorAll('*')).forEach(function(el){
        var text=(el.innerText||'').toLowerCase();
        if(text.indexOf('assistant recovered')>-1&&text.indexOf('safe mode')>-1)el.remove();
      });
    }catch(e){}
  }

  window.addEventListener('error',function(e){
    report('error',e.error||e.message,e.filename);
    clearOldNotices();
  });

  window.addEventListener('unhandledrejection',function(e){
    report('promise',e.reason,'promise');
    clearOldNotices();
  });

  window.IndiCareRuntimeGuard={
    report:report,
    errors:function(){return errors.slice();},
    clearNotices:clearOldNotices
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',clearOldNotices,{once:true});
  }else{
    clearOldNotices();
  }
})();