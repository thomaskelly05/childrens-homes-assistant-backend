import { getOsContext, getOperationalSession, scopeContextToSession, childKey, childName, escapeHtml } from './indicare-os-context.js';

const RECYCLED = [
  { id: 'daily', title: 'Daily notes', description: 'Reuse the existing daily note workspace and AI review flow.', script: '/js/workspaces/yp-daily-note-workspace.js', global: 'YoungPersonDailyNoteWorkspace', route: 'daily' },
  { id: 'incident', title: 'Incident records', description: 'Reuse the existing incident workspace, safeguarding flags and AI quality review.', script: '/js/workspaces/yp-incident-workspace.js', global: 'YoungPersonIncidentWorkspace', route: 'incident' },
  { id: 'risk', title: 'Risk workspace', description: 'Reuse the existing young person risk workspace where available.', script: '/js/workspaces/yp-risk-workspace.js', global: 'YoungPersonRiskWorkspace', route: 'risk' },
  { id: 'timeline', title: 'Child timeline', description: 'Reuse the existing child timeline/chronology visual layer where available.', script: '/js/indicare-workspace/child-timeline.js', global: 'ChildTimeline', route: 'timeline' },
];

const STATE = { loaded: new Set(), activeChildId: '', renderQueued: false };

bootRecycledWorkspaces();

function bootRecycledWorkspaces() {
  document.addEventListener('click', handleClicks, true);
  window.addEventListener('indicare:os-context-ready', () => scheduleRender({ force: true }));
  window.addEventListener('indicare:refresh-live-os', () => scheduleRender({ force: true }));
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-sp-view], [data-launch-session], [data-reset-session], [data-open-child]')) scheduleRender({ force: true });
  }, true);
  scheduleRender({ force: true });
}

function scheduleRender(options = {}) {
  if (STATE.renderQueued) return;
  STATE.renderQueued = true;
  requestAnimationFrame(() => {
    STATE.renderQueued = false;
    renderRecycledPanel(options);
  });
}

function renderRecycledPanel({ force = false } = {}) {
  const main = document.getElementById('sp-main');
  if (!main) return;
  const title = main.querySelector('.sp-page-head h1')?.textContent?.trim();
  if (title !== 'Dashboard' && title !== 'Young People') return;
  if (!force && main.querySelector('[data-os-recycled-workspaces]')) return;
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const children = context.children || [];
  const html = `<section class="sp-card os-recycled-workspaces" data-os-recycled-workspaces><div class="sp-card-head"><div><h2>Recycled operational workspaces</h2><p>Existing daily note, incident, risk and chronology tools reused inside the SharePoint OS.</p></div></div><div class="os-recycled-layout"><label><span>Young person</span><select data-recycled-child>${children.length ? children.map((child) => `<option value="${escapeHtml(childKey(child))}">${escapeHtml(childName(child))}</option>`).join('') : '<option value="">No young people loaded</option>'}</select></label><div class="os-recycled-grid">${RECYCLED.map((item) => recycledCard(item)).join('')}</div></div></section>`;
  const existing = main.querySelector('[data-os-recycled-workspaces]');
  if (existing) existing.outerHTML = html;
  else {
    const after = main.querySelector('[data-os-enterprise-intel]') || main.querySelector('[data-os-live-collab]') || main.querySelector('[data-os-activity-intelligence]');
    if (after) after.insertAdjacentHTML('afterend', html);
    else main.insertAdjacentHTML('beforeend', html);
  }
}

function recycledCard(item) {
  return `<article class="os-recycled-card"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p><div><button type="button" class="sp-primary" data-open-recycled-workspace="${escapeHtml(item.id)}">Open reused workspace</button><button type="button" class="sp-secondary" data-ai-recycled-workspace="${escapeHtml(item.id)}">AI prep</button></div></article>`;
}

async function handleClicks(event) {
  const open = event.target.closest?.('[data-open-recycled-workspace]');
  if (open) {
    event.preventDefault();
    await openRecycledWorkspace(open.dataset.openRecycledWorkspace);
    return;
  }
  const ai = event.target.closest?.('[data-ai-recycled-workspace]');
  if (ai) {
    event.preventDefault();
    const item = RECYCLED.find((entry) => entry.id === ai.dataset.aiRecycledWorkspace);
    if (item) openAssistantPrompt(`Prepare staff to use the ${item.title} workspace for the selected young person. Explain what evidence is needed, safeguarding considerations, child voice, chronology links and manager review expectations.`);
  }
}

