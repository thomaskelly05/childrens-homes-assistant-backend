/* IndiCare AI Provider Overview
   Final standalone enterprise layer: provider dashboard, multi-home intelligence and readiness scoring.
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  const HOMES = [
    { name: 'Home A', readiness: 82, safeguarding: 'Stable', chronology: 'Good', actions: 3, risk: 'medium' },
    { name: 'Home B', readiness: 68, safeguarding: 'Review', chronology: 'Gaps', actions: 7, risk: 'high' },
    { name: 'Home C', readiness: 91, safeguarding: 'Stable', chronology: 'Strong', actions: 1, risk: 'low' }
  ];

  function injectStyles() {
    if ($('icProviderOverviewStyles')) return;

    const style = document.createElement('style');
    style.id = 'icProviderOverviewStyles';
    style.textContent = `
      .ic-provider-shell {
        width: min(1180px, 100%);
        margin: 0 auto;
        display: grid;
        gap: 18px;
      }

      .ic-provider-hero {
        border: 1px solid var(--ic-border);
        border-radius: 28px;
        padding: clamp(22px, 4vw, 36px);
        background:
          radial-gradient(circle at top right, rgba(37,99,235,.14), transparent 30%),
          linear-gradient(180deg, #ffffff, #f8fbff);
        box-shadow: 0 18px 50px rgba(15,23,42,.08);
      }

      .ic-provider-hero h2 {
        margin: 8px 0;
        font-size: clamp(2rem, 4vw, 3.4rem);
        letter-spacing: -.07em;
        line-height: 1;
      }

      .ic-provider-hero p {
        color: var(--ic-muted);
        max-width: 760px;
        line-height: 1.62;
        margin: 0;
      }

      .ic-provider-metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .ic-provider-card {
        border: 1px solid var(--ic-border);
        background: rgba(255,255,255,.94);
        border-radius: 22px;
        padding: 18px;
        box-shadow: 0 12px 34px rgba(15,23,42,.055);
      }

      .ic-provider-card small {
        color: var(--ic-muted);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .08em;
        font-size: .68rem;
      }

      .ic-provider-card strong {
        display: block;
        margin-top: 8px;
        font-size: 1.85rem;
        letter-spacing: -.05em;
      }

      .ic-provider-card span {
        display:block;
        color: var(--ic-muted);
        font-size: .78rem;
        margin-top: 5px;
      }

      .ic-provider-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr);
        gap: 16px;
        align-items: start;
      }

      .ic-home-list,
      .ic-provider-stream {
        display: grid;
        gap: 10px;
      }

      .ic-home-row {
        border: 1px solid var(--ic-border);
        background: #fff;
        border-radius: 18px;
        padding: 14px;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: center;
      }

      .ic-home-row h3 {
        margin: 0 0 4px;
        font-size: .98rem;
      }

      .ic-home-row p {
        margin: 0;
        color: var(--ic-muted);
        font-size: .78rem;
      }

      .ic-readiness-ring {
        width: 54px;
        height: 54px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        font-weight: 900;
        color: var(--ic-blue);
        background: conic-gradient(var(--ic-blue) calc(var(--score) * 1%), #e2e8f0 0);
        position: relative;
      }

      .ic-readiness-ring::before {
        content: '';
        position: absolute;
        inset: 6px;
        background: #fff;
        border-radius: inherit;
      }

      .ic-readiness-ring span {
        position: relative;
        font-size: .82rem;
      }

      .ic-risk-high { border-color: rgba(239,68,68,.25); background: rgba(254,242,242,.84); }
      .ic-risk-medium { border-color: rgba(245,158,11,.25); background: rgba(255,251,235,.88); }
      .ic-risk-low { border-color: rgba(34,197,94,.22); background: rgba(240,253,244,.88); }

      .ic-insight-item {
        border: 1px solid var(--ic-border);
        background: #fff;
        border-radius: 16px;
        padding: 13px;
      }

      .ic-insight-item strong {
        display:block;
        font-size:.86rem;
        margin-bottom:4px;
      }

      .ic-insight-item p {
        margin:0;
        color:var(--ic-muted);
        font-size:.78rem;
        line-height:1.5;
      }

      .ic-provider-actions {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-top:16px;
      }

      .ic-provider-actions button {
        border:1px solid var(--ic-border);
        background:#fff;
        border-radius:999px;
        padding:9px 12px;
        font-weight:800;
        font-size:.78rem;
      }

      .ic-provider-actions button:hover {
        background: var(--ic-blue-soft);
        color: var(--ic-blue);
        border-color: rgba(37,99,235,.22);
      }

      @media (max-width: 980px) {
        .ic-provider-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .ic-provider-grid { grid-template-columns: 1fr; }
      }

      @media (max-width: 640px) {
        .ic-provider-metrics { grid-template-columns: 1fr; }
        .ic-home-row { grid-template-columns: 1fr; }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureProviderButton() {
    const switcher = document.querySelector('.ic-suite-switcher');
    if (!switcher || document.querySelector('[data-suite-view="provider"]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.suiteView = 'provider';
    button.dataset.tierFeature = 'provider_wide_intelligence';
    button.textContent = 'Provider';
    switcher.appendChild(button);
  }

  function ensureProviderPanel() {
    const panel = $('assistantPanel');
    if (!panel || $('indicareProviderOverview')) return;

    const provider = document.createElement('div');
    provider.id = 'indicareProviderOverview';
    provider.className = 'ic-suite-panel hidden';
    provider.dataset.suitePanel = 'provider';
    provider.setAttribute('aria-label', 'IndiCare AI Provider Overview');
    provider.innerHTML = providerHtml();

    panel.appendChild(provider);
  }

  function providerHtml() {
    const average = Math.round(HOMES.reduce((sum, home) => sum + home.readiness, 0) / HOMES.length);
    const highRisk = HOMES.filter((home) => home.risk === 'high').length;
    const actions = HOMES.reduce((sum, home) => sum + home.actions, 0);

    return `
      <section class="ic-provider-shell">
        <div class="ic-provider-hero">
          <span class="ic-surface-pill">Enterprise intelligence</span>
          <h2>Provider overview</h2>
          <p>Provider-wide safeguarding, inspection readiness, chronology quality and operational follow-through in one calm AI command centre.</p>
          <div class="ic-provider-actions">
            <button type="button" data-provider-prompt="Create an executive briefing for provider leadership covering safeguarding, chronology quality, inspection readiness and unresolved actions.">Generate executive briefing</button>
            <button type="button" data-provider-prompt="Identify the highest priority operational risks across homes and recommend next actions.">Prioritise risks</button>
            <button type="button" data-workflow-run="workspace_to_inspection_summary">Inspection summary</button>
          </div>
        </div>

        <section class="ic-provider-metrics">
          <article class="ic-provider-card"><small>Readiness</small><strong>${average}%</strong><span>Average inspection confidence</span></article>
          <article class="ic-provider-card"><small>Homes</small><strong>${HOMES.length}</strong><span>Connected operational homes</span></article>
          <article class="ic-provider-card"><small>Actions</small><strong>${actions}</strong><span>Open follow-up items</span></article>
          <article class="ic-provider-card"><small>High risk</small><strong>${highRisk}</strong><span>Home requiring leadership attention</span></article>
        </section>

        <section class="ic-provider-grid">
          <article class="ic-provider-card">
            <small>Homes</small>
            <div class="ic-home-list">
              ${HOMES.map(home => `
                <div class="ic-home-row ic-risk-${home.risk}">
                  <div>
                    <h3>${home.name}</h3>
                    <p>Safeguarding: ${home.safeguarding} · Chronology: ${home.chronology} · ${home.actions} action(s)</p>
                  </div>
                  <div class="ic-readiness-ring" style="--score:${home.readiness}"><span>${home.readiness}%</span></div>
                </div>
              `).join('')}
            </div>
          </article>

          <aside class="ic-provider-card">
            <small>AI insight stream</small>
            <div class="ic-provider-stream">
              <div class="ic-insight-item"><strong>Chronology gap detected</strong><p>Home B has weaker chronology completeness and should be reviewed before inspection preparation.</p></div>
              <div class="ic-insight-item"><strong>Safeguarding oversight</strong><p>Leadership should check whether all open safeguarding actions have management oversight recorded.</p></div>
              <div class="ic-insight-item"><strong>Inspection readiness</strong><p>Provider average is stable, but one home is below the preferred confidence threshold.</p></div>
            </div>
          </aside>
        </section>
      </section>
    `;
  }

  function bindProviderPrompts() {
    document.addEventListener('click', (event) => {
      const prompt = event.target.closest('[data-provider-prompt]');
      if (!prompt) return;

      const input = $('input');
      if (!input) return;

      input.value = prompt.dataset.providerPrompt || '';
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));

      document.querySelector('[data-suite-view="intelligence"]')?.click();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    ensureProviderButton();
    ensureProviderPanel();
    bindProviderPrompts();

    setTimeout(() => {
      window.IndiCareTierAccess?.applyTier?.(window.IndiCareCurrentTier || {});
    }, 1000);
  });
})();
