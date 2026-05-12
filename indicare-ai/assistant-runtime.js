(function(){
  if(window.__IndiCareAssistantRuntimeMounted)return;
  window.__IndiCareAssistantRuntimeMounted=true;

  var modes={assistant:['Assistant','Full ChatGPT copilot','Ask, draft, reflect and plan with one professional AI.'],connect:['Connect','Outlook + Teams + Calendar','Email, calls, meetings, channels and follow-ups with AI built in.'],notes:['I-Notes','Beam / Magic Notes','Voice-aware notes that become document-ready outputs.'],docs:['Docs','Word processor + care templates','SCCIF, Ofsted, supervision and leadership documents.'],intelligence:['Intelligence','ChatGPT Voice style presence','Click the orb and start a natural conversation.']};
  var templates={'Supervision record':'Purpose\n\nWellbeing check-in\n\nPractice reflection\n\nSafeguarding discussion\n\nDevelopment needs\n\nActions agreed\n\nReview date'};
  function read(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f));}catch(e){return f;}}
  var state={mode:localStorage.getItem('ic.ai.mode')||'assistant',messages:read('ic.ai.messages',[]),uploads:read('ic.ai.uploads',[]),notes:localStorage.getItem('ic.ai.notes')||'',docTitle:localStorage.getItem('ic.ai.docTitle')||'Untitled professional document',docBody:localStorage.getItem('ic.ai.docBody')||'',profile:read('ic.ai.profile',{name:'Adult professional',role:'Residential care professional'}),busy:false,voice:false,profileOpen:false,cmdOpen:false,search:''};
  var rendering=false;

  function save(){try{localStorage.setItem('ic.ai.mode',state.mode);localStorage.setItem('ic.ai.messages',JSON.stringify(state.messages.slice(-220)));localStorage.setItem('ic.ai.uploads',JSON.stringify(state.uploads.slice(0,40)));localStorage.setItem('ic.ai.notes',state.notes);localStorage.setItem('ic.ai.docTitle',state.docTitle);localStorage.setItem('ic.ai.docBody',state.docBody);localStorage.setItem('ic.ai.profile',JSON.stringify(state.profile));}catch(e){}}
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function currentThread(){return localStorage.getItem('ic.ai.thread')||'default';}
  function autoTitle(t){return String(t||'Conversation').trim().split(/\s+/).slice(0,7).join(' ');}

  function conversations(){
    var map={};
    state.messages.forEach(function(m){
      var id=m.thread||'default';
      if(!map[id])map[id]={id:id,title:'New conversation',count:0};
      map[id].count++;
      if(m.role==='user'&&map[id].title==='New conversation')map[id].title=autoTitle(m.content);
    });
    return Object.values(map).filter(function(c){return !state.search||c.title.toLowerCase().indexOf(state.search.toLowerCase())>-1;}).slice(0,24);
  }

  function layout(){return '<div class="ai-app '+(state.mode==='intelligence'?'intelligence-mode':'')+'"><aside class="ai-rail"><div class="ai-brand">IndiCare Intelligence</div><button data-action="new">+ New chat</button><input class="side-search" data-search value="'+esc(state.search)+'" placeholder="Search"><nav>'+Object.keys(modes).map(function(k){return '<button class="'+(state.mode===k?'active':'')+'" data-mode="'+k+'">'+modes[k][0]+'</button>';}).join('')+'</nav><div class="side-convos">'+conversations().map(function(c){return '<button data-thread="'+c.id+'">'+esc(c.title)+'</button>';}).join('')+'</div></aside><main class="ai-main">'+surface()+composer()+'</main><input id="aiFileInput" type="file" multiple hidden></div>';}

  function messages(list){return list.map(function(m){return '<article class="ai-message '+m.role+'"><p>'+esc(m.content)+'</p></article>';}).join('');}

  function surface(){
    var msgs=state.messages.filter(function(m){return (m.thread||'default')===currentThread()&&m.mode===state.mode;});
    if(state.mode==='intelligence')return '<section class="voice-stage"><button class="voice-orb '+(state.voice?'listening':'')+'" data-action="voice">'+(state.voice?'Listening':'Start')+'</button><div class="voice-transcript">'+(msgs.length?messages(msgs):'<em>Start speaking…</em>')+'</div></section>';
    if(state.mode==='notes')return '<section class="notes-shell"><textarea id="notesInput">'+esc(state.notes)+'</textarea></section>';
    if(state.mode==='docs')return '<section class="docs-shell"><input id="docTitle" value="'+esc(state.docTitle)+'"><textarea id="docBody">'+esc(state.docBody)+'</textarea></section>';
    return '<section class="ai-conversation">'+messages(msgs)+'</section>';
  }

  function composer(){return '<div class="ai-composer"><textarea id="prompt" placeholder="Message IndiCare Intelligence..."></textarea><div><button data-action="upload">Upload</button><button data-action="voice">Voice</button><button data-action="send">Send</button></div></div>';}

  function render(){
    if(rendering)return;
    rendering=true;
    requestAnimationFrame(function(){
      var r=document.getElementById('indicareAiRoot');
      if(r)r.innerHTML=layout();
      rendering=false;
    });
  }

  async function send(text){
    var el=document.getElementById('prompt');
    var clean=String(text||(el&&el.value)||'').trim();
    if(!clean||state.busy)return;
    state.messages.push({role:'user',mode:state.mode,thread:currentThread(),content:clean});
    state.busy=true;
    save();
    render();
    try{
      var res=await fetch('/assistant/general-safe',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:clean,history:state.messages.slice(-10),profile:state.profile})});
      var data=await res.json();
      var answer=data.answer||data.response||'I am here.';
      state.messages.push({role:'assistant',mode:state.mode,thread:currentThread(),content:answer});
      if(state.mode==='intelligence'&&window.IndiCareVoice&&window.IndiCareVoice.speak)window.IndiCareVoice.speak(answer);
    }catch(e){
      state.messages.push({role:'assistant',mode:state.mode,thread:currentThread(),content:'Connection issue. Please retry.'});
    }
    state.busy=false;
    save();
    render();
  }

  function toggleVoice(){
    state.voice=!state.voice;
    if(window.IndiCareVoice&&window.IndiCareVoice.toggle)window.IndiCareVoice.toggle();
    render();
  }

  function uploadFiles(files){Array.from(files||[]).forEach(function(f){state.uploads.unshift({name:f.name,size:f.size});});save();}

  document.body.addEventListener('click',function(e){
    var mode=e.target.closest('[data-mode]');
    if(mode){state.mode=mode.dataset.mode;save();render();return;}
    var action=e.target.closest('[data-action]');
    if(action){
      var a=action.dataset.action;
      if(a==='send')send();
      if(a==='voice')toggleVoice();
      if(a==='new'){localStorage.setItem('ic.ai.thread','t'+Date.now());render();}
      if(a==='upload'){var f=document.getElementById('aiFileInput');if(f)f.click();}
    }
    var thread=e.target.closest('[data-thread]');
    if(thread){localStorage.setItem('ic.ai.thread',thread.dataset.thread);render();}
  },{passive:true});

  document.body.addEventListener('input',function(e){
    if(e.target.dataset.search!==undefined){state.search=e.target.value;render();}
    if(e.target.id==='notesInput')state.notes=e.target.value;
    if(e.target.id==='docTitle')state.docTitle=e.target.value;
    if(e.target.id==='docBody')state.docBody=e.target.value;
    save();
  },{passive:true});

  document.body.addEventListener('change',function(e){if(e.target.id==='aiFileInput')uploadFiles(e.target.files);},{passive:true});

  document.body.addEventListener('keydown',function(e){if(e.target.id==='prompt'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});

  window.addEventListener('indicare:voice',function(e){
    if(!e.detail)return;
    if(e.detail.state==='idle'&&e.detail.transcript&&state.mode==='intelligence'){
      send(e.detail.transcript);
    }
  },{passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();