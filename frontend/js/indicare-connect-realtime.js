(() => {
  const STYLE_ID = 'indicare-connect-realtime-style';
  const CLIENT_FLAG = '__indicareConnectRealtimeClient';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .connect-live-stack{position:fixed;right:18px;bottom:18px;z-index:120;display:grid;gap:10px;width:min(420px,calc(100vw - 36px))}.connect-live-alert{border:1px solid var(--ic-border,#dbe7f3);background:#fff;border-radius:18px;box-shadow:0 20px 50px rgba(15,23,42,.16);padding:14px;display:grid;gap:8px}.connect-live-alert strong{font-size:14px}.connect-live-alert p{margin:0;color:var(--ic-muted,#64748b);font-size:13px;line-height:1.4}.connect-live-alert-critical{border-color:#fecaca;background:#fff7f7}.connect-live-alert-call{border-color:#bfdbfe;background:#eff6ff}.connect-live-alert-calendar{border-color:#fde68a;background:#fffbeb}.connect-live-actions{display:flex;gap:8px;flex-wrap:wrap}.connect-live-actions button{border:0;border-radius:12px;padding:8px 10px;font-weight:900}.connect-live-primary{background:var(--ic-blue,#155eef);color:#fff}.connect-live-muted{background:#eef4fb;color:#334155}.connect-live-pill{position:fixed;right:18px;top:78px;z-index:110;background:#0f172a;color:#fff;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;box-shadow:0 12px 35px rgba(15,23,42,.2)}
    `;
    document.head.appendChild(style);
  }

  function qs() { return new URLSearchParams(window.location.search); }
  function idFromState(key) { return window.state?.selectedChild?.profile?.[key] || window.state?.[key] || qs().get(key); }
  function homeId() { return idFromState('home_id') || '1'; }
  function userId() { return qs().get('user_id') || window.currentUser?.id || '1'; }
  function staffId() { return qs().get('staff_id') || window.currentUser?.staff_id || ''; }
  function childId() { return window.state?.selectedChild?.profile?.young_person_id || window.state?.selectedChild?.profile?.id || ''; }

  function ensureStack() {
    let stack = document.querySelector('.connect-live-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'connect-live-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function setStatus(text) {
    let pill = document.querySelector('.connect-live-pill');
    if (!pill) {
      pill = document.createElement('div');
      pill.className = 'connect-live-pill';
      document.body.appendChild(pill);
    }
    pill.textContent = text;
    setTimeout(() => pill.remove(), 3500);
  }

  function alertCard({ title, message, kind = 'info', primaryLabel, onPrimary }) {
    const stack = ensureStack();
    const card = document.createElement('div');
    card.className = `connect-live-alert connect-live-alert-${kind}`;
    card.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(message || '')}</p><div class="connect-live-actions">${primaryLabel ? `<button class="connect-live-primary" type="button">${escapeHtml(primaryLabel)}</button>` : ''}<button class="connect-live-muted" type="button">Dismiss</button></div>`;
    const buttons = card.querySelectorAll('button');
    if (primaryLabel && buttons[0]) buttons[0].addEventListener('click', () => { if (onPrimary) onPrimary(); card.remove(); });
    buttons[buttons.length - 1]?.addEventListener('click', () => card.remove());
    stack.prepend(card);
    setTimeout(() => card.remove(), kind === 'critical' ? 18000 : 10000);
  }

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

  class IndiCareConnectRealtime {
    constructor() {
      this.socket = null;
      this.connected = false;
      this.reconnectTimer = null;
      this.handlers = new Map();
      this.reconnectAttempts = 0;
    }

    url() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams();
      if (homeId()) params.set('home_id', homeId());
      if (userId()) params.set('user_id', userId());
      if (staffId()) params.set('staff_id', staffId());
      if (childId()) params.set('young_person_id', childId());
      return `${protocol}//${window.location.host}/ws/connect?${params.toString()}`;
    }

    connect() {
      if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) return;
      try {
        this.socket = new WebSocket(this.url());
        this.socket.addEventListener('open', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          setStatus('Connect live');
        });
        this.socket.addEventListener('message', (event) => this.handleMessage(event));
        this.socket.addEventListener('close', () => this.scheduleReconnect());
        this.socket.addEventListener('error', () => this.scheduleReconnect());
      } catch (error) {
        this.scheduleReconnect();
      }
    }

    scheduleReconnect() {
      this.connected = false;
      if (this.reconnectTimer) return;
      const delay = Math.min(20000, 1000 + this.reconnectAttempts * 1500);
      this.reconnectAttempts += 1;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delay);
    }

    handleMessage(event) {
      let payload;
      try { payload = JSON.parse(event.data); } catch { return; }
      this.dispatch(payload);
      this.handleDefaultUi(payload);
    }

    dispatch(payload) {
      const list = this.handlers.get(payload.type) || [];
      list.forEach((handler) => {
        try { handler(payload); } catch (error) { console.warn('Connect realtime handler failed', error); }
      });
      const all = this.handlers.get('*') || [];
      all.forEach((handler) => {
        try { handler(payload); } catch (error) { console.warn('Connect realtime wildcard handler failed', error); }
      });
    }

    handleDefaultUi(event) {
      if (event.type === 'connect.ready') return;
      if (event.type === 'safeguarding.alert') {
        alertCard({ title: 'Safeguarding alert', message: event.message || 'A safeguarding update requires attention.', kind: 'critical', primaryLabel: 'Open OS', onPrimary: () => { location.href = '/os-command'; } });
      }
      if (event.type === 'call.ringing') {
        alertCard({ title: 'Incoming Connect call', message: event.title || 'A call is ringing.', kind: 'call', primaryLabel: 'Open Connect', onPrimary: () => { location.href = '/os-command#connect'; } });
      }
      if (event.type === 'calendar.reminder') {
        alertCard({ title: 'Calendar reminder', message: event.title || 'A diary event is due soon.', kind: 'calendar', primaryLabel: 'Open diary', onPrimary: () => { location.href = '/os-command#calendar'; } });
      }
      if (event.type === 'presence.updated') {
        document.dispatchEvent(new CustomEvent('indicare:presence-updated', { detail: event }));
      }
    }

    send(payload) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
      this.socket.send(JSON.stringify(payload));
      return true;
    }

    subscribe(room) { return this.send({ type: 'subscribe', room }); }
    unsubscribe(room) { return this.send({ type: 'unsubscribe', room }); }
    typing(channelId) { return this.send({ type: 'typing', channel_id: channelId, room: `channel:${channelId}` }); }
    presence(status, statusMessage = '') { return this.send({ type: 'presence.update', status, status_message: statusMessage }); }
    ringCall(callId, title, rooms = []) { return this.send({ type: 'call.ringing', call_id: callId, title, rooms }); }
    calendarReminder(eventId, title, startsAt, room = '') { return this.send({ type: 'calendar.reminder', event_id: eventId, title, starts_at: startsAt, room }); }
    safeguardingAlert(recordId, message, priority = 'high', room = '') { return this.send({ type: 'safeguarding.alert', record_id: recordId, message, priority, room }); }

    on(type, handler) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(handler);
    }
  }

  function boot() {
    injectStyles();
    if (!window[CLIENT_FLAG]) {
      window.IndiCareConnectRealtime = new IndiCareConnectRealtime();
      window[CLIENT_FLAG] = true;
      window.IndiCareConnectRealtime.connect();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
