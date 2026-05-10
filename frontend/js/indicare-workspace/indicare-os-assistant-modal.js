import { scrubAssistantPayload, restoreTokens } from "../young-people-shell/core/ai-scrubber.js";

let osAssistantContext = { children: [], documents: [], chronology: [], safeguarding: [], homes: [], workforce: [], active_document: null, operational_session: null };
let osAssistantHistory = [];
let osAssistantBusy = false;
let lastReverseMap = {};

function ensureAssistantModal() {
  if (document.getElementById('ic-os-assistant-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'ic-os-assistant-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(6px);z-index:9999;display:none;';

  modal.innerHTML = `
    <div style="position:absolute;inset:24px;background:#fff;border-radius:24px;overflow:hidden;display:grid;grid-template-columns:320px minmax(0,1fr) 340px;box-shadow:0 30px 80px rgba(15,23,42,.3);">
      <aside style="background:#0f172a;color:#fff;padding:22px;display:grid;grid-template-rows:auto auto auto 1fr auto;gap:18px;min-width:0;">
        <div style="display:flex;gap:12px;align-items:center;">
          <div style="width:48px;height:48px;border-radius:14px;background:#1d4ed8;display:grid;place-items:center;font-weight:900;">IC</div>
          <div><strong style="display:block;font-size:1.2rem;">IndiCare AI</strong><span style="color:#cbd5e1;font-size:.85rem;">Operational residential assistant</span></div>
        </div>
        <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,.06);"><span style="display:block;color:#93c5fd;font-size:.75rem;text-transform:uppercase;font-weight:800;letter-spacing:.08em;">Mode</span><strong style="display:block;margin-top:6px;font-size:1rem;">Children, records & safeguarding</strong><small id="ic-assistant-scope" style="display:block;color:#cbd5e1;margin-top:6px;line-height:1.4;">Live OS context</small></div>
        <div><input id="ic-assistant-search" placeholder="Filter prompt shortcuts" style="width:100%;height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#111827;color:#fff;padding:0 14px;outline:none;" /></div>
        <div id="ic-prompt-shortcuts" style="display:grid;align-content:start;gap:10px;overflow:auto;">
          ${shortcut('Chronology summary', 'Summarise the most important chronology themes for the children currently loaded in the OS. Include what is evidenced, what is missing, and what staff should do next.')}
          ${shortcut('Safeguarding review', 'Review the open safeguarding context and tell me what management oversight is needed. Separate immediate safety actions, recording gaps and manager follow-up.')}
          ${shortcut('Missing records review', 'Identify overdue, missing or weak records from the current OS context. Do not invent records that are not visible.')}
          ${shortcut('Handover prep', 'Draft a concise shift handover from the current OS context. Make it practical, safeguarding-aware and action-focused.')}
          ${shortcut('Open document review', 'Review the currently open IndiCare document. Check factual quality, child voice, safeguarding considerations, missing evidence and manager oversight.')}
        </div>
        <button id="ic-close-assistant" style="height:46px;border:0;border-radius:12px;background:#1e293b;color:#fff;font-weight:800;cursor:pointer;">Close assistant</button>
      </aside>
      <main style="display:grid;grid-template-rows:auto 1fr auto;background:#f8fafc;min-width:0;">
        <header style="min-height:84px;border-bottom:1px solid #e2e8f0;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;background:#fff;gap:16px;">
          <div><div style="display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:.78rem;font-weight:800;">Live operational assistant</div><h1 style="margin:8px 0 0;font-size:1.55rem;letter-spacing:-.04em;">Ask about young people, documents, chronology or safeguarding</h1></div>
          <div style="display:flex;gap:10px;"><button class="ic-action-btn" id="ic-assistant-clear" type="button">Clear</button></div>
        </header>
        <section id="ic-assistant-messages" style="padding:26px;overflow:auto;display:grid;align-content:start;gap:18px;">
          ${welcomeCard()}
        </section>
        <footer style="padding:18px 24px;border-top:1px solid #dbe4f0;background:#fff;"><div style="display:flex;gap:12px;align-items:flex-end;"><textarea id="ic-assistant-input" placeholder="Ask IndiCare AI about children, chronology, safeguarding, records or the open document..." style="flex:1;min-height:56px;max-height:180px;border:1px solid #dbe4f0;border-radius:16px;padding:14px;resize:vertical;outline:none;font:inherit;"></textarea><button id="ic-send-assistant" style="width:56px;height:56px;border:0;border-radius:16px;background:#075fd1;color:#fff;font-size:1.2rem;font-weight:900;cursor:pointer;">↑</button></div><p id="ic-assistant-status" style="margin:8px 0 0;color:#64748b;font-size:.82rem;">Answers are grounded in live OS context and should be reviewed by staff/manager.</p></footer>
      </main>
      <aside style="border-left:1px solid #e2e8f0;background:#fff;padding:22px;display:grid;grid-template-rows:auto auto 1fr;gap:18px;overflow:auto;min-width:0;">
        <div><h2 style="margin:0;font-size:1.1rem;">Live OS context</h2><p style="margin:8px 0 0;color:#64748b;line-height:1.6;">Uses selected home/session, young people, documents, chronology, safeguarding and the open IndiCare document where available.</p></div>
        <div style="display:grid;gap:10px;">
          ${contextButton('Summarise chronology', 'Summarise the chronology for the loaded young people, citing the relevant record/date references from the OS context.')}
          ${contextButton('Review safeguarding', 'Review safeguarding risks and manager actions from the loaded context. Include what is known, what is missing and what should be escalated.')}
          ${contextButton('Check recording quality', 'Check the quality of the current recording evidence. Identify missing child voice, actions, outcome, chronology links and safeguarding flags.')}
          ${contextButton('Draft handover', 'Draft a shift handover from the current OS context. Keep it concise and action-focused.')}
        </div>
        <div id="ic-live-context" style="display:grid;gap:12px;align-content:start;"></div>
      </aside>
    </div>`;

  document.body.appendChild(modal);
  modal.querySelector('#ic-close-assistant')?.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.querySelector('#ic-assistant-clear')?.addEventListener('click', clearAssistantMessages);
  modal.querySelector('#ic-send-assistant')?.addEventListener('click', sendAssistantMessage);
  modal.querySelector('#ic-assistant-search')?.addEventListener('input', filterPromptShortcuts);
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
    input.focus();
    sendAssistantMessage();
  });
  document.addEventListener('click', (event) => {
    const bubble = event.target.closest('.sp-ai-bubble');
    if (!bubble) return;
    modal.style.display = 'block';
    hydrateContext();
    document.getElementById('ic-assistant-input')?.focus();
  });
}

