(function(){
  var recognition=null;
  var active=false;
  var transcript='';
  var speaking=false;
  var preferredVoice=null;
  var silenceTimer=null;
  var finalTimer=null;
  var lastInterim='';

  function supported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
  function emit(name,detail){window.dispatchEvent(new CustomEvent(name,{detail:detail||{}}));}
  function voices(){return ('speechSynthesis' in window)?window.speechSynthesis.getVoices():[];}
  function pickVoice(){
    var list=voices();
    if(!list.length)return null;
    var preferred=[
      /Samantha/i,/Serena/i,/Kate/i,/Daniel/i,/Google UK English Female/i,/Microsoft Sonia/i,/Microsoft Libby/i,/Microsoft Hazel/i,/Karen/i
    ];
    var britishFemale=list.find(function(v){return /en-GB/i.test(v.lang)&&/female|sonia|libby|hazel|kate|serena|samantha/i.test(v.name);});
    if(britishFemale)return britishFemale;
    for(var i=0;i<preferred.length;i++){var found=list.find(function(v){return preferred[i].test(v.name);});if(found)return found;}
    return list.find(function(v){return /en-GB/i.test(v.lang);})||list.find(function(v){return /en/i.test(v.lang);})||list[0];
  }
  function ensureVoice(){preferredVoice=preferredVoice||pickVoice();return preferredVoice;}
  if('speechSynthesis' in window){window.speechSynthesis.onvoiceschanged=function(){preferredVoice=pickVoice();};setTimeout(function(){preferredVoice=pickVoice();},250);}

  function create(){
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return null;
    var r=new SR();
    r.lang='en-GB';
    r.continuous=true;
    r.interimResults=true;
    r.maxAlternatives=1;
    r.onstart=function(){active=true;document.body.classList.add('ai-voice-listening');emit('indicare:voice',{state:'listening',transcript:transcript,interim:lastInterim});};
    r.onend=function(){
      active=false;
      document.body.classList.remove('ai-voice-listening');
      clearTimeout(silenceTimer);
      clearTimeout(finalTimer);
      emit('indicare:voice',{state:'idle',transcript:transcript,interim:''});
    };
    r.onerror=function(e){
      active=false;
      document.body.classList.remove('ai-voice-listening');
      emit('indicare:voice',{state:'error',error:e.error||e.message,transcript:transcript});
    };
    r.onresult=function(event){
      var interim='';
      var finalText='';
      for(var i=event.resultIndex;i<event.results.length;i++){
        var part=event.results[i][0].transcript;
        if(event.results[i].isFinal)finalText+=part;
        else interim+=part;
      }
      lastInterim=interim.trim();
      if(finalText){transcript=(transcript+' '+finalText).replace(/\s+/g,' ').trim();}
      emit('indicare:voice',{state:'listening',transcript:transcript,interim:lastInterim});
      clearTimeout(silenceTimer);
      clearTimeout(finalTimer);
      if(transcript||lastInterim){
        silenceTimer=setTimeout(function(){
          if(active&&transcript.trim()) stop('silence');
        },1300);
      }
    };
    return r;
  }

  function start(){
    if(!supported()){emit('indicare:voice',{state:'unsupported'});return false;}
    if(speaking&&window.speechSynthesis)window.speechSynthesis.cancel();
    if(active)return true;
    transcript='';lastInterim='';recognition=create();
    if(!recognition)return false;
    try{recognition.start();return true;}catch(e){emit('indicare:voice',{state:'error',error:e.message});return false;}
  }
  function stop(reason){
    clearTimeout(silenceTimer);clearTimeout(finalTimer);
    if(recognition){try{recognition.stop();}catch(e){}}
    active=false;document.body.classList.remove('ai-voice-listening');
    emit('indicare:voice',{state:'idle',reason:reason||'manual',transcript:transcript,interim:''});
  }
  function toggle(){return active?stop('manual'):start();}
  function clear(){transcript='';lastInterim='';emit('indicare:voice',{state:active?'listening':'idle',transcript:'',interim:''});}

  function sentenceChunks(text){
    var clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean)return [];
    var parts=clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[clean];
    var chunks=[];
    parts.forEach(function(p){
      p=p.trim();
      if(!p)return;
      if(p.length<220){chunks.push(p);return;}
      p.split(/,|;|:/).forEach(function(x){x=x.trim();if(x)chunks.push(x);});
    });
    return chunks.slice(0,18);
  }
  function speak(text){
    if(!('speechSynthesis' in window)||!text)return;
    try{
      window.speechSynthesis.cancel();
      var chunks=sentenceChunks(text).slice(0,10);
      var v=ensureVoice();
      speaking=true;
      document.body.classList.add('ai-voice-speaking');
      emit('indicare:voice',{state:'speaking',text:text});
      var index=0;
      function next(){
        if(index>=chunks.length){speaking=false;document.body.classList.remove('ai-voice-speaking');emit('indicare:voice',{state:'spoken'});return;}
        var u=new SpeechSynthesisUtterance(chunks[index++]);
        if(v)u.voice=v;
        u.lang=(v&&v.lang)||'en-GB';
        u.rate=.88;
        u.pitch=1.04;
        u.volume=1;
        u.onend=function(){setTimeout(next,120);};
        u.onerror=function(){setTimeout(next,80);};
        window.speechSynthesis.speak(u);
      }
      next();
    }catch(e){speaking=false;document.body.classList.remove('ai-voice-speaking');}
  }
  function interrupt(){if(window.speechSynthesis)window.speechSynthesis.cancel();speaking=false;document.body.classList.remove('ai-voice-speaking');emit('indicare:voice',{state:'interrupted'});}

  function install(){window.IndiCareVoice={supported:supported(),start:start,stop:stop,toggle:toggle,clear:clear,speak:speak,interrupt:interrupt,getTranscript:function(){return transcript;},isActive:function(){return active;},isSpeaking:function(){return speaking;},voice:function(){return ensureVoice();}};}
  install();
})();
