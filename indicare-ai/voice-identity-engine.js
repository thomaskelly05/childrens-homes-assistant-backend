(function(){
  if(window.__IndiCareVoiceIdentityInstalled)return;
  window.__IndiCareVoiceIdentityInstalled=true;

  var defaults={
    name:'IndiCare Voice',
    voice:'shimmer',
    style:'calm British female care-professional',
    cadence:'short, warm, natural spoken sentences',
    warmth:0.78,
    pace:0.86,
    safeguarding:'slow, steady, factual and reassuring',
    reflective:'warm, validating and clear',
    operational:'concise, practical and action-led',
    evidence:'precise, balanced and evidence-aware'
  };
  var key='ic.ai.voice.identity';
  function read(){try{return Object.assign({},defaults,JSON.parse(localStorage.getItem(key)||'{}'));}catch(e){return Object.assign({},defaults);}}
  function save(v){localStorage.setItem(key,JSON.stringify(Object.assign(read(),v||{})));window.dispatchEvent(new CustomEvent('indicare:voice-identity',{detail:read()}));}
  function prompt(){var v=read();return 'Voice identity: '+v.style+'. Name: '+v.name+'. Cadence: '+v.cadence+'. Pace: '+v.pace+'. Warmth: '+v.warmth+'. Safeguarding tone: '+v.safeguarding+'. Reflective tone: '+v.reflective+'. Operational tone: '+v.operational+'. Evidence tone: '+v.evidence+'.';}
  function voice(){return read().voice||'shimmer';}
  window.IndiCareVoiceIdentity={get:read,set:save,prompt:prompt,voice:voice};
})();