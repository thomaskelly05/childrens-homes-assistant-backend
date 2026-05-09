(() => {
  const STYLE_ID = 'reg44-reader-style';
  const ROOT_ID = 'reg44-reader-workspace';
  const FLAG = '__indicareReg44ReaderWorkspace';

  const state = {
    imports: [],
    selected: null,
    evidence: [],
    actions: [],
    loading: false,
    mode: 'evidence',
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .reg44-reader{border:1px solid #dbe7f3;border-radius:24px;background:#fff;box-shadow:0 18px 55px rgba(15,23,42,.08);overflow:hidden;display:grid;grid-template-columns:320px minmax(0,1fr);min-height:720px}.reg44-side{background:#f8fafc;border-right:1px solid #dbe7f3;padding:14px;display:flex;flex-direction:column;gap:12px}.reg44-main{min-width:0;display:flex;flex-direction:column}.reg44-title{font-size:19px;font-weight:950;color:#0f172a}.reg44-sub{font-size:12px;color:#64748b}.reg44-btn{border:0;border-radius:14px;background:#155eef;color:#fff;font-weight:950;padding:10px 13px}.reg44-btn.secondary{background:#eef4fb;color:#334155}.reg44-btn.warning{background:#fff7ed;color:#9a3412}.reg44-btn.danger{background:#fee2e2;color:#991b1b}.reg44-list{display:grid;gap:8px;overflow:auto}.reg44-import{border:1px solid transparent;background:transparent;text-align:left;border-radius:16px;padding:11px}.reg44-import:hover,.reg44-import.active{background:#fff;border-color:#dbe7f3}.reg44-import strong{display:block;color:#0f172a;font-size:13px}.reg44-import small{display:block;color:#64748b;margin-top:4px}.reg44-pill{display:inline-flex;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900;padding:4px 8px;margin:2px}.reg44-pill.safe{background:#fee2e2;color:#991b1b}.reg44-pill.good{background:#dcfce7;color:#166534}.reg44-pill.warn{background:#fef3c7;color:#92400e}.reg44-head{padding:16px 18px;border-bottom:1px solid #dbe7f3;display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.reg44-tabs{display:flex;gap:8px;padding:12px 18px;border-bottom:1px solid #dbe7f3;flex-wrap:wrap}.reg44-tab{border:0;border-radius:999px;padding:8px 12px;background:#eef4fb;color:#334155;font-weight:900}.reg44-tab.active{background:#155eef;color:#fff}.reg44-panel{padding:16px;overflow:auto;flex:1}.reg44-card{border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:13px;margin-bottom:10px}.reg44-card h4{margin:0 0 8px}.reg44-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.reg44-kpi{border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;padding:11px}.reg44-kpi strong{display:block;font-size:22px;color:#0f172a}.reg44-kpi span{font-size:11px;color:#64748b;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.reg44-table{width:100%;border-collapse:separate;border-spacing:0 8px}.reg44-table th{text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em}.reg44-table td{background:#fff;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:10px;vertical-align:top}.reg44-table td:first-child{border-left:1px solid #e2e8f0;border-radius:14px 0 0 14px}.reg44-table td:last-child{border-right:1px solid #e2e8f0;border-radius:0 14px 14px 0}.reg44-empty{border:1px dashed #cbd5e1;border-radius:18px;background:#f8fafc;color:#64748b;padding:18px;text-align:center}.reg44-form{display:grid;gap:10px}.reg44-form input,.reg44-form textarea,.reg44-form select{border:1px solid #cbd5e1;border-radius:14px;padding:10px;font:inherit}.reg44-form textarea{min-height:220px;resize:vertical}.reg44-row{display:flex;gap:8px;flex-wrap:wrap}.reg44-source{max-width:520px;white-space:normal;color:#334155}@media(max-width:1000px){.reg44-reader{grid-template-columns:1fr}.reg44-side{border-right:0;border-bottom:1px solid #dbe7f3}.reg44-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function qs() { return new URLSearchParams(location.search); }
  function homeId() { return Number(window.state?.home_id || qs().get('home_id') || 1); }
  function providerId() { return Number(window.state?.provider_id || qs().get('provider_id') || '') || null; }
  function userId() { return Number(qs().get('user_id') || window.currentUser?.id || 1); }
  function headers() { return { 'Content-Type': 'application/json', 'X-User-Id': String(userId()), 'X-Role': qs().get('role') || 'manager' }; }

  function findTarget() {
    return document.getElementById('reg44-reader') || document.querySelector('[data-os-panel="reg44"]') || document.querySelector('[data-os-panel="quality"]') || document.querySelector('main') || document.body;
  }

  function mount() {
    injectStyles();
    if (document.getElementById(ROOT_ID)) return;
    const target = findTarget();
    if (!target) return;
    const root = document.createElement('section');
    root.id = ROOT_ID;
    root.innerHTML = renderShell();
    target.appendChild(root);
    bind(root);
    loadImports();
  }

  function renderShell() {
    return `
      <div class="reg44-reader">
        <aside class="reg44-side">
          <div><div class="reg44-title">Reg 44 Reader</div><div class="reg44-sub">AI extraction of evidence, actions and provider learning</div></div>
          <div class="reg44-row"><button class="reg44-btn" data-new-import>Import report</button><button class="reg44-btn secondary" data-refresh>Refresh</button></div>
          <div class="reg44-list" data-import-list>${empty('Loading Reg 44 reports...')}</div>
        </aside>
        <main class="reg44-main">
          <div class="reg44-head" data-report-head>${renderHeader()}</div>
          <div class="reg44-tabs">
            ${['summary','evidence','actions','reg45','import'].map((m)=>`<button class="reg44-tab ${state.mode===m?'active':''}" data-mode="${m}">${label(m)}</button>`).join('')}
          </div>
          <div class="reg44-panel" data-panel>${renderPanel()}</div>
        </main>
      </div>
    `;
  }

  function label(mode) { return ({ summary: 'Summary', evidence: 'Evidence table', actions: 'Actions', reg45: 'Reg 45 feed', import: 'Import text' }[mode] || mode); }
  function empty(text) { return `<div class="reg44-empty">${esc(text)}</div>`; }

  function bind(root) {
    root.querySelector('[data-refresh]')?.addEventListener('click', loadImports);
    root.querySelector('[data-new-import]')?.addEventListener('click', () => setMode('import'));
    root.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
  }

  function rerender() {
    const head = document.querySelector('[data-report-head]');
    const panel = document.querySelector('[data-panel]');
    if (head) head.innerHTML = renderHeader();
    if (panel) panel.innerHTML = renderPanel();
    document.querySelectorAll('[data-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === state.mode));
    bindDynamic();
  }

  function bindDynamic() {
    document.querySelector('[data-analyse]')?.addEventListener('click', analyseSelected);
    document.querySelector('[data-import-form]')?.addEventListener('submit', submitImport);
    document.querySelectorAll('[data-task-action]').forEach((btn) => btn.addEventListener('click', () => createTask(btn.dataset.taskAction)));
    document.querySelectorAll('[data-select-import]').forEach((btn) => btn.addEventListener('click', () => selectImport(btn.dataset.selectImport)));
  }

  async function loadImports() {
    const list = document.querySelector('[data-import-list]');
    if (list) list.innerHTML = empty('Loading Reg 44 reports...');
    try {
      const params = new URLSearchParams({ home_id: String(homeId()), limit: '100' });
      if (providerId()) params.set('provider_id', String(providerId()));
      const res = await fetch(`/api/reg44-reader/imports?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      state.imports = data.imports || [];
      if (!state.selected && state.imports.length) await selectImport(state.imports[0].id, false);
      renderImports();
      rerender();
    } catch {
      state.imports = [];
      renderImports();
      rerender();
    }
  }

  function renderImports() {
    const list = document.querySelector('[data-import-list]');
    if (!list) return;
    list.innerHTML = state.imports.length ? state.imports.map((item) => `
      <button class="reg44-import ${state.selected?.id === item.id ? 'active' : ''}" data-select-import="${esc(item.id)}">
        <strong>${esc(item.title)}</strong>
        <small>${esc(item.report_month || item.visit_date || item.created_at || '')}</small>
        <span class="reg44-pill">${esc(item.status)}</span>
      </button>
    `).join('') : empty('No Reg 44 reports imported yet.');
    list.querySelectorAll('[data-select-import]').forEach((btn) => btn.addEventListener('click', () => selectImport(btn.dataset.selectImport)));
  }

  async function selectImport(id, shouldRender = true) {
    try {
      const res = await fetch(`/api/reg44-reader/imports/${encodeURIComponent(id)}`, { credentials: 'include' });
      const data = await res.json();
      state.selected = data.import;
      state.evidence = data.evidence || [];
      state.actions = data.actions || [];
      if (shouldRender) {
        renderImports();
        rerender();
      }
    } catch { alert('Could not load Reg 44 report'); }
  }

  function setMode(mode) {
    state.mode = mode;
    rerender();
  }

  function renderHeader() {
    if (!state.selected) {
      return `<div><div class="reg44-title">Reg 44 Report Reader</div><div class="reg44-sub">Import a visitor report to extract evidence, actions and Reg 45 learning.</div></div>`;
    }
    return `<div><div class="reg44-title">${esc(state.selected.title)}</div><div class="reg44-sub">${esc(state.selected.visitor_name || 'Visitor')} · ${esc(state.selected.report_month || state.selected.visit_date || '')}</div></div><div class="reg44-row"><button class="reg44-btn" data-analyse>Analyse again</button><button class="reg44-btn secondary" onclick="window.IndiCareOSAssistant?.ask('Summarise this Reg 44 report and identify Reg 45 provider learning')">Ask OS Assistant</button></div>`;
  }

  function renderPanel() {
    if (state.mode === 'import') return renderImportForm();
    if (!state.selected) return empty('Select or import a Reg 44 report.');
    if (state.mode === 'summary') return renderSummary();
    if (state.mode === 'evidence') return renderEvidence();
    if (state.mode === 'actions') return renderActions();
    if (state.mode === 'reg45') return renderReg45();
    return empty('Nothing to show.');
  }

  function renderSummary() {
    const good = state.evidence.filter((e) => e.positive).length;
    const shortfalls = state.evidence.filter((e) => e.requires_action).length;
    const safe = state.evidence.filter((e) => e.safeguarding_relevant).length;
    const reg45 = state.evidence.filter((e) => e.reg45_relevant).length + state.actions.filter((a) => a.reg45_relevant).length;
    return `
      <div class="reg44-grid">
        <div class="reg44-kpi"><strong>${state.evidence.length}</strong><span>Evidence items</span></div>
        <div class="reg44-kpi"><strong>${state.actions.length}</strong><span>Actions</span></div>
        <div class="reg44-kpi"><strong>${safe}</strong><span>Safeguarding</span></div>
        <div class="reg44-kpi"><strong>${reg45}</strong><span>Reg 45 feed</span></div>
      </div><br>
      <div class="reg44-card"><h4>AI analysis summary</h4><p>${esc(state.selected.analysis_summary || 'No analysis summary yet.')}</p></div>
      <div class="reg44-card"><h4>Good practice</h4><p>${esc(state.selected.good_practice_summary || `${good} good practice items identified.`)}</p></div>
      <div class="reg44-card"><h4>Shortfalls/actions</h4><p>${esc(state.selected.shortfalls_summary || `${shortfalls} action items identified.`)}</p></div>
      <div class="reg44-card"><h4>Safeguarding</h4><p>${esc(state.selected.safeguarding_summary || `${safe} safeguarding items identified.`)}</p></div>
      <div class="reg44-card"><h4>Provider learning / Reg 45</h4><p>${esc(state.selected.reg45_relevance_summary || 'Reg 45 relevant evidence appears in the Reg 45 feed tab.')}</p></div>
    `;
  }

  function renderEvidence() {
    if (!state.evidence.length) return empty('No evidence extracted yet. Run analysis or add evidence manually.');
    return `<table class="reg44-table"><thead><tr><th>Type</th><th>Finding</th><th>Analysis</th><th>Flags</th></tr></thead><tbody>${state.evidence.map((e) => `
      <tr>
        <td><span class="reg44-pill">${esc(e.evidence_type)}</span></td>
        <td><strong>${esc(e.title)}</strong><div class="reg44-source">${esc(e.evidence_text)}</div></td>
        <td>${esc(e.analysis || '')}</td>
        <td>${e.positive ? '<span class="reg44-pill good">Good practice</span>' : ''}${e.requires_action ? '<span class="reg44-pill warn">Action</span>' : ''}${e.safeguarding_relevant ? '<span class="reg44-pill safe">Safeguarding</span>' : ''}${e.reg45_relevant ? '<span class="reg44-pill">Reg 45</span>' : ''}</td>
      </tr>
    `).join('')}</tbody></table>`;
  }

  function renderActions() {
    if (!state.actions.length) return empty('No actions extracted yet.');
    return `<table class="reg44-table"><thead><tr><th>Status</th><th>Action</th><th>Due</th><th>Task</th></tr></thead><tbody>${state.actions.map((a) => `
      <tr>
        <td><span class="reg44-pill ${a.action_state === 'overdue' ? 'safe' : ''}">${esc(a.action_state || a.status)}</span></td>
        <td><strong>${esc(a.title)}</strong><div class="reg44-source">${esc(a.action_text)}</div><small>${esc(a.rationale || '')}</small></td>
        <td>${esc(a.due_date || '—')}</td>
        <td>${a.linked_task_id ? '<span class="reg44-pill good">Task created</span>' : `<button class="reg44-btn secondary" data-task-action="${esc(a.id)}">Create task</button>`}</td>
      </tr>
    `).join('')}</tbody></table>`;
  }

  function renderReg45() {
    const items = [
      ...state.evidence.filter((e) => e.reg45_relevant || e.provider_learning_relevant).map((e) => ({ type: 'Evidence', title: e.title, text: e.evidence_text, safe: e.safeguarding_relevant })),
      ...state.actions.filter((a) => a.reg45_relevant || a.provider_learning_relevant).map((a) => ({ type: 'Action', title: a.title, text: a.action_text, safe: a.safeguarding_relevant })),
    ];
    if (!items.length) return empty('No Reg 45/provider learning items identified yet.');
    return items.map((i) => `<div class="reg44-card"><h4>${esc(i.type)} · ${esc(i.title)}</h4><p>${esc(i.text)}</p>${i.safe ? '<span class="reg44-pill safe">Safeguarding</span>' : ''}<span class="reg44-pill">Reg 45</span></div>`).join('');
  }

  function renderImportForm() {
    return `
      <form class="reg44-form" data-import-form>
        <div class="reg44-row"><input name="title" placeholder="Report title" required value="Reg 44 Visitor Report" /><input name="visitor_name" placeholder="Visitor name" /><input name="visit_date" type="date" /></div>
        <textarea name="source_text" placeholder="Paste Reg 44 report text here for first-pass extraction..." required></textarea>
        <div class="reg44-row"><button class="reg44-btn" type="submit">Import and analyse</button><button class="reg44-btn secondary" type="button" data-refresh>Cancel</button></div>
      </form>
    `;
  }

  async function submitImport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      title: form.title.value.trim(),
      visitor_name: form.visitor_name.value.trim() || null,
      visit_date: form.visit_date.value || null,
      home_id: homeId(),
      provider_id: providerId(),
      source_text: form.source_text.value.trim(),
      created_by: userId(),
      analyse_now: true,
    };
    if (!payload.source_text) return;
    try {
      const res = await fetch('/api/reg44-reader/imports', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      await loadImports();
      if (data.id) await selectImport(data.id);
      setMode('summary');
    } catch (error) { alert('Import failed: ' + error.message); }
  }

  async function analyseSelected() {
    if (!state.selected) return;
    try {
      const res = await fetch(`/api/reg44-reader/imports/${encodeURIComponent(state.selected.id)}/analyse`, { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify({ force: true, created_by: userId() }) });
      if (!res.ok) throw new Error(await res.text());
      await selectImport(state.selected.id);
      setMode('summary');
    } catch (error) { alert('Analysis failed: ' + error.message); }
  }

  async function createTask(actionId) {
    try {
      const res = await fetch(`/api/reg44-reader/actions/${encodeURIComponent(actionId)}/create-task`, { method: 'POST', credentials: 'include', headers: headers() });
      if (!res.ok) throw new Error(await res.text());
      await selectImport(state.selected.id);
      setMode('actions');
    } catch (error) { alert('Could not create task: ' + error.message); }
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    const shouldMount = location.hash === '#reg44' || location.hash === '#quality' || document.getElementById('reg44-reader') || document.querySelector('[data-os-panel="reg44"]');
    if (shouldMount) mount();
    const observer = new MutationObserver(() => {
      if (!document.getElementById(ROOT_ID) && (location.hash === '#reg44' || document.querySelector('[data-os-panel="reg44"]'))) mount();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareReg44Reader = { mount, loadImports, state };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
