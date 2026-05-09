(() => {
  const STYLE_ID = 'indicare-workspace-groups-style';
  const FLAG = '__indicareWorkspaceGroups';
  const ROOT_ID = 'indicare-workspace-groups-root';

  const GROUPS = [
    {
      key: 'recording', label: 'Recording', icon: '+', summary: 'Daily life, incidents, key work and child voice.',
      actions: [
        ['daily_note', 'Daily Living Note', 'Record the whole child’s day'],
        ['incident', 'Incident', 'Safeguarding-aware incident record'],
        ['missing_episode', 'Missing Episode', 'Contextual safeguarding workflow'],
        ['keywork', 'Key Work', 'Reflective direct work'],
        ['child_voice', 'Child Voice', 'Wishes, feelings and participation']
      ]
    },
    {
      key: 'journey', label: 'Child Journey', icon: '↗', summary: 'Chronology, patterns, progress and lived experience.',
      actions: [
        ['open_tab:journey', 'Open Child Journey', 'Timeline and chronology'],
        ['ask:journey', 'Ask about patterns', 'Summarise recent chronology'],
        ['open_tab:care', 'Care Notes', 'Daily recording and care records']
      ]
    },
    {
      key: 'plans', label: 'Plans & Reviews', icon: '□', summary: 'Care plans, risks, education, health and reviews.',
      actions: [
        ['open_tab:plans', 'Plans', 'Risk, support and placement plans'],
        ['open_tab:education', 'Education', 'PEP, EHCP and school records'],
        ['open_tab:health', 'Health', 'Health and wellbeing records'],
        ['ask:reviews', 'Prepare review summary', 'LAC, placement or care review support']
      ]
    },
    {
      key: 'safeguarding', label: 'Safeguarding', icon: '!', summary: 'Concerns, risk, missing, incidents and oversight.',
      actions: [
        ['incident', 'New Incident', 'Create incident record'],
        ['missing_episode', 'New Missing Episode', 'Create missing episode record'],
        ['physical_intervention', 'Physical Intervention', 'Debrief and repair record'],
        ['open_tab:safeguarding', 'Safeguarding Records', 'View safeguarding history']
      ]
    },
    {
      key: 'documents', label: 'Documents', icon: '◇', summary: 'Upload, analyse, route and track expiry/reviews.',
      actions: [
        ['doc_analyse', 'Analyse Document', 'Classify, route and create reminders'],
        ['doc_reminders', 'Document Reminders', 'Expiry and review tasks'],
        ['open_tab:education', 'Education Documents', 'PEP/EHCP routing'],
        ['open_tab:plans', 'Care Documents', 'Plans and statutory documents']
      ]
    },
    {
      key: 'governance', label: 'Governance', icon: '✓', summary: 'Reg 44, Reg 45, evidence, actions and oversight.',
      actions: [
        ['hash:#reg44', 'Reg 44 Reader', 'Import and analyse visitor reports'],
        ['ask:reg45', 'Generate Reg 45 insight', 'Use evidence and trends'],
        ['ask:oversight', 'RI / CEO briefing', 'Provider and home intelligence']
      ]
    }
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .workspace-groups{border:1px solid #dbe7f3;background:#fff;border-radius:26px;padding:14px;margin:0 0 18px;box-shadow:0 18px 55px rgba(15,23,42,.07)}.workspace-groups-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.workspace-groups-head h3{margin:0;color:#0f172a;font-size:19px}.workspace-groups-head p{margin:4px 0 0;color:#64748b;font-size:13px}.workspace-groups-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.workspace-group-card{border:1px solid #e2e8f0;background:#f8fafc;border-radius:20px;padding:12px;display:grid;gap:8px}.workspace-group-card:hover{background:#fff;border-color:#93c5fd}.workspace-group-top{display:flex;gap:9px;align-items:center}.workspace-group-icon{width:34px;height:34px;border-radius:14px;background:#dbeafe;color:#1d4ed8;display:grid;place-items:center;font-weight:950}.workspace-group-card strong{color:#0f172a}.workspace-group-card small{color:#64748b}.workspace-group-actions{display:grid;gap:6px}.workspace-group-action{border:0;border-radius:14px;background:#fff;color:#334155;text-align:left;padding:8px 10px;font-weight:850;border:1px solid #e2e8f0}.workspace-group-action:hover{background:#eff6ff;color:#1d4ed8}.workspace-ask-btn{border:0;border-radius:999px;background:#155eef;color:#fff;font-weight:950;padding:9px 12px}@media(max-width:720px){.workspace-groups{border-radius:20px}.workspace-groups-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function childWorkspace() { return document.getElementById('child-workspace') || document.querySelector('[data-child-workspace]') || document.querySelector('main'); }
  function selectedChildName() { const p = window.state?.selectedChild?.profile || {}; return p.name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'the selected child'; }

  function render() {
    const target = childWorkspace();
    if (!target || document.getElementById(ROOT_ID)) return;
    const root = document.createElement('section');
    root.id = ROOT_ID;
    root.className = 'workspace-groups';
    root.innerHTML = `
      <div class="workspace-groups-head">
        <div><h3>Connected care workspace</h3><p>Grouped quick access. Record once, feed chronology, plans, assistant, reports and oversight.</p></div>
        <button class="workspace-ask-btn" type="button" data-group-ask>Ask IndiCare</button>
      </div>
      <div class="workspace-groups-grid">
        ${GROUPS.map(group => `<article class="workspace-group-card"><div class="workspace-group-top"><div class="workspace-group-icon">${esc(group.icon)}</div><div><strong>${esc(group.label)}</strong><br><small>${esc(group.summary)}</small></div></div><div class="workspace-group-actions">${group.actions.map(([key,label,hint]) => `<button class="workspace-group-action" type="button" data-group-action="${esc(key)}"><span>${esc(label)}</span><br><small>${esc(hint)}</small></button>`).join('')}</div></article>`).join('')}
      </div>
    `;
    target.prepend(root);
    bind(root);
  }

  function bind(root) {
    root.querySelector('[data-group-ask]')?.addEventListener('click', () => ask('Summarise this child workspace: recent records, open callbacks, chronology themes and what adults should be mindful of today.'));
    root.querySelectorAll('[data-group-action]').forEach(btn => btn.addEventListener('click', () => handle(btn.dataset.groupAction)));
  }

  function handle(action) {
    if (!action) return;
    if (action.startsWith('open_tab:')) return openTab(action.split(':')[1]);
    if (action.startsWith('ask:')) return ask(promptFor(action.split(':')[1]));
    if (action.startsWith('hash:')) { location.hash = action.split(':')[1]; window.IndiCareReg44Reader?.mount?.(); return; }
    if (action === 'doc_analyse') return window.IndiCareDocumentIntelligence?.open?.();
    if (action === 'doc_reminders') return window.IndiCareDocumentIntelligence?.reminders?.();
    window.IndiCareConnectedCare?.newRecord?.(action) || window.IndiCareYoungPersonWorkspace?.newRecord?.(action);
  }

  function openTab(key) {
    const tab = document.querySelector(`[data-child-tab="${CSS.escape(key)}"]`);
    if (tab) tab.click();
  }

  function promptFor(topic) {
    const name = selectedChildName();
    const prompts = {
      journey: `Summarise ${name}'s child journey, recent chronology themes, strengths, worries and emerging patterns.`,
      reviews: `Prepare a therapeutic review summary for ${name}, drawing from records, chronology, documents, plans, education, health, safeguarding and child voice.`,
      reg45: 'Generate Reg 45 learning themes using Reg 44 evidence, safeguarding patterns, good practice and provider learning.',
      oversight: 'Prepare a concise RI/CEO oversight briefing: risks, trends, repeated actions, good practice and priorities.'
    };
    return prompts[topic] || `Summarise current priorities for ${name}.`;
  }

  function ask(prompt) {
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(prompt);
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    render();
    const observer = new MutationObserver(() => render());
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareWorkspaceGroups = { render, handle };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
