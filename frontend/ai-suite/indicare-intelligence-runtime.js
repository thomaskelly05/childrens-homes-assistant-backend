(() => {
  const $ = (id) => document.getElementById(id);
  const qsa = (s,r=document)=>[...r.querySelectorAll(s)];

  const state = {
    messages: JSON.parse(localStorage.getItem('ic_intelligence_messages') || '[]'),
    listening: false,
  };

  function save(){
    localStorage.setItem('ic_intelligence_messages', JSON.stringify(state.messages.slice(-40)));
  }

  function ensureLayout(){
    const screen = $('intelligenceScreen') || document.querySelector('[data-app="intelligence"]');
    if(!screen || $('icIntelligenceShell')) return;

    screen.innerHTML = `
      <div id="icIntelligenceShell" style="display:grid;grid-template-columns:320px 1fr;height:100%;background:#0f172a;color:#fff;">
        <aside style="border-right:1px solid rgba(255,255,255,.08);padding:18px;overflow:auto;">
          <h2 style="margin:0 0 12px">IndiCare Intelligence</h2>
          <p style="color:#94a3b8">Your operational AI companion.</p>
          <button id="icStartVoice" style="width:100%;padding:12px;border-radius:14px;border:0;background:#2563eb;color:#fff;font-weight:700;margin-top:12px;">Start conversation</button>
          <button id="icStopVoice" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#fff;font-weight:700;margin-top:10px;">Stop</button>
          <div style="margin-top:24px">
            <h4>Modes</h4>
            <button data-ic-mode="everyday" class="icModeBtn">Everyday</button>
            <button data-ic-mode="specialist" class="icModeBtn">Specialist</button>
          </div>
        </aside>
        <main style="display:flex;flex-direction:column;height:100%;">
          <div id="icIntelligenceFeed" style="flex:1;overflow:auto;padding:28px"></div>
          <div style="padding:18px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:12px;">
            <textarea id="icIntelligenceInput" placeholder="Talk naturally with IndiCare..." style="flex:1;min-height:72px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:#111827;color:#fff;padding:14px"></textarea>
            <button id="icIntelligenceSend" style="width:140px;border-radius:18px;border:0;background:#2563eb;color:#fff;font-weight:700;">Send</button>
          </div>
        </main>
      </div>`;

    qsa('.icModeBtn').forEach((b)=>{
      b.style.cssText='display:block;width:100%;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#111827;color:#fff;margin-top:8px;cursor:pointer';
      b.onclick=()=>localStorage.setItem('ic_orb_mode', b.dataset.icMode);
    });
  }

  function render(){
    const feed = $('icIntelligenceFeed');
    if(!feed) return;
    feed.innerHTML = state.messages.map((m)=>`
      <div style="margin-bottom:18px;display:flex;justify-content:${m.role==='user'?'flex-end':'flex-start'}">
        <div style="max-width:820px;padding:18px;border-radius:22px;background:${m.role==='user'?'#2563eb':'#111827'};white-space:pre-wrap;line-height:1.6">${m.content}</div>
      </div>`).join('');
    feed.scrollTop = feed.scrollHeight;
  }

  async function send(){
    const input = $('icIntelligenceInput');
    if(!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value='';
    state.messages.push({role:'user',content:text});
    render();
    save();

    const res = await fetch('/assistant/general/stream',{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        message:text,
        assistant_mode:'intelligence',
        assistant_surface:'ai-suite',
        response_mode:'balanced',
        history:state.messages.slice(-8),
        project_id:localStorage.getItem('ic_active_project')||'general'
      })
    });

    if(!res.body) return;

    const ai = {role:'assistant',content:''};
    state.messages.push(ai);
    render();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer='';

    while(true){
      const {value,done}=await reader.read();
      if(done) break;
      buffer += decoder.decode(value,{stream:true});
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for(const part of parts){
        if(part.startsWith('event:')) continue;
        part.split('\n').forEach((line)=>{
          if(!line.startsWith('data:')) return;
          const token = line.slice(5).trim();
          if(!token || token==='[DONE]') return;
          ai.content += token + '\n';
          render();
        });
      }
    }

    save();

    if(window.speechSynthesis){
      const u = new SpeechSynthesisUtterance(ai.content.slice(0,1500));
      u.lang='en-GB';
      u.rate=.95;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
  }

  function wire(){
    ensureLayout();
    render();

    $('icIntelligenceSend')?.addEventListener('click', send);

    $('icIntelligenceInput')?.addEventListener('keydown',(e)=>{
      if(e.key==='Enter' && !e.shiftKey){
        e.preventDefault();
        send();
      }
    });

    $('icStartVoice')?.addEventListener('click',()=>{
      window.IndiCareOrbAI?.startConversation?.('orb');
    });

    $('icStopVoice')?.addEventListener('click',()=>{
      window.IndiCareOrbAI?.stopConversation?.();
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire);
  else wire();

  setTimeout(wire,800);
})();