(function(){
  if(window.__IndiCareFallbackVoiceInstalled)return;
  window.__IndiCareFallbackVoiceInstalled=true;

  var recognition=null;
  var active=false;
  var transcript='';
  var speaking=false;
  var preferredVoice=null;
  var silenceTimer=null;
  var restartTimer=null;
  var keepAlive=false;
  var lastFinalAt=0;

  function emit(detail){window.dispatchEvent(new CustomEvent('indicare:voice',{detail:detail||{}}));}
  function supported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
  function voices(){return ('speechSynthesis' in window)?window.speechSynthesis.getVoices():[];}
  function pickVoice(){
    var list=voices();
    if(!list.length)return null;
    return list.find(function(v){return /en-GB/i.test(v.lang)&&/Sonia|Libby|Serena|Kate|Female|Hazel/i.test(v.name);})||
      list.find(function(v){return /Sonia|Libby|Serena|Kate|Samantha|Hazel/i.test(v.name);})||
      list.find(function(v){return /en-GB/i.test(v.lang);})||
      list.find(function(v){return /en/i.test(v.lang);})||list[0];
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
    r.onstart=function(){active=true;document.body.classList.add('ai-voice-listening');emit({state:'listening',transcript:transcript,interim:''});};
    r.onend=function(){
      active=false;
      document.body.classList.remove('ai-voice-listening');
      if(keepAlive&&!speaking){restartTimer=setTimeout(startRecognition,260);}
      else emit({state:'idle',transcript:transcript,interim:''});
    };
    r.onerror=function(e){
      active=false;
      document.body.classList.remove('ai-voice-listening');
      emit({state:'error',error:e.error||e.message,transcript:transcript});
      if(keepAlive&&!speaking){restartTimer=setTimeout(startRecognition,650);}
    };
    r.onresult=function(event){
      var interim='';
      var finalText='';
      for(var i=event.resultIndex;i<event.results.length;i++){
        var part=event.results[i][0].transcript;
        if(event.results[i].isFinal)finalText+=part;
        else interim+=part;
      }
      if(finalText){
        transcript=(transcript+' '+finalText).replace(/\s+/g,' ').trim();
        lastFinalAt=Date.now();
      }
      emit({state:'listening',transcript:transcript,interim:interim.trim()});
      clearTimeout(silenceTimer);
      if(transcript||interim){
        silenceTimer=setTimeout(function(){
          if(!keepAlive)return;
          var current=transcript.trim();
          if(current&&Date.now()-lastFinalAt>900){
            var completed=current;
            transcript='';
            emit({state:'final',transcript:completed,interim:''});
          }
        },1450);
      }
    };
    return r;
  }

  function startRecognition(){
    if(!supported())return false;
    if(active||speaking)return true;
    recognition=create();
    try{recognition.start();return true;}catch(e){emit({state:'error',error:e.message});return false;}
  }

  function start(){
    keepAlive=true;
    transcript='';
    if(speaking&&window.speechSynthesis)window.speechSynthesis.cancel();
    return startRecognition();
  }

  function stop(reason){
    keepAlive=false;
    clearTimeout(silenceTimer);
    clearTimeout(restartTimer);
    if(recognition){try{recognition.stop();}catch(e){}}
    active=false;
    document.body.classList.remove('ai-voice-listening');
    emit({state:'idle',reason:reason||'manual',transcript:transcript,interim:''});
  }

  function toggle(){return keepAlive?stop('manual'):start();}
  function clear(){transcript='';emit({state:active?'listening':'idle',transcript:'',interim:''});}

  function chunks(text){
    var clean=String(text||'').replace(/\s+/g,' ').trim();
    if(!clean)return [];
    return (clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[clean]).map(function(x){return x.trim();}).filter(Boolean).flatMap(function(p){return p.length>180?p.split(/,|;|:/).map(function(x){return x.trim();}).filter(Boolean):[p];}).slice(0,12);
  }

  function speak(text){
    if(!('speechSynthesis' in window)||!text)return;
    try{
      if(recognition){try{recognition.stop();}catch(e){}}
      window.speechSynthesis.cancel();
      var list=chunks(text);
      var v=ensureVoice();
      speaking=true;
      active=false;
      document.body.classList.remove('ai-voice-listening');
      document.body.classList.add('ai-voice-speaking');
      emit({state:'speaking',text:text});
      var i=0;
      function next(){
        if(i>=list.length){
          speaking=false;
          document.body.classList.remove('ai-voice-speaking');
          emit({state:'spoken'});
          if(keepAlive)restartTimer=setTimeout(startRecognition,320);
          return;
        }
        var u=new SpeechSynthesisUtterance(list[i++]);
        if(v)u.voice=v;
        u.lang=(v&&v.lang)||'en-GB';
        u.rate=.92;
        u.pitch=1.08;
        u.volume=1;
        u.onend=function(){setTimeout(next,90);};
        u.onerror=function(){setTimeout(next,60);};
        window.speechSynthesis.speak(u);
      }
      next();
    }catch(e){speaking=false;document.body.classList.remove('ai-voice-speaking');if(keepAlive)startRecognition();}
  }

  function interrupt(){
    if(window.speechSynthesis)window.speechSynthesis.cancel();
    speaking=false;
    document.body.classList.remove('ai-voice-speaking');
    emit({state:'interrupted'});
    if(keepAlive)startRecognition();
  }

  window.IndiCareVoice={supported:supported(),start:start,stop:stop,toggle:toggle,clear:clear,speak:speak,interrupt:interrupt,getTranscript:function(){return transcript;},isActive:function(){return active;},isSpeaking:function(){return speaking;},isKeepingAlive:function(){return keepAlive;},voice:function(){return ensureVoice();}};
})();