function shortcut(label, prompt) {
  return `<button class="ic-history-item" data-shortcut-label="${escapeHtml(label.toLowerCase())}" data-os-prompt="${escapeHtml(prompt)}" type="button">${escapeHtml(label)}</button>`;
}

function contextButton(label, prompt) {
  return `<button class="ic-context-btn" data-os-prompt="${escapeHtml(prompt)}" type="button">${escapeHtml(label)}</button>`;
}

function welcomeCard() {
  return '<div style="max-width:860px;background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(15,23,42,.06);"><strong style="display:block;font-size:1.1rem;margin-bottom:8px;">Operational assistant ready</strong><p style="margin:0;color:#475569;line-height:1.7;">Ask about young people, open documents, chronology, safeguarding, reviews or handover. I will use live OS context only and will say where evidence is missing.</p></div>';
}

async function hydrateContext() {
  const target = document.getElementById('ic-live-context');
  if (target) target.innerHTML = '<div style="padding:14px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-weight:700;">Loading live operational data…</div>';

  const live = normaliseLiveContext(window.IndiCareLiveContext || {});
  const [children, documents, chronology, safeguarding, homes, workforce] = await Promise.all([
    live.children.length ? live.children : loadData('children'),
    live.documents.length ? live.documents : loadData('documents'),
    live.chronology.length ? live.chronology : loadData('chronology'),
    live.safeguarding.length ? live.safeguarding : loadData('safeguarding'),
    live.homes.length ? live.homes : loadData('homes'),
    live.workforce.length ? live.workforce : loadData('workforce'),
  ]);

  const selectedContext = scopeToSession({ children, documents, chronology, safeguarding, homes, workforce });
  osAssistantContext = {
    ...selectedContext,
    active_document: getActiveDocumentContext(),
    operational_session: window.IndiCareOperationalSession || null,
    active_route: location.pathname,
    active_view: getActiveViewLabel(),
  };

  const scope = document.getElementById('ic-assistant-scope');
  if (scope) scope.textContent = contextScopeLabel(osAssistantContext);
  if (target) target.innerHTML = contextSummaryCards(osAssistantContext);
}

