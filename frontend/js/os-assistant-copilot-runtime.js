(() => {
  const FLAG = '__indicareOsAssistantCopilotRuntime';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const state = {
    open: false,
    messages: [],
    busy: false,
    recordId: null,
  };

  const starterPrompts = [
    'Summarise what matters for handover.',
    'What needs manager review?',
    'What safeguarding patterns are emerging?',
    'Prepare an Ofsted-ready summary.',
    'What should I record next?',
    'Summarise this young person for LAC review.',
  ];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function context() {
    const ctx = window.IndiCareOSContext || window.IndiCareContext?.get?.() || {};
    const activeView = document.querySelector('[data-view].active')?.dataset.view || '';
    const activeShell = document.querySelector('[data-shell].active')?.dataset.shell || '';
    return {
      provider_id: ctx.providerId ? Number(ctx.providerId) : undefined,
      home_id: ctx.homeId ? Number(ctx.homeId) : undefined,
      young_person_id: ctx.childId ? Number(ctx.childId) : undefined,
      current_page: activeShell || activeView || location.pathname,
      scope: ctx.childId ? 'child' : ctx.homeId ? 'home' : 'auto',
    };
  }

  function ensure() {
    if (document.getElementById('ic365-assistant-copilot')) return;
    const root = document.createElement('section');
    root.id = 'ic365-assistant-copilot';
    root.className = 'ic365-assistant-copilot';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="ic365-assistant-backdrop" data-close-os-assistant></div>
      <aside class="ic365-assistant-panel" role="dialog" aria-label="IndiCare assistant">
        <header class="ic365-assistant-header">
          <div>
            <p class="eyebrow">IndiCare Assistant</p>
            <h2>Operational co-pilot</h2>
            <span id="ic365-assistant-context">Context-aware support for the current shell.</span>
          </div>
          <button type="button" class="ic365-button" data-close-os-assistant>Close</button>
        </header>
        <div class="ic365-assistant-starters">${starterPrompts.map((prompt) => `<button type="button" data-os-assistant-prompt="${esc(prompt)}">${esc(prompt)}</button>`).join('')}</div>
        <main id="ic365-assistant-messages" class="ic365-assistant-messages"></main>
        <footer class="ic365-assistant-composer">
          <textarea id="ic365-assistant-input" placeholder="Ask about chronology, safeguarding, review, documents, handover or inspection readiness..."></textarea>
          <button type="button" class="ic365-button primary" data-send-os-assistant>Ask</button>
        </footer>
      </aside>`;
    document.body.appendChild(root);
  }

  function launcher() {
    const actions = document.querySelector('.ic365-top-actions');
    if (actions && !document.querySelector('[data-open-os-assistant]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ic365-button subtle';
      button.dataset.openOsAssistant = 'true';
      button.textContent = 'Assistant';
      actions.prepend(button);
    }

    const rail = document.querySelector('.ic365-rightpanel');
    if (rail && !document.getElementById('ic365-assistant-rail-card')) {
      const card = document.createElement('section');
      card.id = 'ic365-assistant-rail-card';
      card.className = 'ic365-side-card';
      card.innerHTML = `
        <h2>Assistant</h2>
        <p>Ask about the current young person, records, safeguarding, evidence, handover or inspection readiness.</p>
        <div class="ic365-action-list">
          <button type="button" data-open-os-assistant><strong>Open assistant</strong><span>Context-aware operational support</span></button>
          <button type="button" data-os-assistant-prompt="What needs manager review?"><strong>Manager review</strong><span>Find records needing oversight</span></button>
          <button type="button" data-os-assistant-prompt="Prepare an Ofsted-ready summary."><strong>Inspection summary</strong><span>Structure evidence and risks</span></button>
        </div>`;
      rail.prepend(card);
    }
  }

  function updateContextLabel() {
    const label = document.getElementById('ic365-assistant-context');
    if (!label) return;
    const ctx = window.IndiCareOSContext || {};
    const home = ctx.homeName || (ctx.homeId ? `Home ${ctx.homeId}` : 'No home selected');
    const child = ctx.childName || (ctx.childId ? `Young person ${ctx.childId}` : 'No young person selected');
    label.textContent = `${home} / ${child}`;
  }

  function render() {
    const messages = document.getElementById('ic365-assistant-messages');
    if (!messages) return;
    messages.innerHTML = state.messages.length ? state.messages.map((message) => `
      <article class="ic365-assistant-message ${message.role}">
        <strong>${message.role === 'user' ? 'You' : 'Assistant'}</strong>
        <p>${esc(message.content).replace(/\n/g, '<br>')}</p>
        ${message.sources?.length ? `<div class="ic365-assistant-sources"><span>Sources</span>${message.sources.map((source) => `<button type="button" data-open-record-id="${esc(source.id || '')}">${esc(source.title || source.record_type || source.type || 'Source')}</button>`).join('')}</div>` : ''}
      </article>`).join('') : '<div class="ic365-empty-state">Ask the assistant to summarise, review, prepare handover, inspect evidence or explain what needs doing next.</div>';
    messages.scrollTop = messages.scrollHeight;
  }

  function open(prompt = '') {
    ensure();
    launcher();
    updateContextLabel();
    const root = document.getElementById('ic365-assistant-copilot');
    root?.classList.add('open');
    root?.setAttribute('aria-hidden', 'false');
    state.open = true;
    if (prompt) {
      const input = document.getElementById('ic365-assistant-input');
      if (input) input.value = prompt;
      ask(prompt);
    } else {
      setTimeout(() => document.getElementById('ic365-assistant-input')?.focus(), 20);
    }
    render();
  }

  function close() {
    const root = document.getElementById('ic365-assistant-copilot');
    root?.classList.remove('open');
    root?.setAttribute('aria-hidden', 'true');
    state.open = false;
  }

  function recordPrompt(recordId) {
    state.recordId = recordId || null;
    open(`Summarise this record and tell me what needs review, follow-up, document linking or safeguarding attention.`);
  }

  async function ask(message) {
    const input = document.getElementById('ic365-assistant-input');
    const text = String(message || input?.value || '').trim();
    if (!text || state.busy) return;
    if (input) input.value = '';
    state.busy = true;
    state.messages.push({ role: 'user', content: text });
    render();

    try {
      const response = await fetch('/api/os-assistant/ask', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          ...context(),
          mode: state.recordId ? 'record' : 'shell',
          current_record_id: state.recordId,
          limit: 120,
          include_connect: true,
          include_tasks: true,
          include_calendar: true,
          include_evidence: true,
        }),
      });

      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const data = await response.json();
      state.messages.push({ role: 'assistant', content: data.answer || 'I could not produce an answer from the current context.', sources: data.sources || [] });
      if (Array.isArray(data.suggested_questions) && data.suggested_questions.length) updateStarters(data.suggested_questions);
    } catch (error) {
      state.messages.push({ role: 'assistant', content: `The assistant bridge is wired but the request failed: ${String(error)}. Check that /api/os-assistant/ask is available in this environment.` });
    } finally {
      state.busy = false;
      render();
      document.dispatchEvent(new CustomEvent('indicare:assistant-used', { detail: { message: text, recordId: state.recordId } }));
    }
  }

  function updateStarters(prompts) {
    const starters = document.querySelector('.ic365-assistant-starters');
    if (!starters) return;
    starters.innerHTML = prompts.slice(0, 6).map((prompt) => `<button type="button" data-os-assistant-prompt="${esc(prompt)}">${esc(prompt)}</button>`).join('');
  }

  function injectStyles() {
    if (document.getElementById('ic365-assistant-copilot-styles')) return;
    const style = document.createElement('style');
    style.id = 'ic365-assistant-copilot-styles';
    style.textContent = `
      .ic365-assistant-copilot{position:fixed;inset:0;z-index:999996;display:none}.ic365-assistant-copilot.open{display:block}.ic365-assistant-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.34);backdrop-filter:blur(8px)}.ic365-assistant-panel{position:absolute;top:16px;right:16px;bottom:16px;width:min(620px,calc(100vw - 32px));border-radius:28px;background:rgba(255,255,255,.97);border:1px solid rgba(15,23,42,.10);box-shadow:0 28px 90px rgba(15,23,42,.28);display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;overflow:hidden}.ic365-assistant-header{padding:20px;border-bottom:1px solid rgba(15,23,42,.08);display:flex;justify-content:space-between;gap:14px}.ic365-assistant-header h2{margin:0;font-size:24px;letter-spacing:-.04em;color:#10201f}.ic365-assistant-header span{display:block;margin-top:6px;color:#64748b;font-size:12px;font-weight:700}.ic365-assistant-starters{display:flex;gap:8px;overflow:auto;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.07);background:#f8fafc}.ic365-assistant-starters button{border:1px solid rgba(15,23,42,.08);background:#fff;border-radius:999px;padding:8px 10px;font-size:12px;font-weight:800;color:#334155;white-space:nowrap}.ic365-assistant-messages{padding:16px;overflow:auto;display:grid;gap:12px;align-content:start;background:#f5f7f6}.ic365-assistant-message{max-width:92%;border-radius:18px;padding:13px 14px;background:#fff;border:1px solid rgba(15,23,42,.08);box-shadow:0 8px 22px rgba(15,23,42,.06)}.ic365-assistant-message.user{justify-self:end;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff}.ic365-assistant-message strong{display:block;margin-bottom:5px;font-size:12px}.ic365-assistant-message p{margin:0;line-height:1.52}.ic365-assistant-sources{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding-top:9px;border-top:1px solid rgba(15,23,42,.08)}.ic365-assistant-sources span{font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase}.ic365-assistant-sources button{border:0;border-radius:999px;background:rgba(37,99,235,.09);color:#1d4ed8;font-size:11px;font-weight:800;padding:5px 8px}.ic365-assistant-composer{padding:14px;border-top:1px solid rgba(15,23,42,.08);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;background:#fff}.ic365-assistant-composer textarea{min-height:60px;max-height:140px;border-radius:16px;border:1px solid rgba(15,23,42,.12);background:#f8fafc;padding:12px;resize:vertical}@media(max-width:760px){.ic365-assistant-panel{inset:0;width:auto;border-radius:0}.ic365-assistant-composer{grid-template-columns:1fr}}`;
    document.head.appendChild(style);
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-open-os-assistant]');
      if (opener) { open(); return; }
      const closeButton = event.target.closest('[data-close-os-assistant]');
      if (closeButton) { close(); return; }
      const prompt = event.target.closest('[data-os-assistant-prompt]');
      if (prompt) { open(prompt.dataset.osAssistantPrompt || prompt.textContent); return; }
      const askRecord = event.target.closest('[data-ask-assistant-record]');
      if (askRecord) { recordPrompt(askRecord.dataset.askAssistantRecord); return; }
      const send = event.target.closest('[data-send-os-assistant]');
      if (send) { ask(); return; }
    });

    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        open();
      }
      if (event.key === 'Escape' && state.open) close();
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && document.activeElement?.id === 'ic365-assistant-input') {
        event.preventDefault();
        ask();
      }
    });

    document.addEventListener('indicare:os-context-ready', () => { launcher(); updateContextLabel(); });
    document.addEventListener('indicare:care-data-changed', updateContextLabel);
  }

  function boot() {
    injectStyles();
    ensure();
    launcher();
    bind();
    updateContextLabel();
  }

  window.IndiCareOpenAssistant = open;
  window.IndiCareAskAssistantAboutRecord = recordPrompt;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
