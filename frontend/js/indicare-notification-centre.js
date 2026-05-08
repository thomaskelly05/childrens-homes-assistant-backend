/* IndiCare AI notification centre
   Operational reminders, chronology prompts and safeguarding follow-ups.
*/

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function injectStyles() {
    if ($('icNotificationStyles')) return;

    const style = document.createElement('style');
    style.id = 'icNotificationStyles';
    style.textContent = `
      .ic-notification-trigger {
        position: relative;
      }

      .ic-notification-badge {
        position:absolute;
        top:-4px;
        right:-4px;
        min-width:18px;
        height:18px;
        border-radius:999px;
        background:#ef4444;
        color:#fff;
        font-size:.65rem;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
      }

      .ic-notification-panel {
        position:fixed;
        top:74px;
        right:20px;
        width:min(380px, calc(100vw - 24px));
        max-height:70vh;
        overflow:auto;
        z-index:4500;
        border:1px solid var(--ic-border);
        background:rgba(255,255,255,.98);
        backdrop-filter:blur(16px);
        border-radius:22px;
        box-shadow:0 24px 60px rgba(15,23,42,.16);
        padding:14px;
        display:none;
      }

      .ic-notification-panel.visible {
        display:block;
      }

      .ic-notification-header {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:10px;
      }

      .ic-notification-list {
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .ic-notification-card {
        border:1px solid var(--ic-border);
        border-radius:16px;
        padding:12px;
        background:var(--ic-panel);
      }

      .ic-notification-card[data-priority="high"] {
        border-color:rgba(239,68,68,.22);
        background:rgba(254,242,242,.92);
      }

      .ic-notification-card[data-priority="medium"] {
        border-color:rgba(245,158,11,.22);
        background:rgba(255,251,235,.95);
      }

      .ic-notification-meta {
        display:flex;
        justify-content:space-between;
        gap:10px;
        margin-bottom:6px;
        font-size:.72rem;
        color:var(--ic-muted);
      }

      .ic-notification-card strong {
        display:block;
        margin-bottom:6px;
      }

      .ic-notification-card p {
        margin:0;
        font-size:.82rem;
        line-height:1.55;
      }

      .ic-notification-actions {
        display:flex;
        gap:8px;
        margin-top:10px;
      }

      .ic-notification-actions button {
        border:1px solid var(--ic-border);
        background:#fff;
        border-radius:10px;
        padding:7px 10px;
        font-size:.72rem;
        font-weight:700;
      }
    `;

    document.head.appendChild(style);
  }

  function ensureTrigger() {
    const topActions = document.querySelector('.ic-top-actions');
    if (!topActions || $('icNotificationTrigger')) return;

    const button = document.createElement('button');
    button.id = 'icNotificationTrigger';
    button.className = 'ic-btn-secondary ic-notification-trigger';
    button.type = 'button';
    button.innerHTML = `Notifications <span class="ic-notification-badge" id="icNotificationBadge">0</span>`;

    topActions.prepend(button);
  }

  function ensurePanel() {
    if ($('icNotificationPanel')) return;

    const panel = document.createElement('section');
    panel.id = 'icNotificationPanel';
    panel.className = 'ic-notification-panel';
    panel.innerHTML = `
      <div class="ic-notification-header">
        <strong>Operational reminders</strong>
        <small>IndiCare AI</small>
      </div>
      <div class="ic-notification-list" id="icNotificationList"></div>
    `;

    document.body.appendChild(panel);
  }

  function notifications() {
    try {
      return JSON.parse(localStorage.getItem('indicare_ai_notifications') || '[]');
    } catch {
      return [];
    }
  }

  function saveNotifications(items) {
    localStorage.setItem('indicare_ai_notifications', JSON.stringify(items.slice(0, 40)));
    renderNotifications();
  }

  function addNotification(item) {
    const existing = notifications();
    existing.unshift({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      read: false,
      priority: 'low',
      ...item
    });

    saveNotifications(existing);
  }

  function renderNotifications() {
    const list = $('icNotificationList');
    if (!list) return;

    const items = notifications();
    list.innerHTML = items.length
      ? items.map(cardHtml).join('')
      : '<div class="ic-notification-card"><p>No reminders yet.</p></div>';

    const unread = items.filter((item) => !item.read).length;
    const badge = $('icNotificationBadge');
    if (badge) badge.textContent = String(unread);
  }

  function cardHtml(item) {
    return `
      <article class="ic-notification-card" data-priority="${escapeHtml(item.priority || 'low')}">
        <div class="ic-notification-meta">
          <span>${escapeHtml(item.priority || 'low')} priority</span>
          <span>${new Date(item.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
        </div>

        <strong>${escapeHtml(item.title || 'Operational reminder')}</strong>
        <p>${escapeHtml(item.body || '')}</p>

        <div class="ic-notification-actions">
          <button type="button" data-notification-action="mark" data-id="${escapeHtml(item.id)}">Mark reviewed</button>
        </div>
      </article>
    `;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function generateOperationalNotifications() {
    const messages = Array.from(document.querySelectorAll('#messages .wrap.assistant .msg'));
    const latest = messages[messages.length - 1];
    if (!latest || latest.dataset.icNotificationReviewed === 'true') return;

    latest.dataset.icNotificationReviewed = 'true';

    const text = (latest.innerText || '').toLowerCase();

    if (text.includes('follow-up') || text.includes('action')) {
      addNotification({
        title: 'Follow-up reminder',
        body: 'Check whether follow-up actions have been completed and recorded.',
        priority: 'medium'
      });
    }

    if (text.includes('chronology')) {
      addNotification({
        title: 'Chronology review',
        body: 'Review chronology entries for dates, times, actions and notifications.',
        priority: 'medium'
      });
    }

    if (text.includes('safeguarding') || text.includes('missing') || text.includes('police')) {
      addNotification({
        title: 'Safeguarding oversight',
        body: 'Check safeguarding procedures, notifications and management oversight.',
        priority: 'high'
      });
    }
  }

  function bind() {
    document.addEventListener('click', (event) => {
      if (event.target.id === 'icNotificationTrigger') {
        $('icNotificationPanel')?.classList.toggle('visible');
      }

      const mark = event.target.closest('[data-notification-action="mark"]');
      if (mark) {
        const id = mark.dataset.id;
        const updated = notifications().map((item) => item.id === id ? { ...item, read:true } : item);
        saveNotifications(updated);
      }

      if (!event.target.closest('#icNotificationPanel') && event.target.id !== 'icNotificationTrigger') {
        $('icNotificationPanel')?.classList.remove('visible');
      }
    });
  }

  window.IndiCareNotifications = {
    addNotification
  };

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    ensureTrigger();
    ensurePanel();
    renderNotifications();
    bind();

    const messages = $('messages');
    if (messages) {
      new MutationObserver(generateOperationalNotifications).observe(messages, {
        childList:true,
        subtree:true
      });
    }
  });
})();
