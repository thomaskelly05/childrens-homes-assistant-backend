(() => {
  const FLAG = '__indicareIntelligenceMigrationBridge';
  const STYLE_ID = 'indicare-intelligence-migration-bridge-style';
  const PANEL_ID = 'indicare-intelligence-bridge-panel';

  if (window[FLAG]) return;
  window[FLAG] = true;

  function safe(label, fn) {
    try { return fn(); } catch (error) { console.error(`[IndiCare intelligence bridge] ${label}`, error); return undefined; }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function intel() { return window.IndiCareOperationalIntelligence; }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .intel-bridge-panel{border:1px solid #dbe7f3;background:#fff;border-radius:22px;padding:14px;margin:14px 0;box-shadow:0 14px 38px rgba(15,23,42,.07)}
      .intel-bridge-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}.intel-bridge-head h3{margin:0;color:#0f172a}.intel-bridge-head small{color:#64748b}.intel-bridge-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.intel-bridge-card{border:1px solid #e2e8f0;background:#f8fafc;border-radius:18px;padding:12px}.intel-bridge-card strong{display:block;color:#0f172a}.intel-bridge-card p{margin:6px 0 0;color:#475569;line-height:1.45;font-size:13px}.intel-bridge-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.intel-bridge-actions button{border:0;border-radius:13px;background:#155eef;color:#fff;font-weight:900;padding:9px 11px}.intel-bridge-actions button.secondary{background:#eef4fb;color:#334155}.intel-bridge-chip{display:inline-flex;border-radius:999px;background:#eef4fb;color:#334155;font-size:11px;font-weight:850;padding:5px 8px;margin:2px}
    `;
    document.head.appendChild(style);
  }

  function context() {
    return intel()?.assistantContext?.('canonical migration bridge') || {};
  }

  function missing() { return intel()?.missingInsights?.() || { prompts: [], risk_level: 'unknown' }; }
  function continuity() { return intel()?.continuityInsights?.() || { prompts: [], unresolved_count: 0 }; }
  function safeguarding() { return intel()?.safeguardingInsights?.() || { escalation_indicators: [], risk_count: 0 }; }
  function compliance() { return intel()?.complianceInsights?.() || { missing_documents: [] }; }

  function promptFor(topic) {
    const m = missing();
    const c = continuity();
    const s = safeguarding();
    const d = compliance();
    const child = context().child || {};
    return `Topic: ${topic}\n\nChild: ${child.display_name || child.preferred_name || child.first_name || 'selected young person'}\n\nContextual safeguarding missing guidance:\n${(m.prompts || []).join('\n')}\n\nSafeguarding indicators:\n${(s.escalation_indicators || []).join('\n')}\n\nContinuity prompts:\n${(c.prompts || []).join('\n')}\n\nHome compliance gaps:\n${(d.missing_documents || []).join(', ')}\n\nUse this as professional support only. Do not present certainty about where a missing child is. Give practical, calm, risk-aware prompts for adults, including where to review previous patterns, known safe places, risky locations, trusted adults, family/peer links, transport routes, online/contact risks and escalation actions.`;
  }

  function ask(topic) {
    const prompt = promptFor(topic);
    window.IndiCareOSAssistant?.open?.();
    window.IndiCareOSAssistant?.ask?.(prompt);
    return prompt;
  }

  function patchAssistant() {
    if (window.__indicareAssistantCanonicalPatched) return;
    window.__indicareAssistantCanonicalPatched = true;
    window.IndiCareAssistantContext = window.IndiCareAssistantContext || {};
    window.IndiCareAssistantContext.build = (topic = 'operational context') => context(topic);
    window.IndiCareAssistantContext.ask = ask;
    window.IndiCareAssistantContext.promptFor = promptFor;
  }

  function patchOperationalLayers() {
    if (window.IndiCareOperationalLinks && !window.IndiCareOperationalLinks.askCanonical) {
      window.IndiCareOperationalLinks.askCanonical = ask;
    }
    if (window.IndiCareOperationalIntelligence && !window.IndiCareOperationalIntelligence.askMissingGuidance) {
      window.IndiCareOperationalIntelligence.askMissingGuidance = () => ask('missing child contextual safeguarding guidance');
      window.IndiCareOperationalIntelligence.askCompliance = () => ask('home compliance and documents');
      window.IndiCareOperationalIntelligence.askContinuity = () => ask('shift continuity and what adults should know');
      window.IndiCareOperationalIntelligence.askSafeguarding = () => ask('safeguarding escalation and contextual risk');
    }
  }

  function renderPanel() {
    const workspace = document.getElementById('workspace') || document.querySelector('.ic-workspace');
    if (!workspace || !intel()) return;
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = PANEL_ID;
      panel.className = 'intel-bridge-panel';
      const memory = document.getElementById('os-intelligence-memory-strip') || document.getElementById('os-safe-continuity-strip');
      if (memory?.nextSibling) workspace.insertBefore(panel, memory.nextSibling);
      else workspace.appendChild(panel);
    }
    const m = missing();
    const c = continuity();
    const s = safeguarding();
    const d = compliance();
    panel.innerHTML = `<div class="intel-bridge-head"><div><h3>Canonical intelligence bridge</h3><small>Assistant, chronology, safeguarding, continuity and home-compliance prompts now use one operational intelligence source.</small></div><div class="intel-bridge-actions"><button type="button" data-bridge-ask="missing child contextual safeguarding guidance">Missing guidance</button><button type="button" class="secondary" data-bridge-ask="home documents and compliance">Home documents</button></div></div><div class="intel-bridge-grid"><article class="intel-bridge-card"><strong>Missing guidance</strong><p>${esc((m.prompts || [])[0] || 'No missing episode pattern loaded yet.')}</p><span class="intel-bridge-chip">${esc(m.risk_level || 'contextual')}</span></article><article class="intel-bridge-card"><strong>Continuity</strong><p>${esc(c.unresolved_count || 0)} unresolved prompts detected across records and chronology.</p></article><article class="intel-bridge-card"><strong>Safeguarding</strong><p>${esc(s.risk_count || 0)} risk indicators available for assistant context.</p></article><article class="intel-bridge-card"><strong>Home documents</strong><p>${esc((d.missing_documents || []).slice(0, 4).join(', ') || 'Core home documents present or not loaded.')}</p></article></div>`;
    bindPanel(panel);
  }

  function bindPanel(panel) {
    panel.querySelectorAll('[data-bridge-ask]').forEach(button => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => ask(button.dataset.bridgeAsk));
    });
  }

  function patchLoadAll() {
    if (window.__indicareBridgeLoadAllPatched || typeof window.loadAll !== 'function') return;
    window.__indicareBridgeLoadAllPatched = true;
    const original = window.loadAll;
    window.loadAll = async function patchedLoadAll(...args) {
      const result = await original.apply(this, args);
      setTimeout(refresh, 120);
      return result;
    };
  }

  function refresh() {
    safe('patch assistant', patchAssistant);
    safe('patch operational layers', patchOperationalLayers);
    safe('render panel', renderPanel);
  }

  function boot() {
    injectStyles();
    patchLoadAll();
    refresh();
    document.addEventListener('indicare:care-data-changed', () => setTimeout(refresh, 120));
    const observer = new MutationObserver(() => window.IndiCareSafe?.debounce?.('intel-migration-bridge-refresh', refresh, 400) || setTimeout(refresh, 400));
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareIntelligenceMigrationBridge = { refresh, ask, promptFor, context };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
