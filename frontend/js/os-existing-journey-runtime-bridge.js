(() => {
  const FLAG = '__indicareExistingJourneyRuntimeBridge';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const CANONICAL_CONTAINER_ID = 'indicare-existing-journey-runtime';

  const SHELL_WORKSPACES = {
    'daily-recording': {
      title: 'Daily Recording',
      subtitle: 'Daily logs, observations, handover notes and shift continuity records.',
      endpoint: '/api/os-command/care-recording',
      filters: ['daily_record', 'observation', 'handover', 'daily_note'],
      actions: ['Daily record', 'Observation', 'Handover note']
    },
    'direct-work': {
      title: 'Direct Work',
      subtitle: 'Key work, therapeutic conversations, life-story work and outcome-focused sessions.',
      endpoint: '/api/os-command/care-recording',
      filters: ['key_work_session', 'direct_work', 'life_story', 'outcome'],
      actions: ['Key work session', 'Life-story note', 'Outcome update']
    },
    incidents: {
      title: 'Incidents & Safeguarding',
      subtitle: 'Incident recording, missing from care, safeguarding concerns, notifications and review.',
      endpoint: '/api/os-command/safeguarding-patterns',
      commandEndpoint: '/api/os-command',
      filters: ['incident', 'safeguarding', 'missing', 'risk'],
      actions: ['Incident', 'Safeguarding concern', 'Missing episode']
    },
    health: {
      title: 'Health & Medication',
      subtitle: 'Health notes, medication, appointments, sleep, emotional wellbeing and regulation.',
      endpoint: '/api/os-command/care-recording',
      filters: ['health_note', 'medication', 'wellbeing', 'emotional_wellbeing_note'],
      actions: ['Health note', 'Medication note', 'Wellbeing update']
    },
    education: {
      title: 'Education',
      subtitle: 'Attendance, school updates, PEP, achievements, exclusions, transitions and aspirations.',
      endpoint: '/api/os-command/care-recording',
      filters: ['education_note', 'education', 'pep', 'achievement'],
      actions: ['Education note', 'PEP update', 'Achievement']
    },
    contact: {
      title: 'Family & Contact',
      subtitle: 'Family time, calls, visits, responses, emotional impact and follow-up support.',
      endpoint: '/api/os-command/care-recording',
      filters: ['family_contact', 'contact', 'phone_call', 'visit'],
      actions: ['Family contact', 'Phone call', 'Contact review']
    },
    documents: {
      title: 'Documents',
      subtitle: 'Plans, assessments, reports, policies, evidence, review dates and signatures.',
      endpoint: '/api/os-command/inspection/workspaces',
      filters: ['document', 'plan', 'assessment', 'evidence'],
      actions: ['Upload document', 'Review document', 'Link to chronology']
    }
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function osContext() { return window.IndiCareOSContext || {}; }

  function ensureWorkspaceShell() {
    const shell = document.getElementById(CANONICAL_CONTAINER_ID);
    if (!shell) return null;
    if (!document.getElementById('workspace-main')) {
      const main = document.createElement('section');
      main.id = 'workspace-main';
      main.className = 'ic365-content-panel';
      main.innerHTML = '<div class="ic365-empty-state">Waiting for home and young person context...</div>';
      shell.appendChild(main);
    }
    return shell;
  }

  function updateContextChrome(ctx) {
    document.querySelectorAll('[data-os-context-home],[data-os-side-home]').forEach((node) => {
      node.textContent = ctx.homeName || (ctx.homeId ? `Home ${ctx.homeId}` : 'Choose home');
    });
    document.querySelectorAll('[data-os-context-child],[data-os-side-child]').forEach((node) => {
      node.textContent = ctx.childName || (ctx.childId ? `Young person ${ctx.childId}` : 'Choose young person');
    });
  }

  function syncContext() {
    const ctx = osContext();
    updateContextChrome(ctx);
    if (!ctx.homeId || !ctx.childId) return null;
    const next = {
      homeId: String(ctx.homeId || ''),
      homeName: ctx.homeName || `Home ${ctx.homeId}`,
      childId: String(ctx.childId || ''),
      childName: ctx.childName || `Young person ${ctx.childId}`,
      childSummary: 'Selected through the OS context wall.',
      childRiskLevel: ctx.childRiskLevel || '',
      childPlacementStatus: ctx.childPlacementStatus || 'active journey'
    };
    if (window.IndiCareContext?.set) window.IndiCareContext.set(next);
    else {
      let current = { ...next };
      window.IndiCareContext = { get: () => current, set: (value) => (current = { ...current, ...(value || {}) }), clear: () => (current = { ...next }) };
    }
    return next;
  }

  function params(extra = {}) {
    const ctx = syncContext() || osContext();
    const p = new URLSearchParams({ limit: '80' });
    if (ctx.homeId) p.set('home_id', ctx.homeId);
    if (ctx.childId) p.set('young_person_id', ctx.childId);
    Object.entries(extra).forEach(([key, value]) => value !== undefined && value !== null && value !== '' && p.set(key, value));
    return p;
  }

  async function api(path, extra = {}) {
    const q = params(extra).toString();
    const response = await fetch(`${path}${q ? `?${q}` : ''}`, { credentials: 'include' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function setHeader(titleText, subtitleText) {
    const title = document.getElementById('view-title');
    const subtitle = document.getElementById('view-subtitle');
    if (title) title.textContent = titleText;
    if (subtitle) subtitle.textContent = subtitleText;
  }

  function setHeaderForView(view) {
    const labels = {
      'today-child': ['Today', 'Daily recording, support and continuity for the selected young person.'],
      'child-life': ['Young Person', 'Profile, routines, identity, relationships and whole-child understanding.'],
      'child-journey': ['Journey', 'Narrative journey, direct work, outcomes and lived experience.'],
      'child-timeline': ['Timeline', 'Chronology, records, events, documents and manager review history.'],
      'adult-profile': ['Adults', 'Reflective workforce profile, supervision, consistency and wellbeing.'],
      'home-profile': ['Home', 'Home profile, atmosphere, routines, continuity and safeguarding environment.'],
      'standards-ofsted': ['Standards & Ofsted', 'Quality standards, documents, Reg 44/45 and inspection readiness.'],
      review: ['Oversight', 'Manager comments, returns, approvals, actions and sign-off.']
    };
    const [nextTitle, nextSubtitle] = labels[view] || labels['today-child'];
    setHeader(nextTitle, nextSubtitle);
  }

  function setActive(button) {
    document.querySelectorAll('[data-view],[data-shell]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function normaliseRecords(key, payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (key === 'incidents') return [...(payload.patterns || []), ...(payload.items || [])];
    if (key === 'documents') return [...(payload.workspaces || []), ...(payload.items || [])];
    return payload.records || payload.items || payload.care_plan_reviews || [];
  }

  function filterRecords(records, filters) {
    if (!filters?.length) return records;
    return records.filter((record) => {
      const text = [record.record_type, record.source_type, record.type, record.title, record.summary, record.narrative, record.pattern_type].join(' ').toLowerCase();
      return filters.some((filter) => text.includes(filter.toLowerCase()));
    });
  }

  function recordCard(record) {
    const title = record.title || record.event_title || record.pattern_type || record.record_type || 'Record';
    const type = String(record.record_type || record.source_type || record.pattern_type || record.status || 'record').replaceAll('_', ' ');
    const when = record.occurred_at || record.event_at || record.created_at || record.detected_at || record.record_date || '';
    const summary = record.narrative || record.summary || record.event_summary || record.recommended_action || record.leadership_summary || 'No narrative available yet.';
    const voice = record.child_voice || record.young_person_voice || '';
    const status = record.feed_state || record.timeline_state || record.status || record.severity || 'recorded';
    return `<article class="record-card ic365-record-card">
      <div class="ic365-record-head"><span class="mini-tag">${esc(type)}</span><small>${esc(when)}</small><strong>${esc(status)}</strong></div>
      <h4>${esc(title)}</h4>
      <p>${esc(summary).slice(0, 320)}</p>
      ${voice ? `<div class="alert low"><strong>Child voice</strong><p>${esc(voice).slice(0, 220)}</p></div>` : ''}
      <footer class="ic365-record-foot"><button type="button" class="ic365-button">Review</button><button type="button" class="ic365-button">Link document</button><button type="button" class="ic365-button">Add comment</button></footer>
    </article>`;
  }

  function overviewStats(records) {
    const review = records.filter((r) => r.manager_review_required || /review|returned|submitted/i.test(String(r.status || r.feed_state || ''))).length;
    const safeguard = records.filter((r) => /safeguard|incident|missing|risk/i.test(JSON.stringify(r))).length;
    const voice = records.filter((r) => r.child_voice || r.young_person_voice).length;
    return { total: records.length, review, safeguard, voice };
  }

  function liveWorkspaceHtml(workspace, records, allRecords = []) {
    const stats = overviewStats(records);
    const timeline = records.length ? records.slice(0, 16).map(recordCard).join('') : '<div class="ic365-empty-state">No matching live records yet. The shell is connected and will show records as they are added.</div>';
    const allTimeline = allRecords.length ? allRecords.slice(0, 5).map(recordCard).join('') : '<div class="ic365-empty-state">No chronology records available yet.</div>';
    return `
      <section class="card-grid">
        <article class="metric-card"><strong>${stats.total}</strong><span>Records in this area</span><small>From existing OS endpoints</small></article>
        <article class="metric-card"><strong>${stats.review}</strong><span>Review signals</span><small>Manager review / returned / submitted</small></article>
        <article class="metric-card"><strong>${stats.safeguard}</strong><span>Safeguarding links</span><small>Incident, risk or missing language</small></article>
        <article class="metric-card"><strong>${stats.voice}</strong><span>Child voice</span><small>Records with young person voice</small></article>
      </section>
      <section class="two-column">
        <article class="panel">
          <div class="section-header-row"><div><p class="eyebrow">Live flow</p><h3>${esc(workspace.title)} chronology</h3></div><div class="hero-actions">${workspace.actions.map((action) => `<button type="button" class="ic365-button">${esc(action)}</button>`).join('')}</div></div>
          <div class="ic365-record-feed">${timeline}</div>
        </article>
        <article class="panel">
          <p class="eyebrow">Connected flow</p><h3>Recent chronology context</h3>
          <p>This panel reuses the existing chronology and care-recording routers so this workspace does not become another disconnected module.</p>
          <div class="ic365-record-feed compact">${allTimeline}</div>
        </article>
      </section>`;
  }

  async function activateShell(key) {
    const shell = ensureWorkspaceShell();
    const workspace = SHELL_WORKSPACES[key];
    if (!shell || !workspace) return;
    setHeader(workspace.title, workspace.subtitle);
    const main = document.getElementById('workspace-main');
    if (!main) return;
    main.innerHTML = '<div class="ic365-empty-state">Loading existing records and chronology...</div>';
    try {
      const [primary, chronology, commands] = await Promise.all([
        api(workspace.endpoint),
        api('/api/os-command/chronology-intelligence'),
        workspace.commandEndpoint ? api(workspace.commandEndpoint) : Promise.resolve(null)
      ]);
      const primaryRecords = filterRecords(normaliseRecords(key, primary), workspace.filters);
      const commandRecords = commands ? filterRecords(normaliseRecords(key, commands), workspace.filters) : [];
      const chronRecords = normaliseRecords('chronology', chronology);
      const merged = [...primaryRecords, ...commandRecords];
      main.innerHTML = liveWorkspaceHtml(workspace, merged.length ? merged : primaryRecords, chronRecords);
    } catch (error) {
      console.warn('[IndiCare OS] Shell workspace endpoint failed', key, error);
      main.innerHTML = `<div class="ic365-empty-state">Could not load live records for ${esc(workspace.title)} yet. Existing routers remain available and this workspace will populate when the endpoint responds.</div>`;
    }
  }

  function activate(view) {
    const shell = ensureWorkspaceShell();
    if (!shell) return;
    setHeaderForView(view);
    if (view === 'today-child' && typeof window.loadTodayForChild === 'function') return window.loadTodayForChild();
    if (view === 'child-life' && typeof window.loadChildLifeEcosystem === 'function') return window.loadChildLifeEcosystem();
    if (view === 'child-journey' && typeof window.loadChildJourneyExperience === 'function') return window.loadChildJourneyExperience();
    if (view === 'child-timeline' && typeof window.loadChildTimeline === 'function') return window.loadChildTimeline();
    if (view === 'adult-profile' && typeof window.loadAdultJourneyProfile === 'function') return window.loadAdultJourneyProfile();
    if (view === 'home-profile' && typeof window.loadHomeJourneyProfile === 'function') return window.loadHomeJourneyProfile();
    if (view === 'standards-ofsted' && typeof window.loadStandardsOfstedReadiness === 'function') return window.loadStandardsOfstedReadiness();
    if (view === 'review' && typeof window.loadManagerOversight === 'function') return window.loadManagerOversight();
  }

  function bindNav() {
    if (document.body.dataset.ic365NavBound === 'true') return;
    document.body.dataset.ic365NavBound = 'true';
    document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { setActive(button); syncContext(); activate(button.dataset.view); }));
    document.querySelectorAll('[data-shell]').forEach((button) => button.addEventListener('click', () => { setActive(button); syncContext(); activateShell(button.dataset.shell); }));
  }

  function bootExistingModules() {
    ensureWorkspaceShell();
    bindNav();
    const ctx = syncContext();
    if (!ctx) return;
    setTimeout(() => activate(document.querySelector('[data-view].active')?.dataset.view || 'today-child'), 100);
  }

  function boot() {
    ensureWorkspaceShell();
    bindNav();
    bootExistingModules();
    document.addEventListener('indicare:os-context-ready', bootExistingModules);
    document.addEventListener('indicare:care-data-changed', () => {
      const activeView = document.querySelector('[data-view].active')?.dataset.view;
      const activeShell = document.querySelector('[data-shell].active')?.dataset.shell;
      syncContext();
      if (activeShell) activateShell(activeShell);
      else activate(activeView || 'today-child');
    });
    console.info('[IndiCare OS] SharePoint shell bridge connected to existing OS routers');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();