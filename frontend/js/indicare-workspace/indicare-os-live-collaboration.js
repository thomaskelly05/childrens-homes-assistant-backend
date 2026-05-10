import { getOsContext, getOperationalSession, scopeContextToSession, escapeHtml, formatDate, recordType } from './indicare-os-context.js';

const LIVE_STATE = { panelOpen: false, activeRoom: 'shift', messages: [], presence: [], renderedSignature: '', renderQueued: false };
const ROOMS = [
  { id: 'shift', label: 'Shift room', description: 'Daily running, handover and immediate operational messages.' },
  { id: 'safeguarding', label: 'Safeguarding', description: 'Escalations, concerns and manager oversight.' },
  { id: 'review', label: 'Review desk', description: 'Approvals, amendments and QA discussions.' },
  { id: 'academy', label: 'Academy', description: 'Learning, reflective practice and supervision prompts.' },
];

bootLiveCollaboration();

function bootLiveCollaboration() {
  hydrateLocalState();
  document.addEventListener('click', handleClicks, true);
  document.addEventListener('keydown', handleKeys, true);
  document.addEventListener('submit', handleSubmit, true);
  document.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-sp-view], [data-launch-session], [data-reset-session]')) scheduleDashboardCollaboration({ force: true });
  }, true);
  window.addEventListener('indicare:os-context-ready', () => { rebuildPresence(); scheduleDashboardCollaboration({ force: true }); renderPanel(); });
  window.addEventListener('indicare:refresh-live-os', () => { rebuildPresence(); scheduleDashboardCollaboration({ force: true }); renderPanel(); });
  window.addEventListener('indicare:open-record', (event) => seedRecordDiscussion(event.detail));
  rebuildPresence();
  scheduleDashboardCollaboration({ force: true });
}

function scheduleDashboardCollaboration(options = {}) {
  if (LIVE_STATE.renderQueued) return;
  LIVE_STATE.renderQueued = true;
  window.requestAnimationFrame(() => {
    LIVE_STATE.renderQueued = false;
    renderDashboardCollaboration(options);
  });
}

function hydrateLocalState() { try { LIVE_STATE.messages = JSON.parse(localStorage.getItem('indicare.os.live.messages') || '[]'); } catch { LIVE_STATE.messages = []; } }
function persistMessages() { localStorage.setItem('indicare.os.live.messages', JSON.stringify(LIVE_STATE.messages.slice(0, 100))); }

