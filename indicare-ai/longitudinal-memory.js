(function(){
  if(window.__IndiCareLongitudinalMemoryInstalled)return;
  window.__IndiCareLongitudinalMemoryInstalled=true;
  var key='ic.ai.longitudinal.memory';
  function base(){return{version:1,people:{},homes:{},themes:{},risks:[],actions:[],events:[],updated_at:null};}
  function read(){try{return Object.assign(base(),JSON.parse(localStorage.getItem(key)||'{}'));}catch(e){return base();}}
  var state=read();
  function save(){state.updated_at=new Date().toISOString();localStorage.setItem(key,JSON.stringify(state));}
  function inc(map,k){if(!k)return;map[k]=(map[k]||0)+1;}
  function classify(text){var s=String(text||'').toLowerCase();var tags=[];['safeguarding','missing','restraint','allegation','incident','self-harm','supervision','handover','ofsted','sccif','reg 44','complaint','staffing','medication','education','health','family'].forEach(function(t){if(s.indexOf(t)>-1)tags.push(t);});return tags;}
  function add(text,meta){text=String(text||'').trim();if(!text)return null;var tags=classify(text);tags.forEach(function(t){inc(state.themes,t);});var item={id:'lm-'+Date.now()+'-'+Math.random().toString(16).slice(2),text:text.slice(0,1800),tags:tags,meta:meta||{},created_at:new Date().toISOString()};state.events.unshift(item);state.events=state.events.slice(0,600);if(tags.some(function(t){return ['safeguarding','missing','restraint','allegation','incident','self-harm'].indexOf(t)>-1;})){state.risks.unshift(item);state.risks=state.risks.slice(0,240);}if(/action|follow up|review|call|email|complete|deadline|next step/i.test(text)){state.actions.unshift(item);state.actions=state.actions.slice(0,240);}save();window.dispatchEvent(new CustomEvent('indicare:longitudinal-memory',{detail:summary()}));return item;}
  function summary(){return{events:state.events.length,risks:state.risks.length,actions:state.actions.length,themes:state.themes,recent:state.events.slice(0,10),risk_trend:state.risks.slice(0,10),updated_at:state.updated_at};}
  function prompt(){var s=summary();return 'Long-term IndiCare memory summary: '+JSON.stringify({themes:s.themes,recent:s.recent.slice(0,5),risk_trend:s.risk_trend.slice(0,5),actions:state.actions.slice(0,5)}).slice(0,3500);}
  window.addEventListener('indicare:realtime-webrtc',function(e){var d=e.detail||{};if(d.type==='transcript')add(d.text,{role:d.role,source:'realtime'});});
  window.addEventListener('indicare:voice',function(e){var d=e.detail||{};if(d.state==='idle'&&d.transcript)add(d.transcript,{source:'fallback_voice'});});
  window.IndiCareLongitudinalMemory={add:add,summary:summary,prompt:prompt,get:function(){return state;},clear:function(){state=base();save();}};
})();