async function loadData(kind) {
  try {
    const result = await window.IndiCareData?.load?.(kind);
    return arrayFrom(result);
  } catch {
    return [];
  }
}

function normaliseLiveContext(raw) {
  return {
    children: arrayFrom(raw.children || raw.items || raw.young_people || raw.youngPeople),
    documents: arrayFrom(raw.documents || raw.records || raw.recordings),
    chronology: arrayFrom(raw.chronology || raw.timeline || raw.events),
    safeguarding: arrayFrom(raw.safeguarding || raw.alerts || raw.risks || raw.concerns),
    homes: arrayFrom(raw.homes || raw.user_homes || raw.authorised_homes),
    workforce: arrayFrom(raw.workforce || raw.staff || raw.users),
  };
}

function scopeToSession(context) {
  const selected = new Set((window.IndiCareOperationalSession?.selectedChildren || []).map(String));
  if (!selected.size) return context;
  const children = context.children.filter((child) => selected.has(childKey(child)));
  const ids = new Set(children.map(childKey));
  const names = new Set(children.map((child) => childName(child).toLowerCase()));
  const filterByChild = (item) => !ids.size || ids.has(String(item.young_person_id || item.child_id || item.childId || item.youngPersonId || item.child || '')) || names.has(String(item.childName || item.child_name || item.young_person_name || item.name || '').toLowerCase());
  return {
    ...context,
    children,
    documents: context.documents.filter(filterByChild),
    chronology: context.chronology.filter(filterByChild),
    safeguarding: context.safeguarding.filter(filterByChild),
  };
}

function getActiveDocumentContext() {
  const active = window.IndiCareActiveDocument || null;
  if (active) return active;
  const hero = document.querySelector('.indicare-doc-hero');
  if (!hero) return null;
  return {
    title: hero.querySelector('h1')?.textContent?.trim() || '',
    subtitle: hero.querySelector('p')?.textContent?.trim() || '',
    source: hero.querySelector('.record-kicker')?.textContent?.trim() || 'IndiCare Docs',
    visible_content: document.querySelector('.indicare-doc-paper')?.innerText?.slice(0, 8000) || '',
  };
}

function getActiveViewLabel() {
  return document.querySelector('.sp-nav button.active')?.textContent?.trim() || document.querySelector('.sp-page-head h1')?.textContent?.trim() || 'OS';
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
  const activeDoc = context.active_document?.title ? `<article style="padding:14px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;"><strong style="display:block;">Open document</strong><span style="display:block;color:#1d4ed8;margin-top:4px;line-height:1.4;">${escapeHtml(context.active_document.title)}</span></article>` : '';
  const cards = rows.map(([label, count]) => `<article style="padding:14px;border:1px solid #dbe4f0;border-radius:14px;background:#f8fafc;"><strong style="display:block;">${escapeHtml(label)}</strong><span style="display:block;color:#64748b;margin-top:4px;">${escapeHtml(count)} loaded</span></article>`).join('');
  if (rows.every(([, count]) => Number(count) === 0)) {
    return activeDoc + cards + '<div style="padding:14px;border-radius:14px;background:#fff7ed;color:#c2410c;font-weight:700;">No live backend records returned yet. I can still help with the visible page, but I will not invent missing records.</div>';
  }
  return activeDoc + cards;
}

function contextScopeLabel(context) {
  const home = context.operational_session?.homeName || 'No home selected';
  const yp = context.children.length;
  const doc = context.active_document?.title ? 'open document' : 'no open document';
  return `${home} · ${yp} young people · ${doc}`;
}

