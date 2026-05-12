(function(){
  if(window.__IndiCareSessionContinuityInstalled)return;
  window.__IndiCareSessionContinuityInstalled=true;
  var key='ic.ai.session.continuity';
  function load(){try{return JSON.parse(localStorage.getItem(key)||'{"items":[],"themes":{}}');}catch(e){return {items:[],themes:{}};}}
  var state=load();
  function save(){localStorage.setItem(key,JSON.stringify(state));}
  function add(text,source){
    text=String(text||'').trim();
    if(!text)return;
    var item={text:text.slice(0,1000),source:source||'voice',time:new Date().toISOString()};
    state.items.unshift(item);state.items=state.items.slice(0,200);
    ['handover','supervision','meeting','inspection','document','care','follow up'].forEach(function(t){if(text.toLowerCase().indexOf(t)>-1)state.themes[t]=(state.themes[t]||0)+1;});
    save();window.dispatchEvent(new CustomEvent('indicare:session-continuity',{detail:summary()}));
  }
  function summary(){return {items:state.items.length,themes:state.themes,recent:state.items.slice(0,8)};}
  window.addEventListener('indicare:realtime-webrtc',function(e){var d=e.detail||{};if(d.type==='transcript')add(d.text,'realtime');});
  window.IndiCareSessionContinuity={add:add,summary:summary,get:function(){return state;}};
})();