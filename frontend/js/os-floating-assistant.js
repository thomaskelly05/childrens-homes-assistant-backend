(() => {
  const STYLE_ID = 'os-floating-assistant-style';
  const ROOT_ID = 'os-floating-assistant-root';
  const FLAG = '__indicareFloatingOSAssistant';

  const state = {
    open: false,
    busy: false,
    messages: [
      {
        role: 'assistant',
        text: 'I am the IndiCare OS Assistant. Ask me about a child, home, provider, safeguarding pattern, LAC review, Reg 44, Reg 45, chronology, tasks, evidence or operational risk.',
        sources: [],
      },
    ],
  };

  const PROMPTS = [
    'Summarise the last 30 days for LAC review.',
    'Prepare a Reg 44 summary for this home.',
    'Prepare a Reg 45 provider overview.',
    'What safeguarding patterns are emerging?',
    'Which records need manager review?',
    'What should the RI or CEO be aware of today?',
    'Summarise placement stability and key risks.',
    'Show patterns across incidents, family time and education.'
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .os-ai-bubble{position:fixed;right:22px;bottom:22px;width:64px;height:64px;border:0;border-radius:24px;background:linear-gradient(135deg,#155eef,#7c3aed);color:#fff;z-index:150;box-shadow:0 22px 60px rgba(21,94,239,.38);font-size:26px;font-weight:950;display:grid;place-items:center;cursor:pointer}.os-ai-bubble:hover{transform:translateY(-2px)}.os-ai-bubble span{position:absolute;right:-3px;top:-3px;background:#22c55e;border:3px solid #fff;width:18px;height:18px;border-radius:999px}.os-ai-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:151;display:none}.os-ai-backdrop.open{display:block}.os-ai-modal{position:fixed;right:24px;bottom:100px;width:min(980px,calc(100vw - 32px));height:min(760px,calc(100vh - 130px));z-index:152;background:#fff;border:1px solid #dbe7f3;border-radius:28px;box-shadow:0 30px 90px rgba(15,23,42,.28);display:none;overflow:hidden;grid-template-columns:minmax(0,1fr) 300px}.os-ai-modal.open{display:grid}.os-ai-main{display:flex;flex-direction:column;min-width:0}.os-ai-head{padding:16px 18px;border-bottom:1px solid #dbe7f3;display:flex;justify-content:space-between;gap:12px;align-items:center;background:#f8fafc}.os-ai-title{font-size:18px;font-weight:950;color:#0f172a}.os-ai-subtitle{font-size:12px;color:#64748b}.os-ai-close{border:0;background:#e2e8f0;border-radius:999px;width:36px;height:36px;font-weight:950}.os-ai-thread{flex:1;overflow:auto;padding:18px;background:linear-gradient(180deg,#fff,#f8fafc);display:flex;flex-direction:column;gap:12px}.os-ai-msg{max-width:82%;border:1px solid #e2e8f0;border-radius:20px;padding:12px 14px;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.05);white-space:pre-wrap;line-height:1.45}.os-ai-msg.user{align-self:flex-end;background:#155eef;color:#fff;border-color:#155eef}.os-ai-msg.assistant{align-self:flex-start}.os-ai-sources{margin-top:10px;display:grid;gap:6px}.os-ai-source{border:1px solid #dbe7f3;border-radius:12px;padding:8px;background:#f8fafc;font-size:12px;color:#334155}.os-ai-composer{border-top:1px solid #dbe7f3;padding:12px;display:grid;grid-template-columns:1fr auto;gap:10px;background:#fff}.os-ai-composer textarea{border:1px solid #cbd5e1;border-radius:18px;padding:12px;min-height:54px;resize:vertical}.os-ai-send{border:0;border-radius:16px;background:#155eef;color:#fff;font-weight:950;padding:0 18px}.os-ai-rail{border-left:1px solid #dbe7f3;background:#f8fafc;padding:14px;overflow:auto}.os-ai-card{border:1px solid #e2e8f0;background:#fff;border-radius:18px;padding:12px;margin-bottom:10px}.os-ai-card h4{margin:0 0 8px;font-size:13px}.os-ai-context-grid{display:grid;gap:6px;font-size:12px;color:#475569}.os-ai-prompt{border:0;background:#eef4fb;border-radius:14px;padding:9px 10px;text-align:left;font-weight:800;color:#334155;width:100%;margin-bottom:7px}.os-ai-prompt:hover{background:#dbeafe;color:#1d4ed8}.os-ai-pill{display:inline-flex;border-radius:999px;background:#dbeafe;color:#1d4ed8;padding:4px 8px;font-size:11px;font-weight:900;margin:2px}.os-ai-loading{opacity:.72}.os-ai-error{border-color:#fecaca;background:#fff7f7;color:#991b1b}@media(max-width:860px){.os-ai-modal{left:8px;right:8px;bottom:88px;width:auto;grid-template-columns:1fr}.os-ai-rail{display:none}.os-ai-msg{max-width:94%}.os-ai-bubble{right:16px;bottom:16px}}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function qs() { return new URLSearchParams(location.search); }
  function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }

  function detectContext() {
    const selectedChild = window.state?.selectedChild?.profile || {};
    const profile = window.childProfile || {};
    const path = location.pathname + location.hash;
    const youngPersonId = numberOrNull(selectedChild.young_person_id || selectedChild.id || profile.young_person_id || profile.id || qs().get('young_person_id') || qs().get('child_id'));
    const homeId = numberOrNull(window.state?.home_id || selectedChild.home_id || profile.home_id || qs().get('home_id')) || 1;
    const providerId = numberOrNull(window.state?.provider_id || selectedChild.provider_id || qs().get('provider_id'));
    const staffId = numberOrNull(qs().get('staff_id') || window.currentUser?.staff_id);
    const adultId = numberOrNull(qs().get('adult_id'));
    let scope = 'home';
    if (youngPersonId) scope = 'child';
    else if (adultId || staffId) scope = 'adult';
    else if (providerId && !homeId) scope = 'provider';
    else if (path.includes('provider')) scope = 'provider';
    return { scope, provider_id: providerId, home_id: homeId, young_person_id: youngPersonId, staff_id: staffId, adult_id: adultId, current_page: path };
  }

  function render() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }
    root.innerHTML = `
      <button class="os-ai-bubble" type="button" aria-label="Open OS Assistant" data-os-ai-open>AI<span></span></button>
      <div class="os-ai-backdrop ${state.open ? 'open' : ''}" data-os-ai-close></div>
      <section class="os-ai-modal ${state.open ? 'open' : ''}" role="dialog" aria-modal="true" aria-label="IndiCare OS Assistant">
        <div class="os-ai-main">
          <header class="os-ai-head">
            <div><div class="os-ai-title">IndiCare OS Assistant</div><div class="os-ai-subtitle">All-knowing operational assistant across records, reviews, safeguarding, home and provider intelligence</div></div>
            <button class="os-ai-close" type="button" data-os-ai-close>×</button>
          </header>
          <div class="os-ai-thread" data-os-ai-thread>${renderThread()}</div>
          <form class="os-ai-composer" data-os-ai-form>
            <textarea name="message" placeholder="Ask about a child, home, provider, LAC review, Reg 44, Reg 45, safeguarding trends, chronology or records..."></textarea>
            <button class="os-ai-send" type="submit" ${state.busy ? 'disabled' : ''}>Ask</button>
          </form>
        </div>
        <aside class="os-ai-rail">${renderRail()}</aside>
      </section>
    `;
    bind(root);
    scrollThread();
  }

  function renderThread() {
    return state.messages.map((m) => `
      <article class="os-ai-msg ${esc(m.role)} ${m.error ? 'os-ai-error' : ''}">
        ${esc(m.text)}
        ${m.sources?.length ? `<div class="os-ai-sources">${m.sources.map(renderSource).join('')}</div>` : ''}
      </article>
    `).join('');
  }

  function renderSource(source) {
    const title = source.title || source.record_type || source.type || 'Source';
    const meta = source.created_at || source.starts_at || source.status || '';
    return `<div class="os-ai-source"><strong>${esc(source.type || 'source')}</strong> · ${esc(title)}${meta ? `<br><small>${esc(meta)}</small>` : ''}</div>`;
  }

  function renderRail() {
    const ctx = detectContext();
    return `
      <div class="os-ai-card"><h4>Current context</h4><div class="os-ai-context-grid">
        <div><strong>Scope:</strong> ${esc(ctx.scope)}</div>
        <div><strong>Home:</strong> ${esc(ctx.home_id || '—')}</div>
        <div><strong>Child:</strong> ${esc(ctx.young_person_id || '—')}</div>
        <div><strong>Provider:</strong> ${esc(ctx.provider_id || '—')}</div>
        <div><strong>Page:</strong> ${esc(ctx.current_page)}</div>
      </div></div>
      <div class="os-ai-card"><h4>Suggested prompts</h4>${PROMPTS.map((p) => `<button class="os-ai-prompt" type="button" data-os-ai-prompt="${esc(p)}">${esc(p)}</button>`).join('')}</div>
      <div class="os-ai-card"><h4>Can answer from</h4><span class="os-ai-pill">Records</span><span class="os-ai-pill">Chronology</span><span class="os-ai-pill">Tasks</span><span class="os-ai-pill">Evidence</span><span class="os-ai-pill">Calendar</span><span class="os-ai-pill">Connect</span><span class="os-ai-pill">Safeguarding</span><span class="os-ai-pill">Provider</span></div>
    `;
  }

  function bind(root) {
    root.querySelector('[data-os-ai-open]')?.addEventListener('click', openAssistant);
    root.querySelectorAll('[data-os-ai-close]').forEach((el) => el.addEventListener('click', closeAssistant));
    root.querySelector('[data-os-ai-form]')?.addEventListener('submit', submitQuestion);
    root.querySelectorAll('[data-os-ai-prompt]').forEach((btn) => btn.addEventListener('click', () => ask(btn.dataset.osAiPrompt)));
  }

  function openAssistant() { state.open = true; render(); }
  function closeAssistant() { state.open = false; render(); }
  function scrollThread() { const thread = document.querySelector('[data-os-ai-thread]'); if (thread) thread.scrollTop = thread.scrollHeight; }

  function submitQuestion(event) {
    event.preventDefault();
    const textarea = event.currentTarget.message;
    const text = textarea.value.trim();
    if (!text) return;
    textarea.value = '';
    ask(text);
  }

  async function ask(text) {
    if (state.busy) return;
    state.open = true;
    state.messages.push({ role: 'user', text, sources: [] });
    state.messages.push({ role: 'assistant', text: 'Thinking across the OS records, chronology, evidence, tasks, calendar and Connect activity...', sources: [], loading: true });
    state.busy = true;
    render();
    try {
      const ctx = detectContext();
      const res = await fetch('/api/os-assistant/ask', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-User-Id': qs().get('user_id') || '1', 'X-Role': qs().get('role') || 'manager' },
        body: JSON.stringify({ message: text, ...ctx })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      state.messages.pop();
      state.messages.push({ role: 'assistant', text: data.answer || 'I could not produce an answer from the OS data.', sources: data.sources || [] });
      if (Array.isArray(data.suggested_questions)) {
        data.suggested_questions.slice(0, 5).forEach((q) => { if (!PROMPTS.includes(q)) PROMPTS.push(q); });
      }
    } catch (error) {
      state.messages.pop();
      state.messages.push({ role: 'assistant', text: 'I could not reach the OS Assistant endpoint. Check that the assistant bridge router is loaded and the database schema is available.\n\n' + error.message, sources: [], error: true });
    } finally {
      state.busy = false;
      render();
    }
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    render();
    window.IndiCareOSAssistant = { open: openAssistant, ask, context: detectContext };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