function buildContextPayload() {
  const trimItems = (items, limit = 25) => (Array.isArray(items) ? items.slice(0, limit) : []);
  return {
    operational_session: osAssistantContext.operational_session,
    active_route: osAssistantContext.active_route,
    active_view: osAssistantContext.active_view,
    active_document: osAssistantContext.active_document,
    children: trimItems(osAssistantContext.children, 30),
    documents: trimItems(osAssistantContext.documents, 35),
    chronology: trimItems(osAssistantContext.chronology, 35),
    safeguarding: trimItems(osAssistantContext.safeguarding, 35),
    homes: trimItems(osAssistantContext.homes, 10),
    workforce: trimItems(osAssistantContext.workforce, 20),
  };
}

function systemPrefix() {
  return [
    'INDICARE OS ASSISTANT CONTEXT:',
    'You are embedded inside the IndiCare residential children\'s home operating system, not the standalone public assistant.',
    'Use British English and professional residential children\'s home language.',
    'Answer adult staff questions using only the supplied OS context, visible open document content, and conversation history.',
    'Do not invent child details, records, dates, risks, actions or safeguarding decisions.',
    'Clearly separate: Known from records; Professional interpretation; Missing evidence; Recommended staff/manager action.',
    'Do not make final safeguarding, legal, clinical or regulatory decisions. Frame next steps for staff/manager review.',
    'When safeguarding is relevant, include immediate safety, who should be informed, recording quality, chronology link and management oversight.',
    'When records are relevant, use factual, child-centred, non-judgemental wording and identify missing child voice, actions, outcome and follow-up.',
    'For handovers, be concise and practical. For reviews, be structured and evidence-led. For open documents, focus on the visible document and linked context.',
    'If context is missing, say exactly what is missing rather than filling gaps.',
    'Render answer with short headings and bullets where useful. Avoid huge paragraphs.',
  ].join('\n');
}

async function sendAssistantMessage() {
  if (osAssistantBusy) return;
  const input = document.getElementById('ic-assistant-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  setBusy(true);
  appendAssistantBubble('user', text);
  const assistantNode = appendAssistantBubble('assistant', 'Thinking…');

  try {
    await hydrateContext();
    const rawPayload = buildContextPayload();
    const { safePayload, reverseMap } = scrubAssistantPayload({ context: rawPayload }, { redactDates: false, keepMonthYearDates: true, redactNumbers: false });
    lastReverseMap = reverseMap || {};
    const message = `${systemPrefix()}\n\nLIVE_OS_CONTEXT_JSON:\n${JSON.stringify(safePayload.context || safePayload).slice(0, 32000)}\n\nUSER QUESTION:\n${text}`;
    const payload = {
      message,
      response_mode: 'balanced',
      assistant_surface: 'indicare_os',
      assistant_mode: 'children_safeguarding_records',
      context: safePayload.context || safePayload,
      history: osAssistantHistory.slice(-12),
    };
    const response = await fetch('/assistant/general/stream', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...csrfHeaders('POST') },
      body: JSON.stringify(payload),
    });
    if (!response.ok || !response.body) throw new Error(`Assistant failed with status ${response.status}`);
    let output = '';
    await readSse(response, (chunk) => {
      output += chunk;
      setBubbleText(assistantNode, restoreTokens(output, lastReverseMap));
      scrollMessages();
    });
    if (!output.trim()) output = 'I could not generate a response from the backend just now.';
    const finalOutput = restoreTokens(output, lastReverseMap);
    setBubbleText(assistantNode, finalOutput);
    osAssistantHistory.push({ role: 'user', content: text }, { role: 'assistant', content: finalOutput });
    osAssistantHistory = osAssistantHistory.slice(-16);
  } catch (error) {
    setBubbleText(assistantNode, `Sorry, I could not reach the IndiCare assistant backend just now. ${error?.message ? `Technical detail: ${error.message}` : 'Please check the assistant endpoint and try again.'}`);
  } finally {
    setBusy(false);
  }
}

