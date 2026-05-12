(function(){
  if(window.__IndiCareRuntimeGuardInstalled)return;
  window.__IndiCareRuntimeGuardInstalled=true;

  var errors=[];
  function report(type,error,source){
    var item={type:type,message:String(error&&error.message||error||'Unknown runtime issue'),source:source||'',time:new Date().toISOString()};
    errors.unshift(item);errors=errors.slice(0,30);
    try{localStorage.setItem('ic.ai.runtime.errors',JSON.stringify(errors));}catch(e){}
    window.dispatchEvent(new CustomEvent('indicare:runtime-error',{detail:item}));
    show(item);
  }
  function show(item){
    var root=document.getElementById('indicareAiRoot');
    if(!root)return;
    var existing=document.getElementById('runtimeGuardNotice');
    if(existing)return;
    var notice=document.createElement('div');
    notice.id='runtimeGuardNotice';
    notice.className='runtime-guard-notice';
    notice.innerHTML='<strong>Assistant recovered</strong><span>A runtime module failed silently and safe mode has kept /assistant running.</span>';
    document.body.appendChild(notice);
    setTimeout(function(){try{notice.remove();}catch(e){}},9000);
  }
  window.addEventListener('error',function(e){report('error',e.error||e.message,e.filename);});
  window.addEventListener('unhandledrejection',function(e){report('promise',e.reason,'promise');});
  window.IndiCareRuntimeGuard={report:report,errors:function(){return errors.slice();}};
})();