(() => {
  const STORAGE='ic_operational_memory';

  const state={
    memory: JSON.parse(localStorage.getItem(STORAGE)||'{"projects":{},"themes":[],"recent":[]}')
  };

  function save(){
    localStorage.setItem(STORAGE, JSON.stringify(state.memory));
  }

  function project(){
    return localStorage.getItem('ic_active_project') || 'general';
  }

  function ensureProject(){
    if(!state.memory.projects[project()]){
      state.memory.projects[project()]={
        conversations:[],
        documents:[],
        notes:[],
        meetings:[],
        actions:[],
        safeguardingThemes:[]
      };
    }
    return state.memory.projects[project()];
  }

  function remember(type,data){
    const p = ensureProject();
    if(!p[type]) p[type]=[];

    p[type].unshift({
      ...data,
      created_at:new Date().toISOString()
    });

    p[type]=p[type].slice(0,50);

    state.memory.recent.unshift({type,project:project(),created_at:new Date().toISOString()});
    state.memory.recent=state.memory.recent.slice(0,100);

    save();
  }

  function detectThemes(text=''){
    const themes=[];
    const source=String(text).toLowerCase();

    if(source.includes('safeguard')) themes.push('Safeguarding');
    if(source.includes('ofsted')) themes.push('OFSTED');
    if(source.includes('incident')) themes.push('Incidents');
    if(source.includes('missing')) themes.push('Missing from home');
    if(source.includes('behaviour')) themes.push('Behaviour');
    if(source.includes('risk')) themes.push('Risk');

    const p=ensureProject();

    themes.forEach((t)=>{
      if(!p.safeguardingThemes.includes(t)){
        p.safeguardingThemes.push(t);
      }
    });

    save();

    return themes;
  }

  function summary(){
    const p=ensureProject();

    return {
      project:project(),
      conversationCount:p.conversations.length,
      documentCount:p.documents.length,
      noteCount:p.notes.length,
      meetingCount:p.meetings.length,
      actionCount:(p.actions||[]).length,
      safeguardingThemes:p.safeguardingThemes
    };
  }

  function intercept(){
    if(window.__icMemoryIntercepted) return;
    window.__icMemoryIntercepted=true;

    const originalFetch=window.fetch;

    window.fetch=async(...args)=>{
      const [url,opts]=args;

      try{
        if(typeof url==='string' && opts?.body){
          const bodyText = typeof opts.body==='string' ? opts.body : '';

          if(url.includes('/assistant/general/stream')){
            const body=JSON.parse(bodyText||'{}');
            if(body.message){
              remember('conversations',{message:body.message});
              detectThemes(body.message);
            }
          }

          if(url.includes('/ai-notes')){
            remember('notes',{event:url});
          }

          if(url.includes('/calendar')){
            remember('meetings',{event:url});
          }
        }
      }catch(_){ }

      return originalFetch(...args);
    };
  }

  function expose(){
    window.IndiCareMemory={
      remember,
      summary,
      detectThemes,
      memory:state.memory
    };
  }

  function resolveAiSuiteAsset(file){
    const resolver = window.IndiCareAISuiteAssets;
    if(resolver?.resolve) return resolver.resolve(file);
    const currentScriptBase = document.currentScript?.src ? new URL('.', document.currentScript.src).href : '';
    const path = window.location.pathname || '/';
    const aiSuiteIndex = path.indexOf('/ai-suite');
    const basePath = window.__INDICARE_AI_SUITE_ASSET_BASE__ || currentScriptBase || (aiSuiteIndex >= 0 ? `${path.slice(0, aiSuiteIndex)}/ai-suite/` : `${path.replace(/\/?(?:assistant(?:\.html)?|ai-suite)?\/?$/, '/') || '/'}ai-suite/`);
    const url = new URL(String(file || '').replace(/^\/+/, ''), basePath).href;
    const version = window.__INDICARE_AI_SUITE_ASSET_VERSION__ || document.querySelector('meta[name="indicare-ai-suite-asset-version"]')?.content || '';
    return version ? `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}` : url;
  }

  function loadActionsRuntime(){
    if(document.querySelector('script[data-runtime="actions-runtime"]')) return;
    const script=document.createElement('script');
    script.defer=true;
    script.dataset.runtime='actions-runtime';
    script.src=resolveAiSuiteAsset('indicare-actions-runtime.js');
    script.onerror=()=>console.warn(`[IndiCare AI Suite] Actions runtime failed to load from ${script.src}`);
    document.body.appendChild(script);
  }

  function init(){
    ensureProject();
    intercept();
    expose();
    save();
    loadActionsRuntime();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();