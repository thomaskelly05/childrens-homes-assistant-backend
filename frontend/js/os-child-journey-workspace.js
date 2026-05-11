(() => {
  const FLAG = '__indicareChildJourneyWorkspace';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function getContext() {
    return window.IndiCareOSContext || {};
  }

  function safe(value, fallback = 'Unknown') {
    return value == null || value === '' ? fallback : String(value);
  }

  function ensureWorkspaceShell() {
    const existing = document.getElementById('indicare-child-journey-workspace');
    if (existing) return existing;

    const runtime = document.querySelector('.ic-workspace, .workspace, main, .ic-layout');
    if (!runtime) return null;

    const shell = document.createElement('section');
    shell.id = 'indicare-child-journey-workspace';
    shell.className = 'ic-card indicare-child-journey-workspace';
    shell.innerHTML = `
      <style>
        .indicare-child-journey-workspace{display:grid;gap:20px;padding:22px;border-radius:28px;background:linear-gradient(180deg,#ffffff,#f8fafc)}
        .journey-header{display:grid;gap:8px;padding-bottom:18px;border-bottom:1px solid #dbe7f3}
        .journey-kicker{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#155eef;font-weight:900}
        .journey-title{font-size:34px;line-height:1;letter-spacing:-.04em;font-weight:900;color:#0f172a}
        .journey-subtitle{color:#64748b;line-height:1.5;max-width:820px}
        .journey-grid{display:grid;grid-template-columns:1.3fr .9fr;gap:18px}
        .journey-panel{border:1px solid #dbe7f3;border-radius:22px;padding:18px;background:#fff}
        .journey-panel h3{margin:0 0 12px;font-size:18px;color:#0f172a}
        .journey-stack{display:grid;gap:12px}
        .journey-item{padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0}
        .journey-item strong{display:block;color:#0f172a;margin-bottom:4px}
        .journey-item span{color:#64748b;line-height:1.5}
        .journey-record-box{display:grid;gap:10px}
        .journey-record-box textarea{width:100%;min-height:160px;border-radius:16px;border:1px solid #cbd5e1;padding:14px;font:inherit;resize:vertical;background:#fff;color:#0f172a}
        .journey-actions{display:flex;justify-content:flex-end;gap:10px}
        .journey-button{border:0;border-radius:14px;padding:12px 16px;font-weight:900;cursor:pointer}
        .journey-button.primary{background:#155eef;color:#fff}
        .journey-button.secondary{background:#eef4fb;color:#334155}
        @media(max-width:900px){.journey-grid{grid-template-columns:1fr}.journey-title{font-size:28px}}
      </style>
      <header class="journey-header">
        <div class="journey-kicker">Child journey workspace</div>
        <div class="journey-title" data-journey-title>Today for child</div>
        <div class="journey-subtitle" data-journey-subtitle>The workspace exists to help adults maintain continuity of understanding, reflection and therapeutic care over time.</div>
      </header>

      <div class="journey-grid">
        <section class="journey-panel">
          <h3>Today</h3>
          <div class="journey-stack" id="journey-today-stack">
            <article class="journey-item">
              <strong>Current presentation</strong>
              <span>Loading current emotional presentation…</span>
            </article>
            <article class="journey-item">
              <strong>What adults should understand</strong>
              <span>Loading contextual guidance…</span>
            </article>
            <article class="journey-item">
              <strong>Support guidance</strong>
              <span>Loading therapeutic support suggestions…</span>
            </article>
          </div>
        </section>

        <section class="journey-panel">
          <h3>Record a support moment</h3>
          <div class="journey-record-box">
            <textarea id="journey-record-input" placeholder="Tell us what happened, what it might mean, what helped, and what other adults should understand…"></textarea>
            <div class="journey-actions">
              <button class="journey-button secondary" type="button" id="journey-clear">Clear</button>
              <button class="journey-button primary" type="button" id="journey-save">Save support moment</button>
            </div>
          </div>
        </section>
      </div>
    `;

    runtime.prepend(shell);
    return shell;
  }

  function renderContext() {
    const context = getContext();
    const shell = ensureWorkspaceShell();
    if (!shell) return;

    const title = shell.querySelector('[data-journey-title]');
    const subtitle = shell.querySelector('[data-journey-subtitle]');

    title.textContent = `Today for ${safe(context.childName, 'this child')}`;
    subtitle.textContent = `${safe(context.childName, 'The child')} · ${safe(context.homeName, 'Home context')} — The OS should help adults understand what is happening today, what support is needed, and what is changing over time.`;
  }

  function bindActions() {
    const shell = ensureWorkspaceShell();
    if (!shell || shell.dataset.bound === 'true') return;
    shell.dataset.bound = 'true';

    shell.querySelector('#journey-clear')?.addEventListener('click', () => {
      const input = shell.querySelector('#journey-record-input');
      if (input) input.value = '';
    });

    shell.querySelector('#journey-save')?.addEventListener('click', () => {
      const input = shell.querySelector('#journey-record-input');
      if (!input || !input.value.trim()) return;

      const event = {
        type: 'support_moment',
        narrative: input.value.trim(),
        context: getContext(),
        createdAt: new Date().toISOString()
      };

      document.dispatchEvent(new CustomEvent('indicare:journey-event-created', {
        detail: event
      }));

      console.info('[IndiCare OS] Support moment recorded', event);

      input.value = '';

      const stack = shell.querySelector('#journey-today-stack');
      const item = document.createElement('article');
      item.className = 'journey-item';
      item.innerHTML = `<strong>New support moment</strong><span>${safe(event.narrative)}</span>`;
      stack.prepend(item);
    });
  }

  function boot() {
    renderContext();
    bindActions();

    document.addEventListener('indicare:os-context-ready', () => {
      renderContext();
      bindActions();
    });

    console.info('[IndiCare OS] Child journey workspace active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();