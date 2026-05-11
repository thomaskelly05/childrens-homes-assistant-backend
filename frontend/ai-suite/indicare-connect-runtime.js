(() => {
  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));

  const state = {
    socket: null,
    activeChannel: null,
    reconnectTimer: null,
    mailFolder: 'inbox',
  };

  function cookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : '';
  }

  function headers() {
    const out = { 'Content-Type': 'application/json' };
    const csrf = cookie('__Host-indicare_csrf') || cookie('indicare_csrf');
    if (csrf) out['X-CSRF-Token'] = csrf;
    return out;
  }

  function setOutput(id, text) {
    const node = $(id);
    if (node) node.textContent = text;
  }

  function ensurePresenceBox() {
    if ($('presenceBox')) return;
    const rail = document.querySelector('#connectScreen .right-rail, #connectScreen aside');
    if (!rail) return;
    const box = document.createElement('div');
    box.innerHTML = '<h3>Presence</h3><div id="presenceBox" class="item">Connecting realtime…</div>';
    rail.prepend(box);
  }

  function connectSocket() {
    ensurePresenceBox();
    if (state.socket && state.socket.readyState < 2) return;
    try {
      const url = `${location.protocol === 'https:' ? 'wss://' : 'ws://'}${location.host}/ws/connect`;
      state.socket = new WebSocket(url);
      state.socket.onopen = () => {
        setOutput('presenceBox', 'Realtime connected');
        subscribeChannel(state.activeChannel || 'global');
      };
      state.socket.onmessage = (event) => {
        let payload;
        try { payload = JSON.parse(event.data); } catch (_) { return; }
        handleRealtimeEvent(payload);
      };
      state.socket.onclose = () => {
        setOutput('presenceBox', 'Realtime reconnecting…');
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = setTimeout(connectSocket, 3500);
      };
      state.socket.onerror = () => setOutput('presenceBox', 'Realtime connection issue');
    } catch (_) {
      setOutput('presenceBox', 'Realtime unavailable');
    }
  }

  function sendSocket(payload) {
    if (!state.socket || state.socket.readyState !== 1) return;
    state.socket.send(JSON.stringify(payload));
  }

  function subscribeChannel(channelId) {
    if (!channelId) return;
    sendSocket({ type: 'subscribe', room: `channel:${channelId}` });
  }

  function handleRealtimeEvent(event) {
    if (!event || !event.type) return;
    if (event.type === 'typing') {
      const indicator = $('typingIndicator') || document.createElement('div');
      if (!indicator.id) {
        indicator.id = 'typingIndicator';
        indicator.style.color = '#64748b';
        indicator.style.fontSize = '12px';
        $('connectMessages')?.after(indicator);
      }
      indicator.textContent = 'Someone is typing…';
      setTimeout(() => { indicator.textContent = ''; }, 1800);
    }
    if (event.type === 'presence.updated') setOutput('presenceBox', `Presence: ${event.status || 'online'}`);
    if (event.type === 'call.ringing') {
      const callsTab = document.querySelector('[data-connect-view="calls"]');
      if (callsTab) callsTab.click();
      setOutput('callStatus', `Incoming call: ${event.title || event.call_id || 'Connect call'}`);
    }
    if (event.type === 'calendar.reminder') {
      setOutput('connectOutput', `Calendar reminder: ${event.title || event.event_id || 'Upcoming meeting'}`);
    }
    if (event.type === 'message.created' && $('connectMessages')) {
      const author = event.display_name || event.sender_name || 'Team';
      const body = event.body || event.message || event.text || '';
      if (body) $('connectMessages').insertAdjacentHTML('beforeend', `<div class="post"><strong>${esc(author)}</strong><p>${esc(body)}</p></div>`);
    }
  }

  async function loadCalendarEvents() {
    const targets = ['connectMeetingsMain', 'connectEvents', 'connectMeetings'].map($).filter(Boolean);
    if (!targets.length) return;
    try {
      const data = await fetch('/api/connect/calendar/events', { credentials: 'include' }).then((res) => res.json());
      const html = (data.events || []).slice(0, 12).map((event) => `<div class="item"><strong>${esc(event.title || event.name || 'Event')}</strong><br><small>${esc(event.starts_at || event.start_time || event.scheduled_start || '')}</small></div>`).join('') || '<div class="item">No calendar events yet</div>';
      targets.forEach((target) => { target.innerHTML = html; });
    } catch (_) {
      targets.forEach((target) => { target.innerHTML = '<div class="item">Calendar unavailable</div>'; });
    }
  }

  async function createCalendarEvent() {
    const title = ($('eventTitle')?.value || prompt('Meeting title') || 'Connect meeting').trim();
    const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    try {
      const data = await fetch('/api/connect/calendar/events', {
        method: 'POST',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify({ title, starts_at: startsAt, create_call: true, call_type: 'video', attendees: [] }),
      }).then((res) => res.json());
      setOutput('connectOutput', `Meeting created: ${data.title || title}`);
      if (data.call_id) setOutput('callStatus', `Video meeting created: ${data.call_id}`);
      await loadCalendarEvents();
    } catch (error) {
      setOutput('connectOutput', `Could not create meeting. ${error.message}`);
    }
  }

  async function loadMail(folder = state.mailFolder) {
    const list = $('mailList');
    if (!list) return;
    state.mailFolder = folder;
    try {
      const data = await fetch(`/indicare-mail/messages?folder=${encodeURIComponent(folder)}`, { credentials: 'include' }).then((res) => res.json());
      list.innerHTML = (data.messages || []).map((message) => `<div class="item"><strong>${esc(message.subject || '(no subject)')}</strong><small>${esc(message.sender_email || message.from || '')}</small><p>${esc(String(message.body || message.preview || '').slice(0, 140))}</p></div>`).join('') || '<div class="item">No mail yet</div>';
    } catch (_) {
      list.innerHTML = '<div class="item">Mail unavailable</div>';
    }
  }

  async function sendMail() {
    const to = String($('mailTo')?.value || '').split(',').map((x) => x.trim()).filter(Boolean);
    const subject = $('mailSubject')?.value || '';
    const body = $('mailBody')?.value || '';
    if (!to.length || !body.trim()) {
      setOutput('connectOutput', 'Add a recipient and message before sending mail.');
      return;
    }
    try {
      await fetch('/indicare-mail/messages', {
        method: 'POST',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify({ to, subject, body, send_external: true }),
      });
      setOutput('connectOutput', 'Mail sent.');
      if ($('mailBody')) $('mailBody').value = '';
      await loadMail();
    } catch (error) {
      setOutput('connectOutput', `Mail failed. ${error.message}`);
    }
  }

  function startCall(type = 'video') {
    document.querySelector('[data-connect-view="calls"]')?.click();
    setOutput('callStatus', `${type === 'audio' ? 'Audio' : 'Video'} call live. Secure join links and AI meeting notes are ready.`);
    sendSocket({ type: 'call.ringing', rooms: ['global:connect'], title: `IndiCare ${type} call`, call_id: `local-${Date.now()}` });
  }

  function wireTabs() {
    qsa('[data-connect-view]').forEach((tab) => {
      if (tab.dataset.connectRuntimeWired) return;
      tab.dataset.connectRuntimeWired = '1';
      tab.addEventListener('click', () => {
        setTimeout(() => {
          if (tab.dataset.connectView === 'calendar') loadCalendarEvents();
          if (tab.dataset.connectView === 'mail') loadMail();
          if (tab.dataset.connectView === 'calls') connectSocket();
        }, 80);
      });
    });
    qsa('[data-mail-folder]').forEach((tab) => {
      if (tab.dataset.connectRuntimeWired) return;
      tab.dataset.connectRuntimeWired = '1';
      tab.addEventListener('click', () => loadMail(tab.dataset.mailFolder || 'inbox'));
    });
  }

  function wireChannelRuntime() {
    qsa('[data-channel]').forEach((channel) => {
      if (channel.dataset.connectRuntimeWired) return;
      channel.dataset.connectRuntimeWired = '1';
      channel.addEventListener('click', () => {
        state.activeChannel = channel.dataset.channel;
        subscribeChannel(state.activeChannel);
      });
    });
    const input = $('connectInput');
    if (input && !input.dataset.connectRuntimeWired) {
      input.dataset.connectRuntimeWired = '1';
      input.addEventListener('input', () => sendSocket({ type: 'typing', room: `channel:${state.activeChannel || 'global'}`, channel_id: state.activeChannel || 'global' }));
    }
  }

  function wireActions() {
    const calendarButton = $('createCalendarEvent');
    if (calendarButton && !calendarButton.dataset.connectRuntimeWired) {
      calendarButton.dataset.connectRuntimeWired = '1';
      calendarButton.addEventListener('click', createCalendarEvent);
    }
    const sendMailButton = $('sendMail');
    if (sendMailButton && !sendMailButton.dataset.connectRuntimeWired) {
      sendMailButton.dataset.connectRuntimeWired = '1';
      sendMailButton.addEventListener('click', sendMail);
    }
    const video = $('startVideoCall');
    if (video && !video.dataset.connectRuntimeWired) {
      video.dataset.connectRuntimeWired = '1';
      video.addEventListener('click', () => startCall('video'));
    }
    const start = $('startCall');
    if (start && !start.dataset.connectRuntimeWired) {
      start.dataset.connectRuntimeWired = '1';
      start.addEventListener('click', () => startCall('video'));
    }
    const audio = $('startAudioCall');
    if (audio && !audio.dataset.connectRuntimeWired) {
      audio.dataset.connectRuntimeWired = '1';
      audio.addEventListener('click', () => startCall('audio'));
    }
    const end = $('endCall');
    if (end && !end.dataset.connectRuntimeWired) {
      end.dataset.connectRuntimeWired = '1';
      end.addEventListener('click', () => setOutput('callStatus', 'Call ended. Generate AI meeting notes from Connect.'));
    }
  }

  function wire() {
    connectSocket();
    wireTabs();
    wireChannelRuntime();
    wireActions();
    loadCalendarEvents();
    loadMail();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 500);
  setTimeout(wire, 1500);
  window.IndiCareConnectRuntime = { connectSocket, loadCalendarEvents, loadMail, startCall, createCalendarEvent };
})();
