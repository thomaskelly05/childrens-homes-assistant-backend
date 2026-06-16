(() => {
  const FLAG = '__indicareOsCommandPalette';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const commands = [
    { label: 'New daily record', hint: 'Record today, observation or handover', action: () => openForm('daily_record') },
    { label: 'New direct work', hint: 'Key work, life-story or outcome session', action: () => openForm('direct_work') },
    { label: 'New incident / safeguarding', hint: 'Incident, missing or safeguarding concern', action: () => openForm('incident') },
    { label: 'New family contact', hint: 'Call, visit, family time or emotional impact', action: () => openForm('contact') },
    { label: 'Open Today', hint: 'Live shift chronology', action: () => clickNav('[data-view="today-child"]') },
    { label: 'Open Timeline', hint: 'Full chronology stream', action: () => clickNav('[data-view="child-timeline"]') },
    { label: 'Open Documents', hint: 'Plans, evidence and review dates', action: () => clickNav('[data-shell="documents"]') },
    { label: 'Open Standards & Ofsted', hint: 'Inspection evidence preparation and evidence', action: () => clickNav('[data-view="standards-ofsted"]') },
    { label: 'Open Oversight', hint: 'Manager review and sign-off', action: () => clickNav('[data-view="review"]') }
  ];

  function openForm(type) {
    if (window.openWorkspaceForm) window.openWorkspaceForm('daily', type);
    else document.querySelector(`[data-os-record="${type}"]`)?.click();
  }

  function clickNav(selector) {
    document.querySelector(selector)?.click();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function ensurePalette() {
    if (document.getElementById('ic365-command-palette')) return;
    const palette = document.createElement('section');
    palette.id = 'ic365-command-palette';
    palette.className = 'ic365-command-palette';
    palette.setAttribute('aria-hidden', 'true');
    palette.innerHTML = `
      <div class="ic365-command-backdrop" data-close-command-palette></div>
      <div class="ic365-command-dialog" role="dialog" aria-label="Command palette">
        <div class="ic365-command-search">
          <span>Search or start a workflow</span>
          <input id="ic365-command-input" placeholder="Type daily, incident, document, timeline..." autocomplete="off" />
        </div>
        <div id="ic365-command-results" class="ic365-command-results"></div>
      </div>`;
    document.body.appendChild(palette);
    render('');
  }

  function render(query) {
    const results = document.getElementById('ic365-command-results');
    if (!results) return;
    const q = String(query || '').trim().toLowerCase();
    const filtered = commands.filter((command) => !q || `${command.label} ${command.hint}`.toLowerCase().includes(q));
    results.innerHTML = filtered.length ? filtered.map((command, index) => `
      <button type="button" data-command-index="${index}">
        <strong>${escapeHtml(command.label)}</strong>
        <span>${escapeHtml(command.hint)}</span>
      </button>`).join('') : '<div class="ic365-empty-state">No matching workflow.</div>';
    results.querySelectorAll('[data-command-index]').forEach((button) => {
      const command = filtered[Number(button.dataset.commandIndex)];
      button.addEventListener('click', () => {
        close();
        command?.action?.();
      });
    });
  }

  function open() {
    ensurePalette();
    const palette = document.getElementById('ic365-command-palette');
    palette?.classList.add('open');
    palette?.setAttribute('aria-hidden', 'false');
    const input = document.getElementById('ic365-command-input');
    if (input) {
      input.value = '';
      render('');
      setTimeout(() => input.focus(), 20);
    }
  }

  function close() {
    const palette = document.getElementById('ic365-command-palette');
    palette?.classList.remove('open');
    palette?.setAttribute('aria-hidden', 'true');
  }

  function ensureLauncher() {
    const actions = document.querySelector('.ic365-top-actions');
    if (!actions || document.querySelector('[data-open-command-palette]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ic365-button subtle';
    button.dataset.openCommandPalette = 'true';
    button.textContent = 'Command';
    actions.prepend(button);
  }

  function bind() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-open-command-palette]')) open();
      if (event.target.closest('[data-close-command-palette]')) close();
    });
    document.addEventListener('input', (event) => {
      if (event.target?.id === 'ic365-command-input') render(event.target.value);
    });
    document.addEventListener('keydown', (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open();
      }
      if (event.key === 'Escape') close();
    });
  }

  function injectStyles() {
    if (document.getElementById('ic365-command-palette-styles')) return;
    const style = document.createElement('style');
    style.id = 'ic365-command-palette-styles';
    style.textContent = `
      .ic365-command-palette{position:fixed;inset:0;z-index:999998;display:none;align-items:flex-start;justify-content:center;padding-top:84px}.ic365-command-palette.open{display:flex}.ic365-command-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.42);backdrop-filter:blur(8px)}.ic365-command-dialog{position:relative;width:min(720px,calc(100vw - 28px));border-radius:24px;background:rgba(255,255,255,.96);box-shadow:0 28px 80px rgba(15,23,42,.28);border:1px solid rgba(15,23,42,.10);overflow:hidden}.ic365-command-search{padding:18px;border-bottom:1px solid rgba(15,23,42,.08);display:grid;gap:10px}.ic365-command-search span{font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;color:#64748b}.ic365-command-search input{width:100%;border:0;background:#f8fafc;border-radius:16px;padding:15px 16px;font-size:18px;font-weight:700;color:#10201f}.ic365-command-search input:focus{outline:2px solid #2563eb}.ic365-command-results{display:grid;gap:6px;padding:10px;max-height:520px;overflow:auto}.ic365-command-results button{border:0;background:transparent;text-align:left;border-radius:16px;padding:13px 14px;display:grid;gap:3px}.ic365-command-results button:hover{background:rgba(37,99,235,.08)}.ic365-command-results strong{font-size:14px;color:#10201f}.ic365-command-results span{font-size:12px;color:#64748b;font-weight:650}`;
    document.head.appendChild(style);
  }

  function boot() {
    injectStyles();
    ensureLauncher();
    bind();
    document.addEventListener('indicare:os-context-ready', ensureLauncher);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
