(() => {
  const FLAG = '__indicareSafeContextualNavigationV2';
  const STYLE_ID = 'os-safe-contextual-navigation-style';
  const HOST_ID = 'os-safe-contextual-nav';
  const GATE_ID = 'os-context-gateway';
  const STORAGE_KEY = 'indicare_os_context_selection';

  if (window[FLAG]) return;
  window[FLAG] = true;

  const MENUS = {
    gateway: [
      ['Select Home', 'Choose operational home first', 'gateway:home'],
      ['Select Young Person', 'Open child-centred workspace', 'gateway:child'],
      ['Provider View', 'Leadership oversight without child filter', 'view:provider'],
      ['Assistant', 'Ask IndiCare with current context', 'ask:orientation'],
    ],
    overview: [
      ['Home Dashboard', 'Current operational picture', 'focus:provider-matrix'],
      ['Command Queue', 'Immediate actions', 'focus:command-list'],
      ['Care Feed', 'Recent records and child voice', 'focus:care-list'],
      ['Continuity Memory', 'What adults should know', 'intel:continuity'],
      ['Safeguarding Signals', 'Live patterns and concerns', 'intel:safeguarding'],
      ['Record Daily Life', 'Whole-child recording', 'record:daily_note'],
    ],
    'young-people': [
      ['Child Overview', 'Live operational story', 'childtab:overview'],
      ['Daily Life', 'Routines, emotions, relationships', 'record:daily_note'],
      ['Chronology', 'Living journey and linked events', 'childtab:chronology'],
      ['Records', 'All child records', 'focus:care-list'],
      ['Continuity', 'What adults should know', 'intel:continuity'],
      ['Health', 'Wellbeing, sleep, medication', 'childtab:health'],
      ['Education', 'School, aspiration, attendance', 'childtab:education'],
      ['Family Time', 'Before, during and after contact', 'record:family'],
      ['Behaviour Support', 'Triggers, regulation, repair', 'record:plans'],
      ['Safeguarding', 'Child-specific concerns', 'childtab:safeguarding'],
      ['Missing Episodes', 'Contextual missing intelligence', 'record:missing_episode'],
      ['Exploitation', 'Peer, online and locality risks', 'ask:exploitation contextual safeguarding'],
      ['Plans', 'Care, risk and support plans', 'childtab:plans'],
      ['Reviews', 'LAC, PEP, health, placement reviews', 'ask:reviews due for selected child'],
      ['Voice & Wishes', 'Participation and advocacy', 'record:child_voice'],
      ['Documents', 'Child documents and evidence', 'childtab:documents'],
      ['Life Story', 'Identity, journey and memory', 'record:journey'],
      ['Professionals', 'Network and decisions', 'ask:professional network for child'],
      ['Incidents', 'Record or review incidents', 'record:incident'],
      ['Risk', 'Risk and vulnerability summary', 'ask:child risk summary'],
      ['Timeline', 'Narrative chronology view', 'focus:chronology-board'],
      ['Analytics', 'Patterns and trends', 'intel:safeguarding'],
    ],
    safeguarding: [
      ['Overview', 'Safeguarding command view', 'intel:safeguarding'],
      ['Contextual Safeguarding', 'Peer, place, online and adult risk', 'ask:contextual safeguarding overview'],
      ['Missing Episodes', 'Missing from care patterns', 'record:missing_episode'],
      ['Exploitation', 'CCE/CSE and vulnerability indicators', 'ask:exploitation indicators'],
      ['Peer Associations', 'Known peers and networks', 'ask:peer associations'],
      ['Locality Risks', 'Locations, transport, community risk', 'ask:locality risk assessment'],
      ['Online Safety', 'Digital contact and online harm', 'ask:online safety risks'],
      ['Police Contacts', 'Police, strategy and intelligence', 'ask:police contact summary'],
      ['Return Home Interviews', 'Themes and follow-up', 'ask:return home interview themes'],
      ['Patterns & Trends', 'Escalation and repeated themes', 'focus:pattern-list'],
      ['Chronology', 'Linked safeguarding chronology', 'focus:chronology-board'],
      ['Strategy Meetings', 'Professional safeguarding actions', 'ask:strategy meeting prep'],
      ['Risk Assessments', 'Update safeguarding risk', 'record:safeguarding'],
      ['Disruption Prevention', 'Safety and placement stability', 'intel:placement'],
      ['Professional Network', 'Who needs to know', 'ask:safeguarding professional network'],
      ['Notifications', 'Regulatory and LA notifications', 'ask:safeguarding notifications'],
    ],
    placements: [
      ['Overview', 'Placement risk and resilience', 'intel:placement'],
      ['Stability', 'Fragility and protective factors', 'intel:placement'],
      ['Matching / Impact', 'Impact on existing children', 'ask:impact risk assessment'],
      ['Admissions', 'Referral and matching workflow', 'ask:admissions matching summary'],
      ['Disruption Risk', 'Escalation and prevention', 'ask:placement disruption prevention'],
      ['Protective Factors', 'What keeps this placement stable', 'ask:placement protective factors'],
      ['Record Update', 'Create linked placement update', 'record:daily_note'],
    ],
    workforce: [
      ['Overview', 'Team and shift picture', 'focus:workforce-board'],
      ['Roster', 'Coverage and pressure', 'ask:roster and coverage risks'],
      ['Shift Handover', 'Continuity across adults', 'ask:handover quality'],
      ['Supervisions', 'Reflective practice and oversight', 'ask:staff supervision themes'],
      ['Training', 'Training and competence', 'ask:training compliance'],
      ['Qualifications', 'Workforce development', 'ask:qualification gaps'],
      ['Compliance', 'Safer recruitment and checks', 'ask:workforce compliance'],
      ['Safer Recruitment', 'DBS, references and checks', 'ask:safer recruitment'],
      ['Wellbeing', 'Emotional load and resilience', 'ask:staff wellbeing'],
      ['Performance', 'Practice quality', 'ask:practice performance'],
      ['Disciplinaries', 'Formal workforce processes', 'ask:disciplinary overview'],
      ['Capability', 'Support and improvement', 'ask:capability support'],
      ['Agency', 'Agency use and continuity risk', 'ask:agency staff risk'],
      ['Coverage', 'Staffing pressure', 'ask:coverage risk'],
      ['Team Culture', 'Relational practice climate', 'ask:team culture'],
    ],
    ofsted: [
      ['Overview', 'Inspection evidence preparation', 'intel:inspection'],
      ['SCCIF', 'Inspection framework evidence', 'ask:SCCIF evidence summary'],
      ['Quality Standards', 'Children’s Homes quality standards', 'ask:quality standards evidence'],
      ['Reg 44', 'Independent visitor evidence', 'ask:Reg 44 evidence'],
      ['Reg 45', 'Quality of care review', 'ask:Reg 45 quality of care'],
      ['Statement of Purpose', 'Reg 16 / Schedule 1', 'ask:Statement of Purpose gaps'],
      ['Annex A', 'Registration/home details', 'ask:Annex A readiness'],
      ['Locality Risk', 'Location assessment', 'ask:locality risk assessment'],
      ['Impact Risk', 'Matching and impact assessment', 'ask:impact risk assessment'],
      ['Complaints', 'Complaints and outcomes', 'ask:complaints evidence'],
      ['Notifications', 'Reg 40 and serious events', 'ask:notifications evidence'],
      ['Restrictive Practice', 'Physical intervention oversight', 'record:physical_intervention'],
      ['Missing Episodes', 'Missing from care evidence', 'record:missing_episode'],
      ['Leadership', 'Leadership and management judgement', 'ask:leadership and management evidence'],
      ['Workforce', 'Staffing, training and supervision', 'ask:workforce evidence'],
      ['Evidence Builder', 'Build inspection evidence', 'intel:inspection'],
      ['Inspection evidence preparation', 'What would Ofsted see today?', 'ask:Inspection evidence preparation'],
      ['Actions', 'Inspection actions and owners', 'intel:continuity'],
    ],
    provider: [
      ['Provider Overview', 'Cross-home intelligence', 'view:provider'],
      ['Leadership Briefing', 'RI / CEO summary', 'ask:provider leadership briefing'],
      ['Safeguarding Pressure', 'Provider risk summary', 'intel:safeguarding'],
      ['Inspection Evidence', 'Provider-wide evidence', 'intel:inspection'],
      ['Placement Stability', 'Cross-home placement risk', 'intel:placement'],
      ['Workforce Pressure', 'Provider workforce risk', 'ask:provider workforce pressure'],
      ['Compliance Gaps', 'Home documents and Reg 44/45', 'ask:provider compliance gaps'],
    ],
    network: [
      ['Network Overview', 'Contextual safeguarding network', 'focus:network-board'],
      ['Peer Associations', 'Children and peer groups', 'ask:network peer associations'],
      ['Hotspots', 'Locality and community risk', 'ask:network hotspots'],
      ['Online / Phones', 'Digital contact risks', 'ask:online contact network'],
      ['Professional Network', 'Police, LA, school, health', 'ask:professional network'],
      ['Shared Risks', 'Detect shared safeguarding risk', 'action:detect-shared-risks'],
    ],
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .os-context-gateway{position:fixed;inset:0;background:linear-gradient(135deg,#f8fafc,#eef4ff);z-index:700;display:none;place-items:center;padding:28px}.os-context-gateway.open{display:grid}.os-context-card{width:min(1060px,96vw);background:#fff;border:1px solid #dbe7f3;border-radius:32px;box-shadow:0 30px 90px rgba(15,23,42,.22);padding:28px}.os-context-card h1{margin:0;color:#0f172a;font-size:34px;letter-spacing:-1px}.os-context-card p{color:#64748b;line-height:1.5}.os-context-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:18px}.os-context-option{border:1px solid #dbe7f3;background:#f8fafc;border-radius:22px;padding:18px;text-align:left;cursor:pointer}.os-context-option:hover{border-color:#93c5fd;background:#eff6ff}.os-context-option strong{display:block;color:#0f172a;font-size:18px}.os-context-option small{display:block;color:#64748b;margin-top:6px}.os-context-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:18px}.os-context-bar select,.os-context-bar input{border:1px solid #dbe7f3;border-radius:14px;padding:11px;background:#fff}.os-context-action{border:0;border-radius:14px;background:#155eef;color:#fff;font-weight:950;padding:12px 15px}.os-context-action.secondary{background:#eef4fb;color:#334155}.os-safe-context-nav{margin-top:14px;padding-top:12px;border-top:1px solid rgba(148,163,184,.32);max-height:calc(100vh - 250px);overflow:auto}.os-safe-context-title{font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:0 0 8px}.os-safe-context-item{width:100%;border:0;background:transparent;text-align:left;border-radius:14px;padding:9px 10px;margin:4px 0;color:inherit;display:block}.os-safe-context-item:hover,.os-safe-context-item.active{background:rgba(219,234,254,.9);color:#1d4ed8}.os-safe-context-item strong{display:block;font-size:13px}.os-safe-context-item small{display:block;font-size:11px;opacity:.76;margin-top:1px}.os-context-selected{margin:10px 0;padding:10px;border:1px solid #dbe7f3;border-radius:16px;background:#f8fafc;color:#334155;font-size:12px}.os-context-change{border:0;background:#eef4fb;color:#334155;border-radius:999px;padding:7px 10px;font-weight:850;margin-top:6px}@media(max-width:900px){.os-context-card{padding:20px;border-radius:24px}.os-context-card h1{font-size:26px}.os-safe-context-nav{max-height:none}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function currentContext() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
  function saveContext(ctx) { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...currentContext(), ...ctx, selected_at: new Date().toISOString() })); window.IndiCareOSContext = currentContext(); document.dispatchEvent(new CustomEvent('indicare:context-selected', { detail: window.IndiCareOSContext })); }
  function hasContext() { const ctx = currentContext(); return Boolean(ctx.mode || ctx.home_id || ctx.young_person_id || window.state?.selectedChild?.profile?.id || window.state?.selectedChild?.profile?.young_person_id); }
  function activeView() { return document.querySelector('.ic-nav-button.active')?.dataset?.view || window.state?.activeView || (hasContext() ? 'overview' : 'gateway'); }

  function ensureGateway() {
    let gate = document.getElementById(GATE_ID);
    if (gate) return gate;
    gate = document.createElement('section');
    gate.id = GATE_ID;
    gate.className = 'os-context-gateway';
    gate.innerHTML = `<div class="os-context-card"><h1>Start with the home and child</h1><p>IndiCare works best when it knows the operational context first. Select a home, a young person, or open provider oversight before the full OS becomes active.</p><div class="os-context-grid"><button class="os-context-option" data-gateway-mode="child"><strong>Child workspace</strong><small>Select a child and open their daily life, chronology, safeguarding, family time, health, education and records.</small></button><button class="os-context-option" data-gateway-mode="home"><strong>Home workspace</strong><small>Open today’s home command view, continuity, safeguarding, records and shift intelligence.</small></button><button class="os-context-option" data-gateway-mode="provider"><strong>Provider / leadership</strong><small>Open cross-home inspection, safeguarding, workforce and placement intelligence.</small></button><button class="os-context-option" data-gateway-mode="assistant"><strong>Ask IndiCare</strong><small>Ask the assistant to help find the right child, home, document or safeguarding context.</small></button></div><div class="os-context-bar"><select id="gateway-home"><option value="1">Home 1</option><option value="2">Home 2</option></select><select id="gateway-child"><option value="">Select child if known</option><option value="1">Aisha</option><option value="2">Liam</option><option value="3">Ella</option></select><input id="gateway-search" placeholder="Search child, home, record or risk..." /><button class="os-context-action" data-gateway-continue>Continue</button><button class="os-context-action secondary" data-gateway-close>Continue without child</button></div></div>`;
    document.body.appendChild(gate);
    bindGateway(gate);
    return gate;
  }

  function bindGateway(gate) {
    gate.querySelectorAll('[data-gateway-mode]').forEach(btn => btn.addEventListener('click', () => selectMode(btn.dataset.gatewayMode)));
    gate.querySelector('[data-gateway-continue]')?.addEventListener('click', () => {
      const home = gate.querySelector('#gateway-home')?.value || '1';
      const child = gate.querySelector('#gateway-child')?.value || '';
      saveContext({ mode: child ? 'child' : 'home', home_id: Number(home), young_person_id: child ? Number(child) : null, search: gate.querySelector('#gateway-search')?.value || '' });
      closeGateway();
      routeAfterContext();
    });
    gate.querySelector('[data-gateway-close]')?.addEventListener('click', () => { saveContext({ mode: 'home', home_id: Number(gate.querySelector('#gateway-home')?.value || 1) }); closeGateway(); routeAfterContext(); });
  }

  function selectMode(mode) {
    if (mode === 'assistant') { closeGateway(); return ask('help me select the correct home, child or workflow'); }
    saveContext({ mode, home_id: Number(document.getElementById('gateway-home')?.value || 1), young_person_id: Number(document.getElementById('gateway-child')?.value || 0) || null });
    closeGateway();
    routeAfterContext();
  }

  function openGateway(force = false) { const gate = ensureGateway(); if (force || !hasContext()) gate.classList.add('open'); }
  function closeGateway() { document.getElementById(GATE_ID)?.classList.remove('open'); }

  function routeAfterContext() {
    const ctx = currentContext();
    if (ctx.mode === 'child' || ctx.young_person_id) clickMain('young-people');
    else if (ctx.mode === 'provider') clickMain('provider');
    else clickMain('overview');
    setTimeout(() => render(activeView()), 100);
  }

  function clickMain(view) { document.querySelector(`.ic-nav-button[data-view="${css(view)}"]`)?.click(); }
  function ensureHost() {
    const rail = document.querySelector('.ic-rail');
    if (!rail) return null;
    let host = document.getElementById(HOST_ID);
    if (!host) { host = document.createElement('section'); host.id = HOST_ID; host.className = 'os-safe-context-nav'; rail.appendChild(host); }
    return host;
  }

  function normaliseView(view) { if (view === 'ofsted' || view === 'inspection') return 'ofsted'; return view || 'overview'; }
  function render(view = activeView()) {
    const host = ensureHost(); if (!host) return;
    const ctx = currentContext();
    const key = hasContext() ? normaliseView(view) : 'gateway';
    const items = MENUS[key] || MENUS.overview;
    host.innerHTML = `<div class="os-safe-context-title">${esc(key.replaceAll('-', ' '))}</div><div class="os-context-selected"><strong>Context</strong><br>Mode: ${esc(ctx.mode || 'not selected')} · Home: ${esc(ctx.home_id || '—')} · Child: ${esc(ctx.young_person_id || '—')}<br><button type="button" class="os-context-change" data-open-context-gateway>Change context</button></div>${items.map(([label, hint, action]) => `<button type="button" class="os-safe-context-item" data-safe-context-action="${esc(action)}"><strong>${esc(label)}</strong><small>${esc(hint)}</small></button>`).join('')}`;
    bind(host);
  }

  function bind(host) {
    host.querySelector('[data-open-context-gateway]')?.addEventListener('click', () => openGateway(true));
    host.querySelectorAll('[data-safe-context-action]').forEach(button => button.addEventListener('click', () => { host.querySelectorAll('.os-safe-context-item').forEach(item => item.classList.remove('active')); button.classList.add('active'); handleAction(button.dataset.safeContextAction || ''); }));
  }

  function handleAction(action) {
    const [type, ...rest] = action.split(':'); const value = rest.join(':');
    if (type === 'gateway') return openGateway(true);
    if (type === 'view') return clickMain(value);
    if (type === 'focus') return focusElement(value);
    if (type === 'record') return window.IndiCareTherapeuticRecordCreator?.open?.(value || 'daily_note');
    if (type === 'intel') return window.IndiCareOperationalIntelligence?.openIntelligenceWorkspace?.(value || 'continuity') || window.IndiCareIntelligenceMigrationBridge?.ask?.(value);
    if (type === 'ask') return ask(value);
    if (type === 'action') return document.querySelector(`[data-action="${css(value)}"]`)?.click();
    if (type === 'childtab') return openChildTab(value);
  }

  function focusElement(id) { const node = document.getElementById(id); if (!node) return; node.scrollIntoView({ behavior: 'smooth', block: 'start' }); node.animate?.([{ outline: '3px solid rgba(21,94,239,.35)' }, { outline: '0 solid transparent' }], { duration: 1200 }); }
  function openChildTab(tab) { clickMain('young-people'); setTimeout(() => { const btn = document.querySelector(`[data-child-tab="${css(tab)}"], [data-os-ui-tab="${css(tab)}"]`); if (btn) btn.click(); else focusElement('child-workspace'); }, 80); }
  function ask(topic) { const ctx = currentContext(); window.IndiCareOSAssistant?.open?.(); window.IndiCareOSAssistant?.ask?.(`Context: ${activeView()} / ${topic}. Selected context: home ${ctx.home_id || 'unknown'}, child ${ctx.young_person_id || 'not selected'}. Summarise relevant records, chronology, safeguarding, continuity, inspection evidence and next actions for the children's home.`); }
  function css(value) { return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }

  function bindTopNav() { document.querySelectorAll('.ic-nav-button[data-view]').forEach(btn => { if (btn.dataset.safeContextBound === 'true') return; btn.dataset.safeContextBound = 'true'; btn.addEventListener('click', () => setTimeout(() => render(btn.dataset.view), 50)); }); }

  function boot() {
    injectStyles();
    ensureGateway();
    window.IndiCareOSContext = currentContext();
    bindTopNav();
    render();
    openGateway(false);
    document.addEventListener('indicare:care-data-changed', () => setTimeout(() => render(activeView()), 100));
    document.addEventListener('indicare:context-selected', () => setTimeout(() => render(activeView()), 100));
    const observer = new MutationObserver(() => window.IndiCareSafe?.debounce?.('safe-context-nav-refresh', () => { bindTopNav(); render(activeView()); }, 350) || setTimeout(() => render(activeView()), 350));
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareSafeContextNavigation = { render, menus: MENUS, openGateway, currentContext, saveContext };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
