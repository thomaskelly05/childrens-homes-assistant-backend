(function(){
  var recognition=null;
  var active=false;
  var transcript='';
  function root(){return document.getElementById('indicareAiRoot');}
  function supported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
  function emit(name,detail){window.dispatchEvent(new CustomEvent(name,{detail:detail||{}}));}
  function create(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;var r=new SR();r.lang='en-GB';r.continuous=true;r.interimResults=true;r.onstart=function(){active=true;emit('indicare:voice',{state:'listening',transcript:transcript});document.body.classList.add('ai-voice-listening');};r.onend=function(){active=false;emit('indicare:voice',{state:'idle',transcript:transcript});document.body.classList.remove('ai-voice-listening');};r.onerror=function(e){active=false;emit('indicare:voice',{state:'error',error:e.error,transcript:transcript});document.body.classList.remove('ai-voice-listening');};r.onresult=function(event){var interim='';var finalText='';for(var i=event.resultIndex;i<event.results.length;i++){var part=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=part;else interim+=part;}if(finalText){transcript=(transcript+' '+finalText).trim();}emit('indicare:voice',{state:'listening',transcript:transcript,interim:interim});};return r;}
  function start(){if(!supported()){emit('indicare:voice',{state:'unsupported'});return false;}if(active)return true;recognition=create();if(!recognition)return false;try{recognition.start();return true;}catch(e){emit('indicare:voice',{state:'error',error:e.message});return false;}}
  function stop(){if(recognition){try{recognition.stop();}catch(e){}}active=false;document.body.classList.remove('ai-voice-listening');emit('indicare:voice',{state:'idle',transcript:transcript});}
  function toggle(){return active?stop():start();}
  function clear(){transcript='';emit('indicare:voice',{state:active?'listening':'idle',transcript:''});}
  function speak(text){if(!('speechSynthesis' in window)||!text)return;try{window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(String(text).slice(0,1200));u.lang='en-GB';u.rate=.94;u.pitch=1;u.volume=1;window.speechSynthesis.speak(u);}catch(e){}}
  function install(){window.IndiCareVoice={supported:supported(),start:start,stop:stop,toggle:toggle,clear:clear,speak:speak,getTranscript:function(){return transcript;},isActive:function(){return active;}};}
  install();
})();
