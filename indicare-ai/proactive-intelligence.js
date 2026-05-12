(function(){
  if(window.__IndiCareProactiveInstalled)return;
  window.__IndiCareProactiveInstalled=true;

  var patterns=[
    {rx:/missing|abscond|not returned/i,type:'missing_episode',severity:'high'},
    {rx:/self-harm|suicide|harm myself/i,type:'self_harm',severity:'critical'},
    {rx:/restraint|physical intervention/i,type:'restraint',severity:'high'},
    {rx:/ofsted|inspection|sccif/i,type:'inspection',severity:'medium'}
  ];

  function analyse(text){
    text=String(text||'');
    var hits=[];
    patterns.forEach(function(p){if(p.rx.test(text))hits.push(p);});
    if(hits.length){window.dispatchEvent(new CustomEvent('indicare:proactive-risk',{detail:{hits:hits,text:text}}));show(hits[0]);}
    return hits;
  }

  function show(hit){
    var root=document.querySelector('.voice-stage');
    if(!root)return;
    var ex=document.getElementById('proactiveIntelCard');
    if(ex)ex.remove();
    var el=document.createElement('div');
    el.id='proactiveIntelCard';
    el.className='proactive-intel-card severity-'+hit.severity;
    el.innerHTML='<strong>Operational Intelligence</strong><span>'+hit.type.replace(/_/g,' ')+' detected. Consider safeguarding review, chronology check and escalation pathway.</span>';
    root.appendChild(el);
    setTimeout(function(){try{el.remove();}catch(e){}},12000);
  }

  window.addEventListener('indicare:realtime-webrtc',function(e){var d=e.detail||{};if(d.type==='transcript'&&d.role==='user')analyse(d.text);});
  window.IndiCareProactiveIntelligence={analyse:analyse};
})();