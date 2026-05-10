(() => {
  const STYLE_ID = 'indicare-connect-workspace-style';
  const ROOT_ID = 'indicare-connect-workspace';
  const FLAG = '__indicareConnectWorkspace';

  const state = {
    channels: [],
    selectedChannel: null,
    messages: [],
    events: [],
    calls: [],
    mode: 'chat',
    loading: false,
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .connect-workspace{border:1px solid var(--ic-border,#dbe7f3);border-radius:24px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.08);overflow:hidden;display:grid;grid-template-columns:280px minmax(0,1fr) 320px;min-height:680px}.connect-sidebar{background:#f8fafc;border-right:1px solid var(--ic-border,#dbe7f3);padding:14px;display:flex;flex-direction:column;gap:12px}.connect-main{display:flex;flex-direction:column;min-width:0}.connect-rail{background:#f8fafc;border-left:1px solid var(--ic-border,#dbe7f3);padding:14px;overflow:auto}.connect-title-row{display:flex;justify-content:space-between;gap:10px;align-items:center}.connect-title{font-size:18px;font-weight:950;color:#0f172a}.connect-tabs{display:flex;gap:8px;flex-wrap:wrap;padding:12px;border-bottom:1px solid var(--ic-border,#dbe7f3)}.connect-tab{border:0;border-radius:999px;background:#eef4fb;color:#334155;font-weight:900;padding:8px 11px}.connect-tab.active{background:#155eef;color:#fff}.connect-channel-list{display:grid;gap:8px;overflow:auto}.connect-channel{border:1px solid transparent;background:transparent;border-radius:16px;padding:11px;text-align:left}.connect-channel:hover,.connect-channel.active{background:#fff;border-color:#dbe7f3}.connect-channel strong{display:block;font-size:13px;color:#0f172a}.connect-channel small{display:block;color:#64748b;margin-top:3px}.connect-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 7px;font-size:11px;font-weight:900;background:#dbeafe;color:#1d4ed8}.connect-badge.safe{background:#fee2e2;color:#991b1b}.connect-search{border:1px solid var(--ic-border,#dbe7f3);border-radius:14px;padding:10px;background:#fff;width:100%}.connect-panel{padding:16px;overflow:auto;flex:1}.connect-message-list{display:flex;flex-direction:column;gap:10px}.connect-message{border:1px solid #e2e8f0;border-radius:18px;padding:12px;background:#fff}.connect-message-meta{font-size:11px;color:#64748b;margin-bottom:5px}.connect-composer{border-top:1px solid var(--ic-border,#dbe7f3);padding:12px;display:grid;grid-template-columns:1fr auto;gap:10px}.connect-composer textarea{border:1px solid var(--ic-border,#dbe7f3);border-radius:16px;padding:11px;min-height:48px;resize:vertical}.connect-button{border:0;border-radius:14px;background:#155eef;color:#fff;font-weight:950;padding:10px 14px}.connect-button.secondary{background:#eef4fb;color:#334155}.connect-card{border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:13px;margin-bottom:10px}.connect-card h4{margin:0 0 8px}.connect-empty{border:1px dashed #cbd5e1;border-radius:18px;padding:18px;text-align:center;color:#64748b;background:#f8fafc}.connect-intel-list{display:grid;gap:10px}.connect-live-dot{width:8px;height:8px;border-radius:999px;background:#22c55e;display:inline-block}.connect-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.connect-kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.connect-kpi div{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:10px}.connect-kpi strong{display:block;font-size:20px}.connect-kpi span{font-size:11px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.04em}@media(max-width:1100px){.connect-workspace{grid-template-columns:1fr}.connect-sidebar,.connect-rail{border:0}.connect-sidebar{order:1}.connect-main{order:2}.connect-rail{order:3}.connect-channel-list{max-height:240px}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function qs() { return new URLSearchParams(location.search); }
  function homeId() { return window.state?.home_id || qs().get('home_id') || '1'; }
  function childId() { return window.state?.selectedChild?.profile?.young_person_id || window.state?.selectedChild?.profile?.id || ''; }
  function headers() { return { 'Content-Type': 'application/json', 'X-User-Id': qs().get('user_id') || '1', 'X-Role': qs().get('role') || 'manager' }; }

  function mount() {
    injectStyles();
    if (document.getElementById(ROOT_ID)) return;
    const target = findTarget();
    if (!target) return;
    const root = document.createElement('section');
    root.id = ROOT_ID;
    root.innerHTML = renderShell();
    target.appendChild(root);
    bind(root);
    loadInitial();
  }

  function findTarget() {
    return document.getElementById('connect-workspace') || document.querySelector('[data-os-panel="connect"]') || document.querySelector('main') || document.body;
  }

  function renderShell() {
    return `
      <div class="connect-workspace">
        <aside class="connect-sidebar">
          <div class="connect-title-row"><div><div class="connect-title">IndiCare Connect</div><small>Live care communication</small></div><span class="connect-badge"><span class="connect-live-dot"></span>Live</span></div>
          <input class="connect-search" data-connect-search placeholder="Search channels..." />
          <div class="connect-toolbar"><button class="connect-button secondary" data-create-channel>New channel</button><button class="connect-button secondary" data-refresh-connect>Refresh</button></div>
          <div class="connect-channel-list" data-channel-list>${empty('Loading channels...')}</div>
        </aside>
        <section class="connect-main">
          <div class="connect-tabs">
            ${['chat','calendar','calls','files'].map((m)=>`<button class="connect-tab ${m==='chat'?'active':''}" data-connect-mode="${m}">${label(m)}</button>`).join('')}
          </div>
          <div class="connect-panel" data-connect-panel>${empty('Select a channel to begin.')}</div>
          <form class="connect-composer" data-connect-composer><textarea name="body" placeholder="Write a therapeutic, professional message..."></textarea><button class="connect-button" type="submit">Send</button></form>
        </section>
        <aside class="connect-rail" data-connect-rail>${renderRail()}</aside>
      </div>
    `;
  }

  function label(mode) { return ({ chat: 'Chat', calendar: 'Calendar', calls: 'Calls', files: 'Files' }[mode] || mode); }
  function empty(text) { return `<div class="connect-empty">${esc(text)}</div>`; }

  function bind(root) {
    root.querySelector('[data-refresh-connect]')?.addEventListener('click', loadInitial);
    root.querySelector('[data-create-channel]')?.addEventListener('click', createDefaultChannel);
    root.querySelector('[data-connect-search]')?.addEventListener('input', (e) => renderChannels(e.target.value));
    root.querySelectorAll('[data-connect-mode]').forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.connectMode)));
    root.querySelector('[data-connect-composer]')?.addEventListener('submit', sendMessage);
    document.addEventListener('indicare:presence-updated', refreshRail);
    if (window.IndiCareConnectRealtime) {
      window.IndiCareConnectRealtime.on('message.created', () => loadMessages());
      window.IndiCareConnectRealtime.on('call.ringing', () => loadCalls());
      window.IndiCareConnectRealtime.on('calendar.reminder', () => loadEvents());
    }
  }

  async function loadInitial() {
    await Promise.all([loadChannels(), loadEvents(), loadCalls()]);
    refreshRail();
  }

  async function loadChannels() {
    const params = new URLSearchParams({ home_id: homeId(), limit: '100' });
    if (childId()) params.set('young_person_id', childId());
    try {
      const res = await fetch(`/api/connect/channels?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      state.channels = data.channels || [];
      if (!state.selectedChannel && state.channels.length) state.selectedChannel = state.channels[0];
      renderChannels();
      if (state.selectedChannel) await loadMessages();
    } catch {
      state.channels = [];
      renderChannels();
    }
  }

  function renderChannels(filter = '') {
    const list = document.querySelector('[data-channel-list]');
    if (!list) return;
    const channels = state.channels.filter((c) => !filter || String(c.name || '').toLowerCase().includes(filter.toLowerCase()));
    list.innerHTML = channels.length ? channels.map((c) => `
      <button class="connect-channel ${state.selectedChannel?.id === c.id ? 'active' : ''}" data-channel-id="${esc(c.id)}">
        <strong>${esc(c.name)}</strong>
        <small>${esc(c.channel_type || 'channel')} · ${esc(c.message_count || 0)} messages</small>
        ${c.safeguarding_relevant ? '<span class="connect-badge safe">Safeguarding</span>' : ''}
      </button>
    `).join('') : empty('No channels yet.');
    list.querySelectorAll('[data-channel-id]').forEach((btn) => btn.addEventListener('click', () => selectChannel(btn.dataset.channelId)));
  }

  async function selectChannel(id) {
    state.selectedChannel = state.channels.find((c) => String(c.id) === String(id));
    renderChannels(document.querySelector('[data-connect-search]')?.value || '');
    if (window.IndiCareConnectRealtime && id) window.IndiCareConnectRealtime.subscribe(`channel:${id}`);
    await loadMessages();
    refreshRail();
  }

  async function createDefaultChannel() {
    const name = prompt('Channel name');
    if (!name) return;
    try {
      await fetch('/api/connect/channels', {
        method: 'POST', credentials: 'include', headers: headers(),
        body: JSON.stringify({ name, home_id: Number(homeId()) || null, channel_type: 'team', created_by: Number(qs().get('user_id') || 1) })
      });
      await loadChannels();
    } catch (err) { alert('Could not create channel'); }
  }

  async function loadMessages() {
    const panel = document.querySelector('[data-connect-panel]');
    if (!panel || state.mode !== 'chat') return;
    if (!state.selectedChannel) { panel.innerHTML = empty('Select a channel.'); return; }
    panel.innerHTML = empty('Loading messages...');
    try {
      const res = await fetch(`/api/connect/channels/${encodeURIComponent(state.selectedChannel.id)}/messages?limit=150`, { credentials: 'include' });
      const data = await res.json();
      state.messages = data.messages || [];
      panel.innerHTML = renderChat();
      panel.scrollTop = panel.scrollHeight;
    } catch { panel.innerHTML = empty('Could not load messages.'); }
  }

  function renderChat() {
    return `<div class="connect-message-list">${state.messages.length ? state.messages.map((m) => `
      <article class="connect-message">
        <div class="connect-message-meta">${esc(m.created_by ? 'User ' + m.created_by : 'System')} · ${esc(m.created_at ? new Date(m.created_at).toLocaleString() : '')} ${m.safeguarding_relevant ? ' · Safeguarding' : ''}</div>
        <div>${esc(m.body)}</div>
        ${m.linked_record_title ? `<small>Linked record: ${esc(m.linked_record_title)}</small>` : ''}
      </article>
    `).join('') : empty('No messages yet.')}</div>`;
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!state.selectedChannel) return;
    const textarea = event.currentTarget.body;
    const body = textarea.value.trim();
    if (!body) return;
    textarea.value = '';
    try {
      await fetch(`/api/connect/channels/${encodeURIComponent(state.selectedChannel.id)}/messages`, {
        method: 'POST', credentials: 'include', headers: headers(),
        body: JSON.stringify({ body, created_by: Number(qs().get('user_id') || 1), message_type: 'message' })
      });
      await loadMessages();
      if (window.IndiCareConnectRealtime) {
        window.IndiCareConnectRealtime.send({ type: 'message.created', room: `channel:${state.selectedChannel.id}`, channel_id: state.selectedChannel.id });
      }
    } catch { alert('Could not send message'); }
  }

  async function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-connect-mode]').forEach((btn) => btn.classList.toggle('active', btn.dataset.connectMode === mode));
    document.querySelector('[data-connect-composer]').style.display = mode === 'chat' ? 'grid' : 'none';
    if (mode === 'chat') return loadMessages();
    if (mode === 'calendar') return renderCalendarPanel();
    if (mode === 'calls') return renderCallsPanel();
    if (mode === 'files') return renderFilesPanel();
  }

  async function loadEvents() {
    try {
      const params = new URLSearchParams({ home_id: homeId(), limit: '100' });
      if (childId()) params.set('young_person_id', childId());
      const res = await fetch(`/api/connect/calendar/events?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      state.events = data.events || [];
      if (state.mode === 'calendar') renderCalendarPanel();
    } catch { state.events = []; }
  }

  async function loadCalls() {
    try {
      const params = new URLSearchParams({ home_id: homeId(), limit: '50' });
      const res = await fetch(`/api/connect/meetings?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      state.calls = data.meetings || [];
      if (state.mode === 'calls') renderCallsPanel();
    } catch { state.calls = []; }
  }

  function renderCalendarPanel() {
    const panel = document.querySelector('[data-connect-panel]');
    if (!panel) return;
    panel.innerHTML = `<div class="connect-title-row"><div><div class="connect-title">Calendar</div><small>Home and child diary</small></div><button class="connect-button" data-new-event>New event</button></div><br>${state.events.length ? state.events.map((e) => `<div class="connect-card"><h4>${esc(e.title)}</h4><p>${esc(e.description || e.event_type || '')}</p><small>${esc(e.starts_at ? new Date(e.starts_at).toLocaleString() : '')} ${e.safeguarding_relevant ? ' · Safeguarding' : ''}</small></div>`).join('') : empty('No diary events found.')}`;
    panel.querySelector('[data-new-event]')?.addEventListener('click', createQuickEvent);
  }

  async function createQuickEvent() {
    const title = prompt('Event title');
    if (!title) return;
    const starts = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const ends = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    try {
      await fetch('/api/connect/calendar/events', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify({ title, starts_at: starts, ends_at: ends, home_id: Number(homeId()) || null, young_person_id: Number(childId()) || null, create_call: true }) });
      await loadEvents();
    } catch { alert('Could not create event'); }
  }

  function renderCallsPanel() {
    const panel = document.querySelector('[data-connect-panel]');
    if (!panel) return;
    panel.innerHTML = `<div class="connect-title-row"><div><div class="connect-title">Calls & Meetings</div><small>Live and scheduled operational meetings</small></div><button class="connect-button" data-ring-test>Test ring</button></div><br>${state.calls.length ? state.calls.map((c) => `<div class="connect-card"><h4>${esc(c.title)}</h4><p>${esc(c.description || c.meeting_type || '')}</p><small>${esc(c.scheduled_start ? new Date(c.scheduled_start).toLocaleString() : '')} · ${esc(c.status || '')}</small></div>`).join('') : empty('No calls or meetings found.')}`;
    panel.querySelector('[data-ring-test]')?.addEventListener('click', () => window.IndiCareConnectRealtime?.ringCall('test', 'Test Connect call', [`home:${homeId()}`]));
  }

  function renderFilesPanel() {
    const panel = document.querySelector('[data-connect-panel]');
    if (!panel) return;
    panel.innerHTML = empty('Connect files and evidence attachments will appear here.');
  }

  function renderRail() {
    return `<div class="connect-title">Operational intelligence</div><br><div class="connect-kpi"><div><strong>${esc(state.channels.length)}</strong><span>Channels</span></div><div><strong>${esc(state.events.length)}</strong><span>Diary events</span></div><div><strong>${esc(state.messages.length)}</strong><span>Messages</span></div><div><strong>${esc(state.calls.length)}</strong><span>Meetings</span></div></div><br><div class="connect-intel-list"><div class="connect-card"><h4>Live safeguarding</h4><p>Safeguarding alerts will appear instantly here.</p></div><div class="connect-card"><h4>Child context</h4><p>${childId() ? 'Connected to selected child workspace.' : 'Select a child to show linked context.'}</p></div><div class="connect-card"><h4>Tasks</h4><p>Open tasks and review queues will connect here next.</p></div></div>`;
  }

  function refreshRail() {
    const rail = document.querySelector('[data-connect-rail]');
    if (rail) rail.innerHTML = renderRail();
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    mount();
    const observer = new MutationObserver(() => {
      if (!document.getElementById(ROOT_ID) && (location.hash === '#connect' || document.querySelector('[data-os-panel="connect"]'))) mount();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
