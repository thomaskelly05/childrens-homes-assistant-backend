let osAssistantContext = { children: [], documents: [], chronology: [], safeguarding: [], homes: [], workforce: [] };
let osAssistantHistory = [];

function ensureAssistantModal() {
  if (document.getElementById('ic-os-assistant-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'ic-os-assistant-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(6px);z-index:9999;display:none;';

  modal.innerHTML = `
    <div style="position:absolute;inset:24px;background:#fff;border-radius:24px;overflow:hidden;display:grid;grid-template-columns:320px 1fr 320px;box-shadow:0 30px 80px rgba(15,23,42,.3);">
      <aside style="background:#0f172a;color:#fff;padding:22px;display:grid;grid-template-rows:auto auto auto 1fr auto;gap:18px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <div style="width:48px;height:48px;border-radius:14px;background:#1d4ed8;display:grid;place-items:center;font-weight:900;">IC</div>
          <div><strong style="display:block;font-size:1.2rem;">IndiCare AI</strong><span style="color:#cbd5e1;font-size:.85rem;">Operational residential assistant</span></div>
        </div>
        <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,.06);"><span style="display:block;color:#93c5fd;font-size:.75rem;text-transform:uppercase;font-weight:800;letter-spacing:.08em;">Mode</span><strong style="display:block;margin-top:6px;font-size:1rem;">Children, records & safeguarding</strong></div>
        <div><input placeholder="Search chats" style="width:100%;height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#111827;color:#fff;padding:0 14px;outline:none;" /></div>
        <div style="display:grid;align-content:start;gap:10px;overflow:auto;">
          <button class="ic-history-item" data-os-prompt="Summarise the most important chronology themes for the children currently loaded in the OS.">Chronology summary</button>
          <button class="ic-history-item" data-os-prompt="Review the open safeguarding context and tell me what management oversight is needed.">Safeguarding review</button>
          <button class="ic-history-item" data-os-prompt="Identify overdue or missing records from the current OS context.">Missing records review</button>
          <button class="ic-history-item" data-os-prompt="Draft a concise shift handover from the current OS context.">Handover prep</button>
        </div>
        <button id="ic-close-assistant" style="height:46px;border:0;border-radius:12px;background:#1e293b;color:#fff;font-weight:800;cursor:pointer;">Close assistant</button>
      </aside>
      <main style="display:grid;grid-template-rows:auto 1fr auto;background:#f8fafc;min-width:0;">
        <header style="height:84px;border-bottom:1px solid #e2e8f0;padding:0 24px;display:flex;align-items:center;justify-content:space-between;background:#fff;">
          <div><div style="display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:.78rem;font-weight:800;">Live operational assistant</div><h1 style="margin:8px 0 0;font-size:1.55rem;letter-spacing:-.04em;">Ask about young people, chronology, safeguarding or records</h1></div>
          <div style="display:flex;gap:10px;"><button class="ic-action-btn" id="ic-assistant-clear">Clear</button></div>
        </header>
        <section id="ic-assistant-messages" style="padding:26px;overflow:auto;display:grid;align-content:start;gap:18px;">
          <div style="max-width:860px;background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(15,23,42,.06);"><strong style="display:block;font-size:1.1rem;margin-bottom:8px;">Operational assistant ready</strong><p style="margin:0;color:#475569;line-height:1.7;">Ask questions about the young people, records, chronology, safeguarding, reviews and handover. Responses are sent to the backend assistant with OS context attached.</p></div>
        </section>
        <footer style="padding:18px 24px;border-top:1px solid #dbe4f0;background:#fff;"><div style="display:flex;gap:12px;align-items:flex-end;"><textarea id="ic-assistant-input" placeholder="Ask IndiCare AI about children, chronology, safeguarding or records..." style="flex:1;min-height:56px;max-height:180px;border:1px solid #dbe4f0;border-radius:16px;padding:14px;resize:vertical;outline:none;font:inherit;"></textarea><button id="ic-send-assistant" style="width:56px;height:56px;border:0;border-radius:16px;background:#075fd1;color:#fff;font-size:1.2rem;font-weight:900;cursor:pointer;">↑</button></div></footer>
      </main>
      <aside style="border-left:1px solid #e2e8f0;background:#fff;padding:22px;display:grid;grid-template-rows:auto auto 1fr;gap:18px;overflow:auto;">
        <div><h2 style="margin:0;font-size:1.1rem;">Live OS context</h2><p style="margin:8px 0 0;color:#64748b;line-height:1.6;">Loaded from backend API endpoints where available.</p></div>
        <div style="display:grid;gap:10px;"><button class="ic-context-btn" data-os-prompt="Summarise the chronology for the loaded young people.">Summarise chronology</button><button class="ic-context-btn" data-os-prompt="Review safeguarding risks and manager actions from the loaded context.">Review safeguarding</button><button class="ic-context-btn" data-os-prompt="Check overdue records and missing evidence from the loaded context.">Check overdue records</button><button class="ic-context-btn" data-os-prompt="Draft a shift handover from the current OS context.">Draft handover</button></div>
        <div id="ic-live-context" style="display:grid;gap:12px;align-content:start;"></div>
      </aside>
    </div>`;

  document.body.appendChild(modal);
  modal.querySelector('#ic-close-assistant')?.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.querySelector('#ic-assistant-clear')?.addEventListener('click', clearAssistantMessages);
  modal.querySelector('#ic-send-assistant')?.addEventListener('click', sendAssistantMessage);
  modal.querySelector('#ic-assistant-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendAssistantMessage();
    }
  });
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
  modal.addEventListener('click', (event) => {
    const promptButton = event.target.closest('[data-os-prompt]');
    if (!promptButton) return;
    const input = document.getElementById('ic-assistant-input');
    input.value = promptButton.dataset.osPrompt;
    sendAssistantMessage();
  });
  document.addEventListener('click', (event) => {
    const bubble = event.target.closest('.sp-ai-bubble');
    if (!bubble) return;
    modal.style.display = 'block';
    hydrateContext();
  });
}