function appendAssistantBubble(role, text) {
  const messages = document.getElementById('ic-assistant-messages');
  const node = document.createElement('article');
  node.style.cssText = `max-width:900px;justify-self:${role === 'user' ? 'end' : 'start'};background:${role === 'user' ? '#075fd1' : '#fff'};color:${role === 'user' ? '#fff' : '#0f172a'};border:1px solid #dbe4f0;border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.06);overflow-wrap:anywhere;`;
  node.innerHTML = `<strong style="display:block;margin-bottom:8px;">${role === 'user' ? 'You' : 'IndiCare AI'}</strong><div data-message-text class="ic-assistant-rendered" style="line-height:1.7;">${renderText(text)}</div>`;
  messages?.appendChild(node);
  scrollMessages();
  return node;
}

function setBubbleText(node, text) {
  const target = node?.querySelector('[data-message-text]');
  if (target) target.innerHTML = renderText(text);
}

function setBusy(isBusy) {
  osAssistantBusy = Boolean(isBusy);
  const send = document.getElementById('ic-send-assistant');
  const status = document.getElementById('ic-assistant-status');
  if (send) {
    send.disabled = osAssistantBusy;
    send.style.opacity = osAssistantBusy ? '.65' : '1';
    send.textContent = osAssistantBusy ? '…' : '↑';
  }
  if (status) status.textContent = osAssistantBusy ? 'IndiCare AI is reading the live OS context…' : 'Answers are grounded in live OS context and should be reviewed by staff/manager.';
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
      if (!parsed.data || ['done', 'meta', 'progress', 'ping'].includes(parsed.event)) continue;
      const text = extractTextFromSseData(parsed.data);
      if (text) onText(text);
    }
  }
  if (buffer.trim()) {
    const parsed = parseSse(buffer);
    const text = extractTextFromSseData(parsed.data);
    if (text) onText(text);
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

function extractTextFromSseData(data) {
  const value = String(data || '');
  if (!value || value === '[DONE]') return '';
  try {
    const parsed = JSON.parse(value);
    return parsed.delta || parsed.text || parsed.content || parsed.message || parsed.answer || '';
  } catch {
    return value;
  }
}

function clearAssistantMessages() {
  osAssistantHistory = [];
  const messages = document.getElementById('ic-assistant-messages');
  if (messages) messages.innerHTML = '<div style="max-width:860px;background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(15,23,42,.06);"><strong style="display:block;font-size:1.1rem;margin-bottom:8px;">Chat cleared</strong><p style="margin:0;color:#475569;line-height:1.7;">Ask a new question about the OS context.</p></div>';
}

function filterPromptShortcuts(event) {
  const query = String(event.target.value || '').toLowerCase();
  document.querySelectorAll('#ic-prompt-shortcuts [data-shortcut-label]').forEach((button) => {
    button.style.display = button.dataset.shortcutLabel.includes(query) ? '' : 'none';
  });
}

function renderText(value) {
  const safe = escapeHtml(value || '')
    .replace(/^### (.*)$/gm, '<h3 style="margin:16px 0 8px;font-size:1.05rem;">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 style="margin:18px 0 8px;font-size:1.16rem;">$1</h2>')
    .replace(/^# (.*)$/gm, '<h2 style="margin:18px 0 8px;font-size:1.18rem;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:#e2e8f0;border-radius:6px;padding:1px 5px;">$1</code>');
  return renderLists(safe).replace(/\n/g, '<br>');
}

function renderLists(html) {
  const lines = String(html).split('\n');
  const out = [];
  let inList = false;
  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s+(.*)$/);
    if (match) {
      if (!inList) {
        out.push('<ul style="margin:8px 0 8px 20px;padding:0;">');
        inList = true;
      }
      out.push(`<li style="margin:4px 0;">${match[1]}</li>`);
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(line);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function csrfHeaders(method) {
  const headers = {};
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase())) return headers;
  const match = document.cookie.match(/(?:^|;\s*)(?:__Host-indicare_csrf|indicare_csrf)=([^;]+)/);
  if (match) headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
  return headers;
}

function childKey(child) { return String(child.id || child.young_person_id || child.child_id || child.youngPersonId || childName(child)); }
function childName(child) { return child.name || child.full_name || child.preferred_name || child.young_person_name || [child.first_name, child.last_name].filter(Boolean).join(' ') || 'Young person'; }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }

ensureAssistantModal();
