(function(){
  if(window.__IndiCareVoiceEmotionEngineInstalled)return;
  window.__IndiCareVoiceEmotionEngineInstalled=true;

  var state={mode:'calm',risk:false,stress:false,lastText:''};
  var rules=[
    {mode:'safeguarding',rx:/safeguard|harm|self-harm|suicide|missing|abscond|restraint|allegation|abuse|assault|injur|risk|police|lado|dsl/i},
    {mode:'reflective',rx:/supervision|reflect|feel|upset|worried|stress|difficult|struggl|anxious|overwhelmed/i},
    {mode:'operational',rx:/handover|action|plan|meeting|email|calendar|follow up|deadline|task/i},
    {mode:'evidence',rx:/ofsted|sccif|reg 44|inspection|evidence|compliance|audit|quality/i}
  ];

  function detect(text){
    text=String(text||'');
    var mode='calm';
    for(var i=0;i<rules.length;i++){if(rules[i].rx.test(text)){mode=rules[i].mode;break;}}
    state={mode:mode,risk:mode==='safeguarding',stress:/stress|overwhelmed|panic|upset|worried|difficult/i.test(text),lastText:text.slice(0,1000)};
    document.body.dataset.voiceEmotion=mode;
    window.dispatchEvent(new CustomEvent('indicare:voice-emotion',{detail:state}));
    return state;
  }

  function instruction(){
    if(state.mode==='safeguarding')return 'Use a slower, calm safeguarding tone. Separate immediate safety, facts, missing information and escalation steps. Do not rush.';
    if(state.mode==='reflective')return 'Use a warm reflective tone. Validate pressure without over-empathising. Help the adult think clearly.';
    if(state.mode==='operational')return 'Use a practical operational tone. Be concise, action-led and specific.';
    if(state.mode==='evidence')return 'Use a precise evidence-aware tone. Separate evidence, impact, gaps and next actions.';
    return 'Use a calm natural British conversational tone with short spoken sentences.';
  }

  window.addEventListener('indicare:realtime-webrtc',function(e){var d=e.detail||{};if(d.type==='transcript'&&d.role==='user')detect(d.text);});
  window.addEventListener('indicare:voice',function(e){var d=e.detail||{};if(d.transcript)detect(d.transcript);});
  window.addEventListener('indicare:stream-start',function(e){var d=e.detail||{};if(d.message)detect(d.message);});

  window.IndiCareVoiceEmotion={detect:detect,get:function(){return state;},instruction:instruction};
})();