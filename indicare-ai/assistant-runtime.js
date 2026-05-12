(function(){
try{
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
messages:safeJson(localStorage.getItem('ic.messages'),[]),
notes:localStorage.getItem('ic.notes')||'',
voice:false,
thread:localStorage.getItem('ic.thread')||'main'
};

function safeJson(value,fallback){
try{return JSON.parse(value||'')}catch{return fallback}
}

function save(){
try{
localStorage.setItem('ic.mode',state.mode);
localStorage.setItem('ic.messages',JSON.stringify(state.messages.slice(-200)));
localStorage.setItem('ic.notes',state.notes);
localStorage.setItem('ic.thread',state.thread);
}catch(e){
console.warn('Persistence warning',e);
}
}

function esc(v){
return String(v||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

function layout(){
return `<div class="ai-app ${state.mode==='intelligence'?'is-dark intelligence-mode':''}">
${sidebar()}
<main class="ai-main premium-shell">
${header()}
<div class="premium-body ${state.mode==='intelligence'?'voice-only-body':''}">
${surface()}
</div>
${state.mode==='assistant'?composer():''}
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
</aside>`;
}

function nav(mode,title,sub){
return `<button class="${state.mode===mode?'active':''}" data-mode="${mode}"><b>${title[0]}</b><span><strong>${title}</strong><small>${sub}</small></span></button>`;
}

function header(){
return `<header class="ai-header glass-header">
<div>
<p>${state.mode==='intelligence'?'CHATGPT VOICE STYLE PRESENCE':'FULL CHATGPT COPILOT'}</p>
<h1>${cap(state.mode)}</h1>
<span>${subtitle()}</span>
</div>
<div class="ai-header-actions">
<button data-action="new">New thread</button>
<button data-action="voice">${state.voice?'Voice active':'Voice ready'}</button>
</div>
</header>`;
}

function subtitle(){
if(state.mode==='assistant')return 'Ask, draft, reflect and plan with one professional AI.';
if(state.mode==='connect')return 'Email, calls, meetings and follow-ups with AI built in.';
if(state.mode==='notes')return 'Voice-aware notes that become document-ready outputs.';
if(state.mode==='docs')return 'SCCIF, Ofsted, supervision and leadership documents.';
return 'Presence-led conversation. No typing, no transcript panel.';
}

function surface(){
if(state.mode==='assistant')return assistant();
if(state.mode==='connect')return connect();
if(state.mode==='notes')return notes();
if(state.mode==='docs')return docs();
return intelligence();
}

function assistant(){
return `<section class="assistant-hero">
<div class="hero-glow"></div>
<div class="ai-orb premium"></div>
<h2>Think, write and work naturally.</h2>
<p>A calm professional AI workspace for adults working in residential children's homes.</p>
</section>`;
}

function connect(){
return `<section class="connect-premium">
<div class="connect-card"><h3>Mail Intelligence</h3><p>Outlook summaries and drafting.</p></div>
<div class="connect-card"><h3>Teams Intelligence</h3><p>Meeting extraction and continuity.</p></div>
<div class="connect-card"><h3>Calendar Intelligence</h3><p>Operational planning support.</p></div>
</section>`;
}

function notes(){
return `<section class="notes-premium">
<div class="recording-panel glass-card">
<div class="record-orb"></div>
<h2>Voice-aware notes</h2>
<p>Capture thoughts naturally and structure later.</p>
</div>
<div class="notes-editor glass-card">
<textarea id="notesInput" placeholder="Rough notes...">${esc(state.notes)}</textarea>
</div>
</section>`;
}

function docs(){
return `<section class="docs-premium">
<aside class="template-sidebar glass-card">
${Object.keys(templates).map(t=>`<button data-template="${t}">${t}</button>`).join('')}
</aside>
<div class="docs-editor glass-card">
<input id="docTitle" value="Professional document">
<textarea id="docBody" placeholder="Start writing..."></textarea>
</div>
</section>`;
}

function intelligence(){
return `<section class="voice-premium fullscreen-voice no-transcript">
<div class="voice-gradient"></div>
<div class="voice-presence-bar">
<div class="presence-pill active">Realtime conversational</div>
<div class="presence-pill">Continuous listening</div>
<div class="presence-pill">British female voice</div>
</div>
<button class="voice-orb premium ${state.voice?'listening':''}" data-action="voice">
<b>${state.voice?'Listening':'START'}</b>
</button>
<h2>${state.voice?'Conversation active':'Talk naturally'}</h2>
<p>${state.voice?'Speech session active':'Click the orb. Conversation happens through presence and speech.'}</p>
</section>`;
}

function composer(){
return `<div class="ai-composer premium">
<textarea id="prompt" placeholder="Message IndiCare AI..."></textarea>
<div>
<button data-action="upload">Upload</button>
<button data-action="voice">Voice</button>
<button data-action="send">Send</button>
</div>
</div>`;
}

function cap(v){
return v.charAt(0).toUpperCase()+v.slice(1);
}

function render(){
const root=document.getElementById('indicareAiRoot');
if(!root)return;
root.innerHTML=layout();
bind();
}

function bind(){
document.querySelectorAll('[data-mode]').forEach(el=>{
el.onclick=()=>{
state.mode=el.dataset.mode;
save();
render();
};
});

const send=document.querySelector('[data-action="send"]');
if(send)send.onclick=submit;

Array.from(document.querySelectorAll('[data-action="voice"]')).forEach(v=>{
v.onclick=toggleVoice;
});
}

async function submit(){
const input=document.getElementById('prompt');
if(!input||!input.value.trim())return;

const text=input.value.trim();
input.value='';

state.messages.push({role:'user',content:text});
render();

try{
const res=await fetch('/assistant/general-safe',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({message:text})
});

const data=await res.json();

state.messages.push({
role:'assistant',
content:data.answer||data.response||'Ready.'
});
}catch(e){
console.error(e);
state.messages.push({role:'assistant',content:'Connection issue.'});
}

save();
render();
}

function toggleVoice(){
state.voice=!state.voice;

try{
if(window.IndiCareIntelligenceLive){
state.voice
?window.IndiCareIntelligenceLive.start()
:window.IndiCareIntelligenceLive.stop();
}
}catch(e){
console.error('Voice runtime error',e);
}

save();
render();
}

window.addEventListener('error',e=>{
console.error('Runtime error',e.error||e.message);
});

window.addEventListener('unhandledrejection',e=>{
console.error('Unhandled promise rejection',e.reason);
});

if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',render,{once:true});
}else{
render();
}
}catch(error){
console.error('Fatal IndiCare runtime failure',error);
const root=document.getElementById('indicareAiRoot');
if(root){
root.innerHTML=`<div style="background:#020617;color:white;min-height:100vh;padding:40px;font-family:Inter,sans-serif"><h1>IndiCare Runtime Recovery</h1><p>The assistant runtime recovered from an error.</p><pre>${String(error)}</pre></div>`;
}
}
})();