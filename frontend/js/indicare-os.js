// IndiCare OS runtime enhancements
// Safe enhancement layer: it must not restructure the Young People Shell until
// the modular shell has finished booting and bound its required DOM contract.
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  const OS = {
    selectedCard: null,
    selectedRecord: null,
    started: false,
    maxBootWaitMs: 12000,
  };

  const REQUIRED_SHELL_IDS = [
    'ypShell',
    'ypHeader',
    'ypSelector',
    'ypStatus',
    'ypTabs',
    'ypContent',
    'ypRecordsPanel',
    'ypRecordsTitle',
    'ypRecordsSubtitle',
    'ypRecordsList',
    'ypAssistantPanel',
    'ypAssistantTitle',
    'ypAssistantMessages',
    'ypAssistantInput',
    'ypAssistantSend',
    'ypAssistantStatus',
    'ypComposer',
    'ypComposerBackdrop',
    'ypComposerDialog',
    'ypComposerTitle',
    'ypComposerSubtitle',
    'ypComposerClose',
    'ypComposerForm',
    'ypComposerFields',
    'ypComposerSaveDraft',
    'ypComposerSubmit',
    'ypComposerStatus',
  ];

  function shellContractReady() {
    return REQUIRED_SHELL_IDS.every(id => document.getElementById(id));
  }

  function shellBooted() {
    return window.__INDICARE_YOUNG_PEOPLE_SHELL_BOOTED__ === true;
  }

  function injectSidebar() {
    const shell = qs('#ypShell');
    if (!shell || shell.dataset.icOsReady === 'true') return;

    const header = qs('#ypHeader');
    const hero = qs('.yp-hero');
    const tabs = qs('#ypTabs');
    const content = qs('#ypContent');

    if (!header || !tabs || !content) return;

    shell.dataset.icOsReady = 'true';

    const workspace = document.createElement('div');
    workspace.className = 'ic-os-workspace';

    if (hero) workspace.appendChild(hero);
    workspace.appendChild(tabs);
    workspace.appendChild(content);

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
        <div class="ic-os-nav-section">Child OS</div>
        <button type="button" data-os-tab="daily"><span class="ic-os-nav-icon">N</span>Daily notes</button>
        <button type="button" data-os-tab="incidents"><span class="ic-os-nav-icon">!</span>Incidents</button>
        <button type="button" data-os-tab="health"><span class="ic-os-nav-icon">H</span>Health</button>
        <button type="button" data-os-tab="education"><span class="ic-os-nav-icon">E</span>Education</button>
        <button type="button" data-os-tab="family"><span class="ic-os-nav-icon">F</span>Family</button>
        <button type="button" data-os-tab="medication"><span class="ic-os-nav-icon">M</span>Medication</button>
        <button type="button" data-os-tab="assistant"><span class="ic-os-nav-icon">AI</span>Assistant</button>

        <div class="ic-os-nav-section">Home OS</div>
        <a href="/rostering.html"><span class="ic-os-nav-icon">R</span>Rostering</a>
        <a href="/documents-hub.html"><span class="ic-os-nav-icon">D</span>Documents</a>
        <a href="/staff-portal.html"><span class="ic-os-nav-icon">S</span>Staff</a>
      </nav>

      <div class="ic-os-sidebar-footer">
        IndiCare OS<br />Safer care through better records.
      </div>
    `;

    shell.replaceChildren(sidebar, header, workspace);

    qsa('[data-os-tab]', sidebar).forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-os-tab');
        const target = qs(`#ypTabs [data-tab="${tab}"]`);
        if (target) target.click();
        syncActiveSidebarTab(tab);
      });
    });

    syncActiveSidebarTab(qs('#ypTabs .active')?.dataset?.tab || 'daily');
  }

  function syncActiveSidebarTab(tab) {
    qsa('[data-os-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-os-tab') === tab);
    });
  }

  function currentContext() {
    const selector = qs('#ypSelector');
    const selectedText = selector?.selectedOptions?.[0]?.textContent?.trim() || '';
    const activeTab = qs('#ypTabs .active')?.dataset?.tab || '';
    return {
      youngPersonId: document.body?.dataset?.youngPersonId || qs('#ypShell')?.dataset?.youngPersonId || selector?.value || '',
      youngPersonName: selectedText || qs('#ypPersonName')?.textContent?.trim() || 'Selected young person',
      section: activeTab || 'daily',
    };
  }

  function enhanceRecordCards() {
    const list = qs('#ypRecordsList');
    if (!list || list.dataset.icOsObserver === 'true') return;
    list.dataset.icOsObserver = 'true';

    function decorate() {
      qsa('.yp-record-card', list).forEach(card => {
        if (card.dataset.icEnhanced) return;
        card.dataset.icEnhanced = 'true';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Open ${qs('h3', card)?.textContent || 'record'}`);

        const actions = document.createElement('div');
        actions.className = 'ic-record-actions';
        actions.innerHTML = `
          <button type="button" data-action="open">Open</button>
          <button type="button" data-action="create-action">Add action</button>
          <button type="button" data-action="link-evidence">Link evidence</button>
          <button type="button" data-action="assistant">Ask Assistant</button>
        `;
        card.appendChild(actions);

        card.addEventListener('click', (e) => {
          const action = e.target.closest('[data-action]')?.dataset?.action || 'open';
          if (action === 'open') return openDetailFromCard(card);
          if (action === 'create-action') return openActionBuilder(card);
          if (action === 'link-evidence') return openEvidenceBuilder(card);
          if (action === 'assistant') return sendRecordToAssistant(card);
        });

        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetailFromCard(card);
          }
        });
      });
    }

    decorate();
    const mo = new MutationObserver(decorate);
    mo.observe(list, { childList: true, subtree: true });
  }

  function extractRecord(card) {
    const ctx = currentContext();
    return {
      title: qs('h3', card)?.textContent?.trim() || 'Record',
      body: qs('p', card)?.textContent?.trim() || '',
      meta: qsa('.yp-chip', card).map(n => n.textContent.trim()).filter(Boolean),
      section: ctx.section,
      youngPersonId: ctx.youngPersonId,
      youngPersonName: ctx.youngPersonName,
    };
  }

  function ensureDetailHost() {
    let host = qs('#icRecordDetail');
    if (host) return host;

    host = document.createElement('div');
    host.id = 'icRecordDetail';
    host.className = 'ic-os-record-detail';
    host.innerHTML = `
      <div class="ic-os-record-detail-panel" role="dialog" aria-modal="true" aria-labelledby="icDetailTitle">
        <div class="ic-os-record-detail-head">
          <div>
            <p class="yp-eyebrow" id="icDetailType">Record</p>
            <h2 id="icDetailTitle">Record</h2>
            <p id="icDetailMeta"></p>
          </div>
          <div class="ic-detail-head-actions">
            <button id="icDetailAssistant" class="yp-button yp-button-primary" type="button">Ask Assistant</button>
            <button id="icDetailAction" class="yp-button" type="button">Add action</button>
            <button id="icDetailClose" class="yp-button" type="button">Close</button>
          </div>
        </div>
        <div class="ic-os-record-detail-grid" id="icDetailGrid"></div>
      </div>
    `;
    document.body.appendChild(host);

    qs('#icDetailClose', host).addEventListener('click', () => host.classList.remove('open'));
    qs('#icDetailAssistant', host).addEventListener('click', () => OS.selectedCard && sendRecordToAssistant(OS.selectedCard));
    qs('#icDetailAction', host).addEventListener('click', () => OS.selectedCard && openActionBuilder(OS.selectedCard));
    host.addEventListener('click', (e) => { if (e.target === host) host.classList.remove('open'); });

    return host;
  }

  function openDetailFromCard(card) {
    OS.selectedCard = card;
    OS.selectedRecord = extractRecord(card);
    qsa('.yp-record-card').forEach(item => item.classList.toggle('ic-record-open', item === card));

    const record = OS.selectedRecord;
    const host = ensureDetailHost();
    const grid = qs('#icDetailGrid', host);

    grid.innerHTML = `
      <div class="ic-os-detail-block ic-os-detail-block-wide"><strong>Summary</strong><p>${escapeHtml(record.body || 'No further detail recorded.')}</p></div>
      <div class="ic-os-detail-block"><strong>Young person</strong><p>${escapeHtml(record.youngPersonName)}</p></div>
      <div class="ic-os-detail-block"><strong>Section</strong><p>${escapeHtml(record.section)}</p></div>
      <div class="ic-os-detail-block"><strong>Status and dates</strong><p>${escapeHtml(record.meta.join(' - ') || 'No status recorded')}</p></div>
      <div class="ic-os-detail-block"><strong>Linked actions</strong><p>No linked actions yet. Use Add action to create follow-up.</p></div>
      <div class="ic-os-detail-block"><strong>Evidence</strong><p>Ready to link to SCCIF, report evidence or manager review.</p></div>
      <div class="ic-os-detail-block"><strong>Audit trail</strong><p>Opened in IndiCare OS. Full audit trail can be wired to backend record events next.</p></div>
    `;

    qs('#icDetailTitle', host).textContent = record.title;
    qs('#icDetailMeta', host).textContent = record.meta.join(' - ');
    qs('#icDetailType', host).textContent = `${record.section} record`;
    host.classList.add('open');
  }

  function ensureDrawerHost() {
    let host = qs('#icOsDrawer');
    if (host) return host;
    host = document.createElement('section');
    host.id = 'icOsDrawer';
    host.className = 'ic-os-drawer';
    host.innerHTML = `
      <div class="ic-os-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="icDrawerTitle">
        <header class="ic-os-drawer-head">
          <div>
            <p class="yp-eyebrow" id="icDrawerEyebrow">IndiCare OS</p>
            <h2 id="icDrawerTitle">Action</h2>
            <p id="icDrawerSubtitle"></p>
          </div>
          <button class="yp-button" type="button" id="icDrawerClose">Close</button>
        </header>
        <div id="icDrawerBody" class="ic-os-drawer-body"></div>
      </div>
    `;
    document.body.appendChild(host);
    qs('#icDrawerClose', host).addEventListener('click', () => host.classList.remove('open'));
    host.addEventListener('click', e => { if (e.target === host) host.classList.remove('open'); });
    return host;
  }

  function openDrawer(title, subtitle, body, eyebrow) {
    const host = ensureDrawerHost();
    qs('#icDrawerTitle', host).textContent = title;
    qs('#icDrawerSubtitle', host).textContent = subtitle || '';
    qs('#icDrawerEyebrow', host).textContent = eyebrow || 'IndiCare OS';
    qs('#icDrawerBody', host).innerHTML = body;
    host.classList.add('open');
  }

  function openActionBuilder(card) {
    OS.selectedCard = card;
    const record = extractRecord(card);
    openDrawer(
      'Create linked action',
      `Linked to: ${record.title}`,
      `
        <form class="ic-os-form" id="icActionForm">
          <label><span>Action required</span><textarea name="action" rows="4">Follow up: ${escapeHtml(record.title)}</textarea></label>
          <label><span>Owner</span><input name="owner" placeholder="Staff member or manager" /></label>
          <label><span>Due date</span><input name="due" type="date" /></label>
          <label><span>Priority</span><select name="priority"><option>Routine</option><option>Important</option><option>Urgent safeguarding</option><option>Manager review</option></select></label>
          <button class="yp-button yp-button-primary" type="submit">Save linked action</button>
        </form>
        <div class="ic-os-save-note" id="icActionSaveNote"></div>
      `,
      'Action OS'
    );
    qs('#icActionForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      qs('#icActionSaveNote').textContent = 'Action captured locally in the OS layer. Backend persistence can be connected to the tasks/actions router next.';
      markCardWithBadge(card, 'Action drafted');
    });
  }

  function openEvidenceBuilder(card) {
    OS.selectedCard = card;
    const record = extractRecord(card);
    openDrawer(
      'Link evidence',
      'Prepare this record for quality, manager review or Ofsted evidence.',
      `
        <form class="ic-os-form" id="icEvidenceForm">
          <label><span>Evidence category</span><select name="category"><option>Child lived experience</option><option>Safeguarding</option><option>Health and wellbeing</option><option>Education</option><option>Leadership and management</option><option>Workforce</option></select></label>
          <label><span>Evidence note</span><textarea rows="5">${escapeHtml(record.title)} shows...</textarea></label>
          <label><span>Review destination</span><select><option>Manager review</option><option>SCCIF evidence</option><option>Reg 45</option><option>Quality audit</option></select></label>
          <button class="yp-button yp-button-primary" type="submit">Save evidence link</button>
        </form>
        <div class="ic-os-save-note" id="icEvidenceSaveNote"></div>
      `,
      'Evidence OS'
    );
    qs('#icEvidenceForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      qs('#icEvidenceSaveNote').textContent = 'Evidence link captured locally in the OS layer. Backend persistence can be connected to evidence/inspection routers next.';
      markCardWithBadge(card, 'Evidence linked');
    });
  }

  function markCardWithBadge(card, text) {
    const meta = qs('.yp-record-meta', card) || card;
    const badge = document.createElement('span');
    badge.className = 'yp-chip ic-os-live-chip';
    badge.textContent = text;
    meta.appendChild(badge);
  }

  function sendRecordToAssistant(card) {
    const record = extractRecord(card);
    const assistantTab = qs('#ypTabs [data-tab="assistant"]');
    if (assistantTab) assistantTab.click();
    syncActiveSidebarTab('assistant');

    const input = qs('#ypAssistantInput');
    if (input) {
      input.value = `Review this ${record.section} record for ${record.youngPersonName}.\n\nTitle: ${record.title}\n\nSummary: ${record.body}\n\nPlease identify safeguarding concerns, follow-up actions, evidence value and manager oversight needs.`;
      input.focus();
    }

    const status = qs('#ypAssistantStatus');
    if (status) status.textContent = 'Record context loaded. Press Send to ask IndiCare Assistant.';

    const detail = qs('#icRecordDetail');
    if (detail) detail.classList.remove('open');
  }

  function bindTabSync() {
    qsa('#ypTabs [data-tab]').forEach(button => {
      if (button.dataset.icOsTabSync === 'true') return;
      button.dataset.icOsTabSync = 'true';
      button.addEventListener('click', () => syncActiveSidebarTab(button.dataset.tab || 'daily'));
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  }

  function start() {
    if (OS.started) return;
    if (!shellContractReady()) {
      console.warn('[indicare-os] Shell contract not ready. OS enhancement skipped to avoid redirect bounce.');
      return;
    }

    OS.started = true;
    document.body.classList.add('indicare-os-body');
    injectSidebar();
    bindTabSync();
    enhanceRecordCards();
  }

  function waitForBoot(startedAt) {
    const elapsed = Date.now() - startedAt;

    if (shellBooted() && shellContractReady()) {
      start();
      return;
    }

    if (elapsed > OS.maxBootWaitMs) {
      console.warn('[indicare-os] Young People Shell did not report booted in time. Leaving original page intact.');
      return;
    }

    window.setTimeout(() => waitForBoot(startedAt), 100);
  }

  function ready() {
    waitForBoot(Date.now());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
