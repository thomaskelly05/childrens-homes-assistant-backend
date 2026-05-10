(() => {
  const FLAG = '__indicareProductionReadinessBridge';
  const STYLE_ID = 'indicare-production-readiness-style';
  const DRAFT_PREFIX = 'indicare:draft:';
  let refreshTimer = null;
  let restoreAttempted = false;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `:root{--ic-focus:#155eef}.autosave-state{position:fixed;right:22px;bottom:22px;z-index:180;border:1px solid #dbe7f3;background:#fff;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900;color:#334155;box-shadow:0 12px 34px rgba(15,23,42,.14)}`;
    document.head.appendChild(style);
  }

  function qs() { return new URLSearchParams(location.search); }
  function childId() { const p = window.state?.selectedChild?.profile || {}; return p.young_person_id || p.id || qs().get('young_person_id') || 'global'; }
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
    node._hideTimer = setTimeout(() => node.remove(), 2000);
  }

  function patchAutosave() {
    if (window.__indicareAutosavePatched) return;
    window.__indicareAutosavePatched = true;

    document.addEventListener('input', (event) => {
      const form = event.target?.closest?.('form');
      if (!form || !form.id?.includes('therapeutic-record')) return;

      window.IndiCareSafe?.debounce('autosave', () => {
        try {
          localStorage.setItem(draftKey(form), JSON.stringify({ saved_at: new Date().toISOString(), payload: serialiseForm(form) }));
          showAutosaveState('Draft saved');
        } catch (error) {
          console.error('Autosave failed', error);
        }
      }, 350);
    }, true);

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!form || !form.id?.includes('therapeutic-record')) return;
      try { localStorage.removeItem(draftKey(form)); } catch {}
    }, true);
  }

  function restoreDrafts() {
    if (restoreAttempted) return;
    restoreAttempted = true;

    const form = document.getElementById('therapeutic-record-form');
    if (!form) return;

    try {
      const raw = localStorage.getItem(draftKey(form));
      if (!raw) return;

      const draft = JSON.parse(raw);
      if (!draft?.payload) return;

      Object.entries(draft.payload).forEach(([key, value]) => {
        const safe = window.IndiCareSafe?.css?.(key) || key;
        const field = form.querySelector(`[name="${safe}"]`);
        if (field && !field.value) field.value = value;
      });

      showAutosaveState('Draft restored');
    } catch (error) {
      console.error('Draft restore failed', error);
    }
  }

  function patchRefreshBatching() {
    if (window.__indicareRefreshBatchingPatched) return;
    window.__indicareRefreshBatchingPatched = true;

    document.addEventListener('indicare:care-data-changed', () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        window.IndiCareSafe?.run('refresh chronology', () => window.IndiCareChronologyVisual?.mount?.());
        window.IndiCareSafe?.run('refresh daily refinement', () => window.IndiCareDailyLivingRefinement?.enhance?.());
        window.IndiCareSafe?.run('refresh workspace groups', () => window.IndiCareWorkspaceGroups?.render?.());
      }, 200);
    });
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;

    injectStyles();
    patchAutosave();
    patchRefreshBatching();

    setTimeout(() => restoreDrafts(), 600);

    window.IndiCareProductionReadiness = {
      restoreDrafts,
      showAutosaveState
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