async function hydrateContext() {
  const target = document.getElementById('ic-live-context');
  if (!target) return;
  target.innerHTML = '<div style="padding:14px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-weight:700;">Loading live operational data…</div>';
  const [children, documents, chronology, safeguarding, homes, workforce] = await Promise.all([
    window.IndiCareData?.load?.('children') || [],
    window.IndiCareData?.load?.('documents') || [],
    window.IndiCareData?.load?.('chronology') || [],
    window.IndiCareData?.load?.('safeguarding') || [],
    window.IndiCareData?.load?.('homes') || [],
    window.IndiCareData?.load?.('workforce') || [],
  ]);
  osAssistantContext = { children, documents, chronology, safeguarding, homes, workforce };
  target.innerHTML = contextSummaryCards(osAssistantContext);
}

function contextSummaryCards(context) {
  const rows = [
    ['Young people', context.children.length],
    ['Documents', context.documents.length],
    ['Chronology entries', context.chronology.length],
    ['Safeguarding items', context.safeguarding.length],
    ['Homes', context.homes.length],
    ['Workforce', context.workforce.length],
  ];
  const cards = rows.map(([label, count]) => `<article style="padding:14px;border:1px solid #dbe4f0;border-radius:14px;background:#f8fafc;"><strong style="display:block;">${escapeHtml(label)}</strong><span style="display:block;color:#64748b;margin-top:4px;">${escapeHtml(count)} loaded</span></article>`).join('');
  if (rows.every(([, count]) => Number(count) === 0)) {
    return cards + '<div style="padding:14px;border-radius:14px;background:#fff7ed;color:#c2410c;font-weight:700;">No live backend records returned yet. The shell is ready, but matching API endpoints need to return data.</div>';
  }
  return cards;
}

function buildContextPayload() {
  const trimItems = (items) => (Array.isArray(items) ? items.slice(0, 20) : []);
  return {
    children: trimItems(osAssistantContext.children),
    documents: trimItems(osAssistantContext.documents),
    chronology: trimItems(osAssistantContext.chronology),
    safeguarding: trimItems(osAssistantContext.safeguarding),
    homes: trimItems(osAssistantContext.homes),
    workforce: trimItems(osAssistantContext.workforce),
    active_route: location.pathname,
  };
}

