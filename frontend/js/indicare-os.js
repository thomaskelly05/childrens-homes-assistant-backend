// IndiCare OS runtime enhancements
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function injectSidebar() {
    const shell = qs('#ypShell');
    if (!shell) return;

    // wrap existing content into workspace area
    const header = qs('#ypHeader');
    const hero = qs('.yp-hero');
    const tabs = qs('#ypTabs');
    const content = qs('#ypContent');

    const workspace = document.createElement('div');
    workspace.className = 'ic-os-workspace';

    if (hero) workspace.appendChild(hero);
    if (tabs) workspace.appendChild(tabs);
    if (content) workspace.appendChild(content);

    // build sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'ic-os-sidebar';

    sidebar.innerHTML = `
      <div class="ic-os-brand">
        <div class="ic-os-mark">IC</div>
        <div>
          <h1 class="ic-os-brand-title">INDICARE</h1>
          <p class="ic-os-brand-subtitle">Children's Home OS</p>
        </div>
      </div>

      <nav class="ic-os-nav" aria-label="IndiCare OS navigation">
        <div class="ic-os-nav-section">Child</div>
        <button data-os-tab="daily"><span class="ic-os-nav-icon">📝</span>Daily notes</button>
        <button data-os-tab="incidents"><span class="ic-os-nav-icon">⚠️</span>Incidents</button>
        <button data-os-tab="health"><span class="ic-os-nav-icon">🩺</span>Health</button>
        <button data-os-tab="education"><span class="ic-os-nav-icon">🎓</span>Education</button>
        <button data-os-tab="family"><span class="ic-os-nav-icon">👪</span>Family</button>
        <button data-os-tab="medication"><span class="ic-os-nav-icon">💊</span>Medication</button>
        <button data-os-tab="assistant"><span class="ic-os-nav-icon">🤖</span>Assistant</button>

        <div class="ic-os-nav-section">System</div>
        <a href="/rostering.html"><span class="ic-os-nav-icon">📅</span>Rostering</a>
        <a href="/documents-hub.html"><span class="ic-os-nav-icon">📁</span>Documents</a>
        <a href="/staff-portal.html"><span class="ic-os-nav-icon">👥</span>Staff</a>
      </nav>

      <div class="ic-os-sidebar-footer">
        IndiCare OS · Safer care through better records
      </div>
    `;

    // recompose grid
    shell.innerHTML = '';
    shell.appendChild(sidebar);
    if (header) shell.appendChild(header);
    shell.appendChild(workspace);

    // bind sidebar to existing tabs
    qsa('[data-os-tab]', sidebar).forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-os-tab');
        const target = qs(`#ypTabs [data-tab="${tab}"]`);
        if (target) target.click();
        qsa('[data-os-tab]', sidebar).forEach(b => b.classList.toggle('active', b === btn));
      });
    });
  }

  function enhanceRecordCards() {
    const list = qs('#ypRecordsList');
    if (!list) return;

    function decorate() {
      qsa('.yp-record-card', list).forEach(card => {
        if (card.dataset.icEnhanced) return;
        card.dataset.icEnhanced = 'true';

        // make focusable
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');

        // add actions footer
        const actions = document.createElement('div');
        actions.className = 'ic-record-actions';
        actions.innerHTML = `
          <button type="button" data-action="open">Open</button>
          <button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="assistant">Ask Assistant</button>
        `;
        card.appendChild(actions);

        // click to open detail
        const open = () => openDetailFromCard(card);
        card.addEventListener('click', (e) => {
          const act = e.target.closest('[data-action]');
          if (act && act.dataset.action !== 'open') return; // only open on card or open button
          open();
        });
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      });
    }

    // initial + observe
    decorate();
    const mo = new MutationObserver(decorate);
    mo.observe(list, { childList: true, subtree: true });
  }

  function ensureDetailHost() {
    let host = qs('#icRecordDetail');
    if (host) return host;

    host = document.createElement('div');
    host.id = 'icRecordDetail';
    host.className = 'ic-os-record-detail';
    host.innerHTML = `
      <div class="ic-os-record-detail-panel" role="dialog" aria-modal="true">
        <div class="ic-os-record-detail-head">
          <div>
            <p class="yp-eyebrow">Record</p>
            <h2 id="icDetailTitle">Record</h2>
            <p id="icDetailMeta"></p>
          </div>
          <button id="icDetailClose" class="yp-button">Close</button>
        </div>
        <div class="ic-os-record-detail-grid" id="icDetailGrid"></div>
      </div>
    `;
    document.body.appendChild(host);

    qs('#icDetailClose', host).addEventListener('click', () => host.classList.remove('open'));
    host.addEventListener('click', (e) => { if (e.target === host) host.classList.remove('open'); });

    return host;
  }

  function openDetailFromCard(card) {
    const host = ensureDetailHost();
    const title = qs('h3', card)?.textContent || 'Record';
    const body = qs('p', card)?.textContent || '';
    const chips = qsa('.yp-chip', card).map(n => n.textContent).join(' · ');

    const grid = qs('#icDetailGrid', host);
    grid.innerHTML = `
      <div class="ic-os-detail-block"><strong>Summary</strong>${escapeHtml(body)}</div>
      <div class="ic-os-detail-block"><strong>Meta</strong>${escapeHtml(chips)}</div>
      <div class="ic-os-detail-block"><strong>Actions</strong>Open · Edit · Link to risk · Add follow-up</div>
    `;

    qs('#icDetailTitle', host).textContent = title;
    qs('#icDetailMeta', host).textContent = chips;

    host.classList.add('open');
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  }

  function start() {
    document.body.classList.add('indicare-os-body');
    injectSidebar();
    enhanceRecordCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
