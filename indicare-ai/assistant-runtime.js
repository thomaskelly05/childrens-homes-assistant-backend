(function(){
if(window.__IndiCarePremiumRuntime)return;
window.__IndiCarePremiumRuntime=true;
window.__INDICARE_BOOT_OK=true;

const templates={
'Supervision':'Purpose\n\nReflection\n\nSafeguarding\n\nActions',
'SCCIF':'Evidence\n\nImpact\n\nLeadership\n\nActions',
'Reg 44':'Recommendation\n\nResponse\n\nOwner\n\nDeadline',
'Meeting':'Agenda\n\nDiscussion\n\nActions\n\nReview'
};

const state={
mode:localStorage.getItem('ic.mode')||'assistant',
messages:JSON.parse(localStorage.getItem('ic.messages')||'[]'),
notes:localStorage.getItem('ic.notes')||'',
search:'',
voice:false,
thread:localStorage.getItem('ic.thread')||'main',
docTitle:localStorage.getItem('ic.docTitle')||'Untitled professional document',
docBody:localStorage.getItem('ic.docBody')||''
};

function save(){
localStorage.setItem('ic.mode',state.mode);
localStorage.setItem('ic.messages',JSON.stringify(state.messages.slice(-200)));
localStorage.setItem('ic.notes',state.notes);
localStorage.setItem('ic.thread',state.thread);
localStorage.setItem('ic.docTitle',state.docTitle);
localStorage.setItem('ic.docBody',state.docBody);
}

function esc(v){return String(v||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}

function layout(){
return `
<div class="ai-app ${state.mode==='intelligence'?'is-dark intelligence-mode':''}">
${sidebar()}
<main class="ai-main premium-shell">
${header()}
<div class="premium-body">
${surface()}
${inspector()}
</div>
${composer()}
</main>
</div>`;
}

function sidebar(){
return `<aside class="ai-rail smart glass">
<div class="ai-brand"><div>IC</div><span><strong>IndiCare AI</strong><small>Residential care professional</small></span></div>
<button class="side-new" data-action="new">+ New chat</button>
<input class="side-search real" placeholder="Search conversations">
<nav>
${nav('assistant','Assistant','Full ChatGPT copilot')}
${nav('connect','Connect','Outlook + Teams + Calendar')}
${nav('notes','I-Notes','Beam / Magic Notes')}
${nav('docs','Docs','Word processor + care templates')}
${nav('intelligence','Intelligence','ChatGPT Voice style presence')}
</nav>
<div class="side-title">Conversations</div>
<div class="side-convos"><button class="side-convo active">Hello Indica<small>3 messages</small></button></div>
<div class="profile-card"><div class="avatar">A</div><span><strong>Adult professional</strong><small>Runtime active</small></span></div>
</aside>`;
}

function nav(mode,title,sub){
return `<button class="${state.mode===mode?'active':''}" data-mode="${mode}"><b>${title[0]}</b><span><strong>${title}</strong><small>${sub}</small></span></button>`;
}

function header(){
return `<header class="ai-header glass-header"><div><p>${state.mode==='intelligence'?'CHATGPT VOICE STYLE PRESENCE':'FULL CHATGPT COPILOT'}</p><h1>${cap(state.mode)}</h1><span>${subtitle()}</span></div><div class="ai-header-actions"><button data-action="new">New thread</button><button data-action="save">Save action</button></div></header>`;
}

function subtitle(){
if(state.mode==='assistant')return 'Ask, draft, reflect and plan with one professional AI.';
if(state.mode==='connect')return 'Email, calls, meetings and follow-ups with AI built in.';
if(state.mode==='notes')return 'Voice-aware notes that become document-ready outputs.';
if(state.mode==='docs')return 'SCCIF, Ofsted, supervision and leadership documents.';
return 'Click the orb and start a natural conversation.';
}

function surface(){
if(state.mode==='assistant')return assistant();
if(state.mode==='connect')return connect();
if(state.mode==='notes')return notes();
if(state.mode==='docs')return docs();
return intelligence();
}

function assistant(){
return `<section class="assistant-hero"><div class="hero-glow"></div><div class="ai-orb premium"></div><h2>Think, write and work naturally.</h2><p>A calm professional AI workspace for adults working in residential children's homes.</p><div class="ai-starters premium-grid"><button data-starter="Help me think through a difficult shift calmly"><strong>Think through a shift</strong><span>Reflect calmly</span></button><button data-starter="Turn these notes into a professional handover"><strong>Professional handover</strong><span>Write clearly</span></button><button data-starter="Prepare me for supervision tomorrow"><strong>Supervision prep</strong><span>Structure thinking</span></button><button data-starter="Help me prioritise calmly"><strong>Prioritise</strong><span>Plan next steps</span></button></div></section>`;
}

function connect(){
return `<section class="connect-premium"><div class="connect-card"><h3>Mail Intelligence</h3><p>Draft replies, summarise threads and extract actions.</p></div><div class="connect-card"><h3>Teams Intelligence</h3><p>Realtime operational summaries and safeguarding escalation support.</p></div><div class="connect-card"><h3>Calendar Intelligence</h3><p>Professional meeting preparation and follow-up generation.</p></div></section>`;
}

function notes(){
return `<section class="notes-premium"><div class="recording-panel glass-card"><div class="record-orb"></div><h2>Voice-aware notes</h2><p>Speak, paste or type. Transform into document-ready outputs.</p><button data-action="voice">${state.voice?'Stop capture':'Start capture'}</button></div><div class="notes-editor glass-card"><textarea id="notesInput" placeholder="Rough notes...">${esc(state.notes)}</textarea><div class="note-tools"><button>Summary</button><button>Supervision</button><button>Minutes</button><button>Care review</button></div></div></section>`;
}

function docs(){
return `<section class="docs-premium"><aside class="template-sidebar glass-card">${Object.keys(templates).map(t=>`<button data-template="${t}">${t}</button>`).join('')}</aside><div class="docs-editor glass-card"><input id="docTitle" value="${esc(state.docTitle)}"><textarea id="docBody" placeholder="Start writing...">${esc(state.docBody)}</textarea><div class="floating-tools"><button>Improve</button><button>Professional tone</button><button>SCCIF review</button></div></div></section>`;
}

function intelligence(){
return `<section class="voice-premium"><div class="voice-gradient"></div><div class="voice-presence-bar"><div class="presence-pill active">Realtime conversational</div><div class="presence-pill">Low latency</div><div class="presence-pill">British female voice</div></div><button class="voice-orb premium ${state.voice?'listening':''}" data-action="voice"><span></span><b>${state.voice?'Listening':'START'}</b></button><h2>Click the orb and talk naturally</h2><p>Intelligence listens, reasons, responds and remembers across the entire workspace.</p><div class="voice-transcript premium">${messages()}</div></section>`;
}

function messages(){
if(!state.messages.length)return `<div class="empty-state">Realtime conversational intelligence ready.</div>`;
return state.messages.map(m=>`<article class="voice-line ${m.role}"><label>${m.role==='assistant'?'IndiCare':'You'}</label><span>${esc(m.content)}</span></article>`).join('');
}

function inspector(){
return `<aside class="right-inspector"><div class="glass-card"><h3>Live Intelligence</h3><div class="metric"><span>Emotion</span><b>Calm</b></div><div class="metric"><span>Latency</span><b>320ms</b></div><div class="metric"><span>Memory</span><b>Active</b></div><div class="metric"><span>Reasoning</span><b>Live</b></div></div></aside>`;
}

function composer(){
return `<div class="ai-composer premium"><textarea id="prompt" placeholder="Message IndiCare AI..."></textarea><div><button data-action="upload">Upload</button><button data-action="voice">Voice</button><button data-action="send">Send</button></div></div>`;
}

function cap(v){return v.charAt(0).toUpperCase()+v.slice(1);}

function render(){
const root=document.getElementById('indicareAiRoot');
if(root)root.innerHTML=layout();
bind();
}

function bind(){
document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{state.mode=el.dataset.mode;save();render();});
const send=document.querySelector('[data-action="send"]');
if(send)send.onclick=submit;
document.querySelectorAll('[data-action="voice"]').forEach(v=>v.onclick=toggleVoice);
document.querySelectorAll('[data-template]').forEach(t=>t.onclick=()=>{state.docTitle=t.dataset.template;state.docBody=templates[t.dataset.template]||'';save();render();});
}

async function submit(){
const input=document.getElementById('prompt');
if(!input||!input.value.trim())return;
const text=input.value.trim();
input.value='';
state.messages.push({role:'user',content:text});
render();
try{
const res=await fetch('/assistant/general-safe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});
const data=await res.json();
state.messages.push({role:'assistant',content:data.answer||data.response||'Ready.'});
}catch(e){state.messages.push({role:'assistant',content:'Connection issue.'});}
save();
render();
}

function toggleVoice(){
state.voice=!state.voice;
if(window.IndiCareIntelligenceLive){state.voice?window.IndiCareIntelligenceLive.start():window.IndiCareIntelligenceLive.stop();}
save();
render();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();