function systemPrefix() {
  return [
    'INDICARE OS ASSISTANT CONTEXT:',
    'You are embedded inside the IndiCare residential children\'s home operating system, not the standalone public assistant.',
    'Use British English and professional residential children\'s home language.',
    'Answer adult staff questions using the provided OS context where available.',
    'Separate known facts from professional interpretation, missing evidence and recommended manager actions.',
    'Do not invent child details. If live OS data is missing, say what is missing and what endpoint/context is needed.',
    'Do not make final safeguarding, legal, clinical or regulatory decisions. Frame next steps for staff/manager review.',
    'When safeguarding is relevant, include immediate safety, notifications, recording quality and management oversight.',
    'When records are relevant, use factual, child-centred, non-judgemental language.',
  ].join('\n');
}

async function sendAssistantMessage() {
  const input = document.getElementById('ic-assistant-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  appendAssistantBubble('user', text);
  const assistantNode = appendAssistantBubble('assistant', 'Thinking…');

  try {
    await hydrateContext();
    const message = `${systemPrefix()}\n\nLIVE_OS_CONTEXT_JSON:\n${JSON.stringify(buildContextPayload()).slice(0, 24000)}\n\nUSER QUESTION:\n${text}`;
    const payload = {
      message,
      response_mode: 'balanced',
      assistant_surface: 'indicare_os',
      assistant_mode: 'children_safeguarding_records',
      history: osAssistantHistory.slice(-10),
    };
    const response = await fetch('/assistant/general/stream', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders('POST') },
      body: JSON.stringify(payload),
    });
    if (!response.ok || !response.body) throw new Error(`Assistant failed with status ${response.status}`);
    let output = '';
    await readSse(response, (chunk) => {
      output += chunk;
      assistantNode.querySelector('[data-message-text]').innerHTML = renderText(output);
      scrollMessages();
    });
    if (!output.trim()) output = 'I could not generate a response from the backend just now.';
    assistantNode.querySelector('[data-message-text]').innerHTML = renderText(output);
    osAssistantHistory.push({ role: 'user', content: text }, { role: 'assistant', content: output });
  } catch (error) {
    assistantNode.querySelector('[data-message-text]').innerHTML = renderText('Sorry, I could not reach the IndiCare assistant backend just now. Please check the assistant endpoint and try again.');
  }
}

function appendAssistantBubble(role, text) {
  const messages = document.getElementById('ic-assistant-messages');
  const node = document.createElement('article');
  node.style.cssText = `max-width:860px;justify-self:${role === 'user' ? 'end' : 'start'};background:${role === 'user' ? '#075fd1' : '#fff'};color:${role === 'user' ? '#fff' : '#0f172a'};border:1px solid #dbe4f0;border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06);`;
  node.innerHTML = `<strong style="display:block;margin-bottom:8px;">${role === 'user' ? 'You' : 'IndiCare AI'}</strong><div data-message-text style="line-height:1.7;">${renderText(text)}</div>`;
  messages.appendChild(node);
  scrollMessages();
  return node;
}

function scrollMessages() {
  const messages = document.getElementById('ic-assistant-messages');
  if (messages) messages.scrollTop = messages.scrollHeight;
}

async function readSse(response, onText) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      const parsed = parseSse(part);
      if (!parsed.data || ['done', 'meta', 'progress'].includes(parsed.event)) continue;
      onText(parsed.data);
    }
  }
}

function parseSse(chunk) {
  const lines = String(chunk || '').split('\n');
  let event = 'message';
  const data = [];
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  return { event, data: data.join('\n') };
}

function clearAssistantMessages() {
  osAssistantHistory = [];
  const messages = document.getElementById('ic-assistant-messages');
  if (messages) messages.innerHTML = '<div style="max-width:860px;background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(15,23,42,.06);"><strong style="display:block;font-size:1.1rem;margin-bottom:8px;">Chat cleared</strong><p style="margin:0;color:#475569;line-height:1.7;">Ask a new question about the OS context.</p></div>';
}

function csrfHeaders(method) {
  const headers = {};
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase())) return headers;
  const match = document.cookie.match(/(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]+)/);
  if (match) headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
  return headers;
}

function renderText(value) {
  return escapeHtml(value).replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

ensureAssistantModal();
