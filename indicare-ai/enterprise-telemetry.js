(function(){
  if(window.__IndiCareEnterpriseTelemetryInstalled)return;
  window.__IndiCareEnterpriseTelemetryInstalled=true;
  var metrics={sessions:0,avgLatency:0,interruptions:0,transcripts:0,errors:0,connected:false,last:null,providers:{openai_realtime:0,fallback:0}};
  var started=Date.now();
  function persist(){try{localStorage.setItem('ic.ai.telemetry',JSON.stringify(metrics));}catch(e){}}
  function emit(){window.dispatchEvent(new CustomEvent('indicare:telemetry',{detail:metrics}));}
  function calcLatency(){var now=Date.now();metrics.avgLatency=Math.round((metrics.avgLatency+Math.max(1,now-started))/2);started=now;}
  window.addEventListener('indicare:realtime-webrtc',function(e){var d=e.detail||{};metrics.last=d.type||'event';if(d.type==='ready'){metrics.sessions++;metrics.connected=true;metrics.providers.openai_realtime++;calcLatency();}if(d.type==='fallback'){metrics.providers.fallback++;metrics.errors++;}if(d.type==='barge_in')metrics.interruptions++;if(d.type==='transcript')metrics.transcripts++;if(d.type==='error')metrics.errors++;if(d.type==='disconnected')metrics.connected=false;persist();emit();});
  window.IndiCareEnterpriseTelemetry={get:function(){return metrics;}};
})();