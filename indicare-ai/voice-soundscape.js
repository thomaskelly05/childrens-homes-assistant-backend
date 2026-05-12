(function(){
  if(window.__IndiCareVoiceSoundscapeInstalled)return;
  window.__IndiCareVoiceSoundscapeInstalled=true;
  var ctx=null;
  function audio(){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();return ctx;}catch(e){return null;}}
  function tone(freq,duration,gain,type){var c=audio();if(!c)return;var o=c.createOscillator();var g=c.createGain();o.type=type||'sine';o.frequency.value=freq;g.gain.value=0.0001;o.connect(g);g.connect(c.destination);o.start();g.gain.exponentialRampToValueAtTime(gain||0.035,c.currentTime+0.03);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+(duration||0.18));o.stop(c.currentTime+(duration||0.18)+0.03);} 
  function softStart(){tone(520,0.16,0.025,'sine');setTimeout(function(){tone(720,0.18,0.018,'sine');},95);} 
  function softEnd(){tone(420,0.18,0.018,'sine');setTimeout(function(){tone(320,0.22,0.012,'sine');},90);} 
  function thinking(){tone(240,0.28,0.01,'triangle');} 
  function error(){tone(180,0.2,0.028,'sawtooth');}
  window.addEventListener('indicare:realtime-webrtc',function(e){var d=e.detail||{};if(d.type==='ready')softStart();if(d.type==='fallback')error();});
  window.addEventListener('indicare:realtime',function(e){var d=e.detail||{};if(d.type==='state'&&d.thinking)thinking();if(d.type==='state'&&!d.connected&&!d.connecting)softEnd();});
  window.IndiCareVoiceSoundscape={start:softStart,end:softEnd,thinking:thinking,error:error};
})();