import {
  recordKey,
  recordType,
  displayType,
  escapeHtml,
} from './indicare-os-context.js';

const TAB_STATE = {
  tabs: [],
  active: null,
};

bootWorkspaceTabs();

function bootWorkspaceTabs() {
  ensureTabs();

  window.addEventListener('indicare:open-record', (event) => {
    if (!event.detail) return;
    addTab(event.detail);
  });

  document.addEventListener('click', handleClicks, true);

  const observer = new MutationObserver(() => renderTabs());
  observer.observe(document.body, { childList: true, subtree: true });

  renderTabs();
}

function ensureTabs() {
  if (document.getElementById('ic-os-work-tabs')) return;

  const tabs = document.createElement('section');
  tabs.id = 'ic-os-work-tabs';
  tabs.className = 'os-work-tabs';

  const main = document.getElementById('sp-main');
  if (main) {
    main.prepend(tabs);
  } else {
    document.body.appendChild(tabs);
  }
}

function addTab(record) {
  const key = tabKey(record);

  const existing = TAB_STATE.tabs.find((tab) => tab.key === key);

  if (!existing) {
    TAB_STATE.tabs.unshift({
      key,
      record,
      title: record.title || record.summary || displayType(recordType(record)),
      type: displayType(recordType(record)),
      openedAt: Date.now(),
    });
  }

  TAB_STATE.active = key;

  TAB_STATE.tabs = TAB_STATE.tabs.slice(0, 10);

  renderTabs();
}

function renderTabs() {
  ensureTabs();

  const target = document.getElementById('ic-os-work-tabs');
  if (!target) return;

  if (!TAB_STATE.tabs.length) {
    target.classList.remove('has-tabs');
    target.innerHTML = '';
    return;
  }

  target.classList.add('has-tabs');

  target.innerHTML = `
    <span class="os-work-tabs-label">Workspace</span>
    ${TAB_STATE.tabs.map((tab) => `
      <article class="os-work-tab ${TAB_STATE.active === tab.key ? 'active' : ''}" data-open-work-tab="${escapeHtml(tab.key)}">
        <div>
          <strong>${escapeHtml(tab.title)}</strong>
          <small>${escapeHtml(tab.type)}</small>
        </div>
        <button type="button" class="os-work-tab-close" data-close-work-tab="${escapeHtml(tab.key)}">×</button>
      </article>
    `).join('')}
  `;
}

function handleClicks(event) {
  const close = event.target.closest('[data-close-work-tab]');

  if (close) {
    event.preventDefault();
    event.stopPropagation();

    closeTab(close.dataset.closeWorkTab);
    return;
  }

  const open = event.target.closest('[data-open-work-tab]');

  if (!open) return;

  event.preventDefault();

  const tab = TAB_STATE.tabs.find((item) => item.key === open.dataset.openWorkTab);

  if (!tab) return;

  TAB_STATE.active = tab.key;

  renderTabs();

  window.dispatchEvent(new CustomEvent('indicare:open-record', {
    detail: tab.record,
  }));
}

function closeTab(key) {
  TAB_STATE.tabs = TAB_STATE.tabs.filter((tab) => tab.key !== key);

  if (TAB_STATE.active === key) {
    TAB_STATE.active = TAB_STATE.tabs[0]?.key || null;
  }

  renderTabs();
}

function tabKey(record) {
  return `${recordType(record)}:${recordKey(record)}`;
}

window.IndiCareWorkspaceTabs = {
  open: addTab,
  close: closeTab,
  list: () => TAB_STATE.tabs,
};
