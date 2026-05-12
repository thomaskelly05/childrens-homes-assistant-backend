(() => {
  const FLAG = '__indicareChronologyFirstLayout';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function simplifyMetrics() {
    const overview = document.querySelector('.ic365-operational-overview');
    if (!overview) return;

    const cards = [...overview.querySelectorAll('.ic365-overview-card')];
    cards.forEach((card, index) => {
      if (index > 2) card.remove();
    });
  }

  function simplifyTabs() {
    const tabs = document.querySelector('.ic365-workspace-tabs');
    if (!tabs) return;

    const buttons = [...tabs.querySelectorAll('button')];
    buttons.forEach((button, index) => {
      if (index > 5) button.remove();
    });
  }

  function removeDuplicatePanels() {
    document.querySelectorAll('.panel.ic365-command-rail').forEach((panel) => {
      panel.innerHTML = `
        <div class="ic365-context-panel">
          <p class="eyebrow">Shift context</p>
          <h3>Current focus</h3>
          <div class="ic365-context-state stable">
            <strong>Stable placement</strong>
            <span>Low escalation risk • Emotional presentation settled</span>
          </div>
          <div class="ic365-context-actions">
            <button type="button" data-open-os-assistant>Ask assistant</button>
            <button type="button">View reminders</button>
          </div>
        </div>
      `;
    });

    document.querySelectorAll('.ic365-side-card').forEach((card, index) => {
      if (index > 1) card.style.display = 'none';
    });
  }

  function expandChronology() {
    const workspace = document.getElementById('workspace-main');
    if (!workspace) return;

    workspace.classList.remove('two-column');
    workspace.classList.add('ic365-chronology-layout');

    const chronology = workspace.querySelector('.panel');
    if (chronology) chronology.classList.add('ic365-primary-chronology');
  }

  function simplifyHeader() {
    const subtitle = document.getElementById('view-subtitle');
    if (subtitle) {
      subtitle.textContent = 'Live chronology and recording for the current shift.';
    }

    const focusBar = document.getElementById('ic365-focus-bar');
    if (focusBar) {
      const buttons = [...focusBar.querySelectorAll('button')];
      buttons.forEach((button, index) => {
        if (index > 2) button.remove();
      });
    }
  }

  function injectStyles() {
    if (document.getElementById('ic365-chronology-first-styles')) return;

    const style = document.createElement('style');
    style.id = 'ic365-chronology-first-styles';
    style.textContent = `
      .ic365-chronology-layout{display:grid!important;grid-template-columns:minmax(0,1fr) 320px!important;gap:18px!important;align-items:start}
      .ic365-primary-chronology{min-height:calc(100vh - 260px)}
      .ic365-primary-chronology .ic365-record-feed{gap:18px!important}
      .ic365-primary-chronology .ic365-record-card{padding:24px!important;border-radius:24px!important}
      .ic365-primary-chronology .ic365-record-card h4{font-size:22px!important}
      .ic365-primary-chronology .ic365-record-card p{font-size:15px!important;line-height:1.72!important}
      .ic365-operational-overview{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      .ic365-workspace-tabs{margin-top:8px!important;margin-bottom:14px!important}
      .ic365-workspace-tabs button{padding:9px 12px!important;font-size:12px!important}
      .ic365-context-panel{display:grid;gap:16px}
      .ic365-context-state{padding:18px;border-radius:22px;background:linear-gradient(135deg,rgba(20,184,166,.12),rgba(37,99,235,.08));border:1px solid rgba(20,184,166,.16)}
      .ic365-context-state strong{display:block;font-size:20px;letter-spacing:-.03em;color:#0f766e;margin-bottom:6px}
      .ic365-context-state span{display:block;font-size:13px;color:#475569;line-height:1.5}
      .ic365-context-actions{display:grid;gap:10px}
      .ic365-context-actions button{border:1px solid rgba(15,23,42,.08);background:#fff;border-radius:16px;padding:13px;text-align:left;font-weight:850;color:#0f172a}
      .ic365-rightpanel{padding-top:24px!important}
      .ic365-page-header{padding-bottom:22px!important}
      .ic365-page-header h1{font-size:44px!important}
      .ic365-focus-bar{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      @media(max-width:1100px){.ic365-chronology-layout{grid-template-columns:1fr!important}.ic365-rightpanel{display:none!important}}
    `;

    document.head.appendChild(style);
  }

  function boot() {
    simplifyMetrics();
    simplifyTabs();
    removeDuplicatePanels();
    expandChronology();
    simplifyHeader();
    injectStyles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();