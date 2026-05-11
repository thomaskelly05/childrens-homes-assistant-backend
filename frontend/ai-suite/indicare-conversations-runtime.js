(() => {
  const $ = (id) => document.getElementById(id);
  const qsa = (s,r=document)=>[...r.querySelectorAll(s)];
  const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  const STORAGE_KEY = 'ic_suite_conversations';
  const ACTIVE_KEY = 'ic_active_conversation';

  const state = {
    conversations: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
    active: localStorage.getItem(ACTIVE_KEY) || null,
  };

  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations.slice(0,100)));
    if(state.active) localStorage.setItem(ACTIVE_KEY, state.active);
  }

  function ensureConversationRail(){
    if($('icConversationRail')) return;
    const sidebar = document.querySelector('aside,.sidebar,.left-sidebar');
    if(!sidebar) return;

    const wrap = document.createElement('div');
    wrap.id='icConversationRail';
    wrap.innerHTML = `
      <div class="label ic-conversation-label">Conversations</div>
      <div id="icConversationList"></div>
      <button id="icNewConversation" class="new-chat new">+ New conversation</button>
    `;

    sidebar.appendChild(wrap);
  }

  function currentMessages(){
    return state.conversations.find(c=>c.id===state.active)?.messages || [];
  }

  function createConversation(title='New conversation'){
    const id = `conv-${Date.now()}`;
    state.conversations.unshift({
      id,
      title,
      created_at:new Date().toISOString(),
      messages:[]
    });
    state.active=id;
    save();
    render();
    return id;
  }

  function autoTitle(text){
    return String(text||'Conversation').trim().split(/\s+/).slice(0,6).join(' ').slice(0,60);
  }

  function render(){
    ensureConversationRail();
    const list = $('icConversationList');
    if(!list) return;

    list.innerHTML = state.conversations.map(c=>`
      <div class="item ic-conv ${c.id===state.active?'active':''}" data-conv="${c.id}">
        <div class="ic-conv-title">${esc(c.title)}</div>
        <div class="ic-conv-time">${new Date(c.created_at).toLocaleString()}</div>
      </div>`).join('');

    qsa('[data-conv]').forEach(el=>{
      el.onclick=()=>{
        state.active=el.dataset.conv;
        save();
        hydrateActiveConversation();
        render();
      };
    });
  }

  function appendMessage(role, content){
    if(!state.active) createConversation();

    const conv = state.conversations.find(c=>c.id===state.active);
    if(!conv) return;

    conv.messages.push({role,content,time:new Date().toISOString()});

    if(conv.title==='New conversation' && role==='user'){
      conv.title = autoTitle(content);
    }

    save();
    render();
  }

  function hydrateActiveConversation(){
    const messages = currentMessages();

    const feed = $('messages') || $('icIntelligenceFeed');
    if(!feed) return;

    feed.innerHTML = messages.map(m=>`
      <div class="ic-history-row ${m.role==='user'?'user':'assistant'}">
        <div class="ic-history-bubble">${esc(m.content)}</div>
      </div>`).join('');

    feed.scrollTop = feed.scrollHeight;
  }

  function interceptAssistant(){
    if(window.__icConversationIntercepted) return;
    window.__icConversationIntercepted = true;

    const originalFetch = window.fetch;

    window.fetch = async (...args)=>{
      const [url,opts] = args;

      try{
        if(typeof url === 'string' && url.includes('/assistant/general/stream') && opts?.body){
          const body = JSON.parse(opts.body);
          if(body.message){
            appendMessage('user', body.message);
          }
        }
      }catch(_){ }

      const response = await originalFetch(...args);

      if(typeof url === 'string' && url.includes('/assistant/general/stream') && response.body){
        const clone = response.clone();
        const reader = clone.body.getReader();
        const decoder = new TextDecoder();
        let buffer='';
        let answer='';

        (async()=>{
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
                answer += token + '\n';
              });
            }
          }
          if(answer.trim()){
            appendMessage('assistant', answer.trim());
            hydrateActiveConversation();
          }
        })();
      }

      return response;
    };
  }

  function wire(){
    ensureConversationRail();

    if(!state.active && !state.conversations.length){
      createConversation();
    }

    render();
    hydrateActiveConversation();
    interceptAssistant();

    $('icNewConversation')?.addEventListener('click',()=>{
      createConversation();
      hydrateActiveConversation();
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire);
  else wire();

  setTimeout(wire,800);
})();