function rebuildPresence() {
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const staff = [...arrayFrom(context.workforce), ...arrayFrom(context.staff), ...arrayFrom(context.users)];
  LIVE_STATE.presence = dedupe(staff).slice(0, 10).map((person, index) => ({
    id: person.id || person.user_id || person.email || index,
    name: person.name || person.full_name || [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email || 'Staff member',
    role: person.role || person.job_title || 'Residential staff',
    status: person.status || person.availability || 'Active',
    room: person.room || person.current_room || (index % 3 === 0 ? 'safeguarding' : index % 2 === 0 ? 'review' : 'shift'),
    active: true,
  }));
}

function renderDashboardCollaboration({ force = false } = {}) {
  const main = document.getElementById('sp-main');
  if (!main) return;
  const title = main.querySelector('.sp-page-head h1')?.textContent?.trim();
  if (title !== 'Dashboard') return;
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const signature = `${LIVE_STATE.messages.length}:${LIVE_STATE.presence.length}:${context.safeguarding.length}:${context.documents.length}`;
  if (!force && LIVE_STATE.renderedSignature === signature && main.querySelector('[data-os-live-collab]')) return;
  LIVE_STATE.renderedSignature = signature;
  const latest = roomMessages().slice(0, 4);
  const escalationCount = roomMessages('safeguarding').length + context.safeguarding.filter((item) => !/closed|resolved|complete|approved/i.test(String(item.status || item.workflow_status || ''))).length;
  const reviewCount = roomMessages('review').length + context.documents.filter((item) => /submitted|pending|changes|review|draft/i.test(`${item.status || ''} ${item.workflow_status || ''} ${item.manager_review_status || ''}`)).length;
  const html = `<section class="sp-card os-live-collab-card" data-os-live-collab><div class="sp-card-head"><div><h2>Live collaboration</h2><p>Shift rooms, safeguarding escalations, review conversations and staff presence.</p></div><button type="button" data-open-live-collaboration>Open collaboration →</button></div><div class="os-live-grid"><article class="os-live-presence"><h3>Presence</h3>${presenceList()}</article><article class="os-live-summary"><h3>Operational rooms</h3><div class="os-room-metrics"><button type="button" data-open-live-room="shift"><strong>${roomMessages('shift').length}</strong><span>Shift messages</span></button><button type="button" data-open-live-room="safeguarding"><strong>${escalationCount}</strong><span>Safeguarding</span></button><button type="button" data-open-live-room="review"><strong>${reviewCount}</strong><span>Review desk</span></button></div></article><article class="os-live-latest"><h3>Latest discussion</h3>${latest.length ? latest.map(messageCard).join('') : emptyMini('No collaboration messages yet. Start with a shift update or safeguarding note.')}</article></div></section>`;
  const existing = main.querySelector('[data-os-live-collab]');
  if (existing) existing.outerHTML = html;
  else (main.querySelector('[data-os-qa-dashboard]') || main.querySelector('[data-os-activity-intelligence]') || main).insertAdjacentHTML(main.querySelector('[data-os-qa-dashboard], [data-os-activity-intelligence]') ? 'afterend' : 'beforeend', html);
}

function ensurePanel() {
  if (document.getElementById('ic-os-live-collab-panel')) return;
  const panel = document.createElement('aside');
  panel.id = 'ic-os-live-collab-panel';
  panel.className = 'os-live-panel';
  panel.innerHTML = `<header><div><span>IndiCare Live</span><strong>Operational collaboration</strong></div><button type="button" data-close-live-collaboration>×</button></header><section class="os-live-rooms"></section><section class="os-live-thread"></section>`;
  document.body.appendChild(panel);
}

function renderPanel() {
  ensurePanel();
  const panel = document.getElementById('ic-os-live-collab-panel');
  if (!panel) return;
  panel.classList.toggle('open', LIVE_STATE.panelOpen);
  panel.querySelector('.os-live-rooms').innerHTML = ROOMS.map((room) => `<button type="button" class="${LIVE_STATE.activeRoom === room.id ? 'active' : ''}" data-open-live-room="${escapeHtml(room.id)}"><strong>${escapeHtml(room.label)}</strong><span>${escapeHtml(room.description)}</span><em>${roomMessages(room.id).length}</em></button>`).join('');
  const messages = roomMessages(LIVE_STATE.activeRoom);
  panel.querySelector('.os-live-thread').innerHTML = `<div class="os-live-thread-head"><h3>${escapeHtml(ROOMS.find((room) => room.id === LIVE_STATE.activeRoom)?.label || 'Room')}</h3><button type="button" data-ai-live-summary>AI summary</button></div><div class="os-live-messages">${messages.length ? messages.map(messageCard).join('') : emptyMini('No messages in this room yet.')}</div><form class="os-live-compose" data-live-compose><textarea placeholder="Write an operational update, review note or escalation..."></textarea><div><button type="button" data-live-template="handover">Handover</button><button type="button" data-live-template="safeguarding">Escalation</button><button type="submit">Send</button></div></form>`;
}

function handleClicks(event) {
  const openPanel = event.target.closest?.('[data-open-live-collaboration]');
  if (openPanel) { event.preventDefault(); LIVE_STATE.panelOpen = true; renderPanel(); return; }
  const closePanel = event.target.closest?.('[data-close-live-collaboration]');
  if (closePanel) { event.preventDefault(); LIVE_STATE.panelOpen = false; renderPanel(); return; }
  const room = event.target.closest?.('[data-open-live-room]');
  if (room) { event.preventDefault(); LIVE_STATE.activeRoom = room.dataset.openLiveRoom; LIVE_STATE.panelOpen = true; renderPanel(); return; }
  const template = event.target.closest?.('[data-live-template]');
  if (template) { event.preventDefault(); fillTemplate(template.dataset.liveTemplate); return; }
  if (event.target.closest?.('[data-ai-live-summary]')) { event.preventDefault(); openAssistantPrompt(`Summarise the ${LIVE_STATE.activeRoom} collaboration room. Highlight decisions, risks, handover actions, safeguarding points and review actions. Use only visible/live OS context.`); }
}

function handleKeys(event) { const form = event.target.closest?.('[data-live-compose]'); if (!form || event.key !== 'Enter' || event.shiftKey) return; event.preventDefault(); submitMessage(form); }
function handleSubmit(event) { const form = event.target.closest?.('[data-live-compose]'); if (!form) return; event.preventDefault(); submitMessage(form); }
function submitMessage(form) { const text = form.querySelector('textarea')?.value?.trim(); if (!text) return; LIVE_STATE.messages.unshift({ id: crypto?.randomUUID?.() || String(Date.now()), room: LIVE_STATE.activeRoom, author: 'Current user', role: 'Operational user', text, createdAt: new Date().toISOString() }); persistMessages(); form.querySelector('textarea').value = ''; renderPanel(); scheduleDashboardCollaboration({ force: true }); }
function fillTemplate(type) { const input = document.querySelector('#ic-os-live-collab-panel [data-live-compose] textarea'); if (!input) return; input.value = type === 'safeguarding' ? 'Safeguarding escalation:\nYoung person:\nConcern:\nImmediate safety actions:\nWho has been informed:\nNext review/action:' : 'Handover update:\nYoung person/home area:\nWhat happened:\nRisk/need:\nAction for next shift:\nManager oversight required:'; input.focus(); }
function seedRecordDiscussion(record) { if (!record) return; LIVE_STATE.activeRoom = /safeguarding|missing|incident|risk/i.test(recordType(record)) ? 'safeguarding' : /review|submitted|pending|changes/i.test(`${record.status || ''} ${record.workflow_status || ''}`) ? 'review' : 'shift'; }
function presenceList() { return LIVE_STATE.presence.length ? `<div class="os-presence-list">${LIVE_STATE.presence.slice(0, 6).map((person) => `<p><span class="os-presence-dot"></span><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.role)} · ${escapeHtml(person.status)}</small></p>`).join('')}</div>` : emptyMini('No live workforce presence was returned by the current OS context.'); }
function messageCard(message) { return `<article class="os-live-message"><div><strong>${escapeHtml(message.author)}</strong><span>${escapeHtml(formatDate(message.createdAt))}</span></div><p>${escapeHtml(message.text)}</p></article>`; }
function roomMessages(room = null) { return LIVE_STATE.messages.filter((item) => !room || item.room === room); }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function dedupe(items) { const seen = new Set(); return items.filter((item) => { const key = item.id || item.user_id || item.email || item.name || item.full_name; if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
function emptyMini(text) { return `<div class="os-rail-empty">${escapeHtml(text)}</div>`; }
function openAssistantPrompt(prompt) { document.querySelector('.sp-ai-bubble')?.click(); setTimeout(() => { const input = document.getElementById('ic-assistant-input'); if (!input) return; input.value = prompt; document.getElementById('ic-send-assistant')?.click(); }, 160); }
window.IndiCareLiveCollaboration = { open: () => { LIVE_STATE.panelOpen = true; renderPanel(); }, close: () => { LIVE_STATE.panelOpen = false; renderPanel(); } };