async function openRecycledWorkspace(id) {
  const item = RECYCLED.find((entry) => entry.id === id);
  if (!item) return;
  const child = selectedChild();
  const main = document.getElementById('sp-main');
  if (!main) return;
  await loadScript(item);
  main.innerHTML = `<section class="record-view-hero indicare-doc-hero"><div><button class="sp-back" type="button" data-sp-view="dashboard">‹ Back to dashboard</button><span class="record-kicker">Reused workspace</span><h1>${escapeHtml(item.title)}</h1><p>${child ? escapeHtml(childName(child)) : 'No young person selected'} · Recycled from existing IndiCare workspace code.</p></div><div class="record-view-actions"><button type="button" class="sp-secondary" data-ai-recycled-workspace="${escapeHtml(item.id)}">AI guidance</button></div></section><section class="record-view-grid"><article class="record-paper indicare-doc-paper"><div id="ic-recycled-host">${workspaceShell(item)}</div></article><aside class="record-context-panel"><section class="sp-card"><h2>Reuse status</h2><p>${escapeHtml(window[item.global] ? 'Existing workspace module loaded successfully.' : 'Workspace script loaded but expected global API was not found.')}</p></section><section class="sp-card"><h2>Integration note</h2><p>This bridge reuses existing code without duplicating form logic. Full native embedding can be added where the original DOM templates are available.</p></section></aside></section>`;
  bindIfAvailable(item, child);
}

function workspaceShell(item) {
  if (item.id === 'daily') return `<section class="record-section"><h2>Daily note workspace</h2><p>The existing daily note logic is loaded. Use the full young-person shell form where its original fields are available, or use Quick Capture for the SharePoint OS version.</p><button type="button" class="sp-primary" data-open-quick-capture>Open quick daily capture</button></section>`;
  if (item.id === 'incident') return `<section class="record-section"><h2>Incident workspace</h2><p>The existing incident logic is loaded. Use Quick Capture for the SharePoint OS incident flow, stored in the safeguarding bucket with incident metadata.</p><button type="button" class="sp-primary" data-open-quick-capture>Open quick incident capture</button></section>`;
  if (item.id === 'risk') return `<section class="record-section"><h2>Risk workspace</h2><p>The existing risk workspace script is available where its original DOM is present. Current OS risk signals are also surfaced through safeguarding and enterprise intelligence.</p><button type="button" class="sp-primary" data-sp-view="safeguarding">Open safeguarding</button></section>`;
  return `<section class="record-section"><h2>Timeline workspace</h2><p>The existing timeline code is available for chronology visualisation. Current OS chronology is also available in the chronology workspace and context rail.</p><button type="button" class="sp-primary" data-sp-view="chronology">Open chronology</button></section>`;
}

async function loadScript(item) {
  if (STATE.loaded.has(item.script) || window[item.global]) return;
  await new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = item.script;
    script.async = true;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });
  STATE.loaded.add(item.script);
}

function bindIfAvailable(item, child) {
  const api = window[item.global];
  if (!api?.bind || !child) return;
  try {
    api.bind({ selectedYoungPerson: child, shiftMode: 'during', reloadOverview: async () => window.dispatchEvent(new CustomEvent('indicare:refresh-live-os')) });
  } catch (error) {
    console.warn('Recycled workspace bind failed', item.id, error);
  }
}

function selectedChild() {
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const selectedId = document.querySelector('[data-recycled-child]')?.value || STATE.activeChildId || '';
  return context.children.find((child) => childKey(child) === selectedId) || context.children[0] || null;
}

function openAssistantPrompt(prompt) {
  document.querySelector('.sp-ai-bubble')?.click();
  setTimeout(() => {
    const input = document.getElementById('ic-assistant-input');
    if (!input) return;
    input.value = prompt;
    document.getElementById('ic-send-assistant')?.click();
  }, 160);
}

window.IndiCareOSRecycledWorkspaces = { open: openRecycledWorkspace, refresh: () => renderRecycledPanel({ force: true }) };
