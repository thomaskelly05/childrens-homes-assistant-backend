(function(){
  if(window.__IndiCareVoiceAudioReactorInstalled)return;
  window.__IndiCareVoiceAudioReactorInstalled=true;
  var ctx=null,analyser=null,source=null,raf=null,data=null;
  function audio(){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();return ctx;}catch(e){return null;}}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=null;try{if(source)source.disconnect();}catch(e){}source=null;document.documentElement.style.removeProperty('--voice-energy');document.body.classList.remove('ai-audio-reactive');}
  function attachStream(stream){stop();var c=audio();if(!c||!stream)return false;analyser=c.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.82;source=c.createMediaStreamSource(stream);source.connect(analyser);data=new Uint8Array(analyser.frequencyBinCount);document.body.classList.add('ai-audio-reactive');loop();return true;}
  function loop(){if(!analyser||!data)return;analyser.getByteFrequencyData(data);var total=0;for(var i=0;i<data.length;i++)total+=data[i];var energy=Math.min(1,total/(data.length*128));document.documentElement.style.setProperty('--voice-energy',energy.toFixed(3));window.dispatchEvent(new CustomEvent('indicare:voice-energy',{detail:{energy:energy}}));raf=requestAnimationFrame(loop);}
  window.addEventListener('indicare:realtime-webrtc',function(e){var d=e.detail||{};if(d.type==='audio'&&d.stream)attachStream(d.stream);if(d.type==='fallback')stop();});
  window.addEventListener('indicare:realtime',function(e){var d=e.detail||{};if(d.type==='state'&&!d.connected&&!d.connecting)stop();});
  window.IndiCareVoiceAudioReactor={attachStream:attachStream,stop:stop};
})();