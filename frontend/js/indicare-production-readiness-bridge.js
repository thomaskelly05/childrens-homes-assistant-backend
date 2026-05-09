(() => {
  const FLAG = '__indicareProductionReadinessBridge';
  const STYLE_ID = 'indicare-production-readiness-style';
  const DRAFT_PREFIX = 'indicare:draft:';
  let refreshTimer = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root{--ic-focus:#155eef}.record-drawer,.care-launcher-panel,.chrono-card,.oversight-card,.record-section{scroll-behavior:smooth}.record-drawer-body input,.record-drawer-body textarea,.record-drawer-body select,.care-search{font-size:16px}.record-drawer-body button,.care-launcher button,.chrono-actions button,.oversight-actions button{min-height:42px}.ic-focus-ring:focus,button:focus,input:focus,textarea:focus,select:focus{outline:3px solid rgba(21,94,239,.24);outline-offset:2px}.mobile-action-safe{padding-bottom:max(12px,env(safe-area-inset-bottom))}.autosave-state{position:fixed;right:22px;bottom:22px;z-index:180;border:1px solid #dbe7f3;background:#fff;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900;color:#334155;box-shadow:0 12px 34px rgba(15,23,42,.14)}@media(max-width:760px){.record-drawer{width:100vw}.record-drawer-body{padding:12px}.record-section,.therapeutic-panel,.daily-context-panel,.chrono-card,.oversight-card{border-radius:17px}.care-launcher{bottom:max(14px,env(safe-area-inset-bottom))}.care-launcher-mini{display:none}.record-form-field textarea{min-height:120px}.autosave-state{left:14px;right:auto;bottom:76px}.record-drawer-head{position:sticky;top:0;z-index:10}}
    `;
    document.head.appendChild(style);
  }

  function qs() { return new URLSearchParams(location.search); }
  function role() { return qs().get('role') || window.currentUser?.role || 'manager'; }
  function userId() { return qs().get('user_id') || window.currentUser?.id || '1'; }
  function childId() { const p = window.state?.selectedChild?.profile || {}; return p.young_person_id || p.id || qs().get('young_person_id') || qs().get('child_id') || 'global'; }
  function draftKey(form) { return `${DRAFT_PREFIX}${childId()}:${form.dataset.recordType || form.id || 'form'}`; }

  function serialiseForm(form) {
    const payload = {};
    new FormData(form).forEach((value, key) => { payload[key] = value; });
    return payload;
  }

  function showAutosaveState(text) {
    let node = document.querySelector('[data-autosave-state]');
    if (!node) {
      node = document.createElement('div');
      node.className = 'autosave-state';
      node.dataset.autosaveState = 'true';
      document.body.appendChild(node);
    }
    node.textContent = text;
    clearTimeout(node._hideTimer);
    node._hideTimer = setTimeout(() => node.remove(), 2500);
  }

  function patchAutosave() {
    if (window.__indicareAutosavePatched) return;
    window.__indicareAutosavePatched = true;
    document.addEventListener('input', (event) => {
      const form = event.target?.closest?.('form');
      if (!form || !form.id?.includes('therapeutic-record')) return;
      try {
        localStorage.setItem(draftKey(form), JSON.stringify({ saved_at: new Date().toISOString(), payload: serialiseForm(form) }));
        showAutosaveState('Draft saved');
      } catch {}
    }, true);
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!form || !form.id?.includes('therapeutic-record')) return;
      try { localStorage.removeItem(draftKey(form)); } catch {}
    }, true);
    window.addEventListener('online', () => document.dispatchEvent(new CustomEvent('indicare:care-data-changed', { detail: { source: 'online-reconnect' } })));
  }

  function restoreDrafts() {
    const form = document.getElementById('therapeutic-record-form');
    if (!form || form.dataset.draftRestoreChecked === 'true') return;
    form.dataset.draftRestoreChecked = 'true';
    try {
      const raw = localStorage.getItem(draftKey(form));
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.payload) return;
      const shouldRestore = confirm('A saved draft was found for this record. Restore it?');
      if (!shouldRestore) return;
      Object.entries(draft.payload).forEach(([key, value]) => {
        const field = form.querySelector(`[name="${CSS.escape(key)}"]`);
        if (field) field.value = value;
      });
      showAutosaveState('Draft restored');
    } catch {}
  }

  function patchRefreshBatching() {
    if (window.__indicareRefreshBatchingPatched) return;
    window.__indicareRefreshBatchingPatched = true;
    document.addEventListener('indicare:care-data-changed', (event) => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        window.IndiCareChronologyVisual?.mount?.();
        window.IndiCareDailyLivingRefinement?.enhance?.();
        window.IndiCareWorkspaceGroups?.render?.();
      }, 250);
    });
  }

  function patchAssistantPermissions() {
    if (window.__indicareAssistantPermissionPatched) return;
    window.__indicareAssistantPermissionPatched = true;
    const guard = () => {
      if (!window.IndiCareOSAssistant || window.IndiCareOSAssistant.__permissionWrapped) return;
      const originalAsk = window.IndiCareOSAssistant.ask;
      if (typeof originalAsk !== 'function') return;
      window.IndiCareOSAssistant.ask = function permissionAwareAsk(prompt, ...rest) {
        const context = window.IndiCareConnectedCare?.context?.() || {};
        const safetyPrefix = `Permission context: user_id=${userId()}, role=${role()}, home_id=${context.home_id || ''}, provider_id=${context.provider_id || ''}, young_person_id=${context.young_person_id || ''}. Only use records visible to this user and do not reveal restricted safeguarding or document content unless directly permitted.`;
        return originalAsk.call(this, `${safetyPrefix}\n\n${prompt || ''}`, ...rest);
      };
      window.IndiCareOSAssistant.__permissionWrapped = true;
    };
    guard();
    setInterval(guard, 1000);
  }

  function patchSensitiveVisualControls() {
    document.querySelectorAll('[data-sensitive="true"], .ic-badge-critical, .ic-badge-high').forEach((node) => {
      if (node.dataset.sensitiveGuarded === 'true') return;
      node.dataset.sensitiveGuarded = 'true';
      node.setAttribute('aria-label', `${node.textContent || 'Sensitive record'} - restricted access may apply`);
      node.title = 'Sensitive information - access and actions may be audited';
    });
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    patchAutosave();
    patchRefreshBatching();
    patchAssistantPermissions();
    const observer = new MutationObserver(() => { restoreDrafts(); patchSensitiveVisualControls(); });
    observer.observe(document.body, { childList: true, subtree: true });
    restoreDrafts();
    patchSensitiveVisualControls();
    window.IndiCareProductionReadiness = { restoreDrafts, showAutosaveState };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
