(function(){
  var K='ic.ai.bridge.v1';
  var state;
  try{state=JSON.parse(localStorage.getItem(K)||'{}');}catch(e){state={};}
  state.conversations=state.conversations||[];
  state.memory=state.memory||{recent:[],themes:[],notes:[],docs:[],meetings:[]};
  state.actions=state.actions||[];
  function save(){localStorage.setItem(K,JSON.stringify(state));}
  function id(p){return p+'-'+Date.now()+'-'+Math.random().toString(16).slice(2);}
  function loadRuntime(src,id){if(document.getElementById(id))return;var s=document.createElement('script');s.id=id;s.src=src;s.defer=false;document.head.appendChild(s);}
  function remember(type,text,meta){var item={id:id('mem'),type:type||'conversation',text:String(text||'').slice(0,4000),meta:meta||{},created_at:new Date().toISOString()};state.memory.recent.unshift(item);state.memory.recent=state.memory.recent.slice(0,160);if(type==='note')state.memory.notes.unshift(item);if(type==='doc')state.memory.docs.unshift(item);if(type==='meeting')state.memory.meetings.unshift(item);detectThemes(text);save();return item;}
  function detectThemes(text){var s=String(text||'').toLowerCase();['safeguarding','ofsted','incident','risk','supervision','meeting','handover','regulation','sccif'].forEach(function(t){if(s.indexOf(t)>-1&&state.memory.themes.indexOf(t)<0)state.memory.themes.push(t);});}
  function addAction(title,source){if(!title)return;var item={id:id('act'),title:String(title).trim(),source:source||'IndiCare AI',status:'open',created_at:new Date().toISOString()};state.actions.unshift(item);state.actions=state.actions.slice(0,120);save();return item;}
  function activeConversation(mode){mode=mode||localStorage.getItem('ic.ai.mode')||'assistant';var c=state.conversations.find(function(x){return x.active&&x.mode===mode;});if(c)return c;c={id:id('conv'),mode:mode,title:'New conversation',active:true,messages:[],created_at:new Date().toISOString()};state.conversations.forEach(function(x){if(x.mode===mode)x.active=false;});state.conversations.unshift(c);save();return c;}
  function appendMessage(mode,role,content){var c=activeConversation(mode);c.messages.push({role:role,content:content,time:new Date().toISOString()});if(c.title==='New conversation'&&role==='user')c.title=String(content||'Conversation').split(/\s+/).slice(0,7).join(' ');remember('conversation',content,{mode:mode,role:role});save();}
  function summary(){return{conversations:state.conversations.length,messages:state.conversations.reduce(function(n,c){return n+c.messages.length;},0),actions:state.actions.filter(function(a){return a.status!=='done';}).length,themes:state.memory.themes,recent:state.memory.recent.slice(0,10)};}
  function installFetchMemory(){if(window.__icAIBridgeFetch)return;window.__icAIBridgeFetch=true;var original=window.fetch;window.fetch=async function(url,opts){try{if(typeof url==='string'&&opts&&opts.body){var body=JSON.parse(opts.body||'{}');if(body.message){appendMessage(localStorage.getItem('ic.ai.mode')||'assistant','user',body.message);}}}catch(e){}return original.apply(this,arguments);};}
  function voice(){var SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;var r=new SR();r.lang='en-GB';r.continuous=true;r.interimResults=true;return r;}
  function installVoice(){window.IndiCareVoice=window.IndiCareVoice||{supported:!!(window.SpeechRecognition||window.webkitSpeechRecognition),create:voice};}
  function expose(){window.IndiCareAI={remember:remember,addAction:addAction,appendMessage:appendMessage,activeConversation:activeConversation,summary:summary,state:state};}
  expose();installVoice();installFetchMemory();loadRuntime('/indicare-ai/intelligence-voice.js','ic-intelligence-voice-runtime');loadRuntime('/indicare-ai/assistant-streaming.js','ic-assistant-streaming-runtime');
})();
