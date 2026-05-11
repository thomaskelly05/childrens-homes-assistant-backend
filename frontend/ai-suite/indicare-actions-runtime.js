(() => {
  const STORE = 'ic_operational_actions';
  const $ = (id) => document.getElementById(id);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  const state = {
    actions: JSON.parse(localStorage.getItem(STORE) || '[]'),
  };

  function project() {
    return localStorage.getItem('ic_active_project') || 'general';
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state.actions.slice(0, 250)));
  }

  function addAction(action) {
    const item = {
      id: `act-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: action.title || action.text || 'Follow-up action',
      source: action.source || 'IndiCare',
      project: action.project || project(),
      owner: action.owner || '',
      due: action.due || '',
      status: action.status || 'open',
      created_at: new Date().toISOString(),
    };
    state.actions.unshift(item);
    save();
    render();
    window.IndiCareMemory?.remember?.('actions', item);
    return item;
  }

  function completeAction(id) {
    const item = state.actions.find((a) => a.id === id);
    if (!item) return;
    item.status = item.status === 'done' ? 'open' : 'done';
    item.completed_at = item.status === 'done' ? new Date().toISOString() : null;
    save();
    render();
  }

  function deleteAction(id) {
    state.actions = state.actions.filter((a) => a.id !== id);
    save();
    render();
  }

  function ensurePanel() {
    if ($('icActionsPanel')) return;
    const rail = document.querySelector('#connectScreen .right-rail, #connectScreen aside, .right-rail, aside');
    if (!rail) return;
    const panel = document.createElement('section');
    panel.id = 'icActionsPanel';
    panel.innerHTML = `
      <hr>
      <h3>Actions</h3>
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <input id="icActionInput" placeholder="Add action..." style="min-width:0;flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:8px">
        <button id="icAddAction" class="smallbtn small">Add</button>
      </div>
      <button id="icExtractActions" class="smallbtn small">Extract from current workspace</button>
      <div id="icActionsList" style="margin-top:10px"></div>
    `;
    rail.appendChild(panel);
    $('icAddAction')?.addEventListener('click', () => {
      const input = $('icActionInput');
      if (!input || !input.value.trim()) return;
      addAction({ title: input.value.trim(), source: 'manual' });
      input.value = '';
    });
    $('icExtractActions')?.addEventListener('click', extractFromWorkspace);
  }

  function render() {
    ensurePanel();
    const list = $('icActionsList');
    if (!list) return;
    const current = state.actions.filter((a) => a.project === project()).slice(0, 20);
    list.innerHTML = current.length ? current.map((a) => `
      <div class="item" style="padding:10px;margin-bottom:8px;opacity:${a.status === 'done' ? '.58' : '1'}">
        <div style="display:flex;gap:8px;align-items:flex-start">
          <input type="checkbox" data-action-done="${esc(a.id)}" ${a.status === 'done' ? 'checked' : ''}>
          <div style="flex:1;min-width:0">
            <strong style="text-decoration:${a.status === 'done' ? 'line-through' : 'none'}">${esc(a.title)}</strong>
            <div style="font-size:12px;color:#64748b">${esc(a.source)} ${a.due ? '· Due ' + esc(a.due) : ''}</div>
          </div>
          <button data-action-delete="${esc(a.id)}" style="border:0;background:transparent;cursor:pointer;color:#64748b">×</button>
        </div>
      </div>`).join('') : '<div class="item">No actions yet.</div>';

    qsa('[data-action-done]', list).forEach((box) => box.addEventListener('change', () => completeAction(box.dataset.actionDone)));
    qsa('[data-action-delete]', list).forEach((btn) => btn.addEventListener('click', () => deleteAction(btn.dataset.actionDelete)));
  }

  function workspaceText() {
    return [
      $('connectMessages')?.innerText,
      $('docsOutput')?.innerText,
      $('docEditor')?.innerText,
      $('notesOutput')?.innerText,
      $('transcript')?.innerText,
      $('messages')?.innerText,
      $('icIntelligenceFeed')?.innerText,
    ].filter(Boolean).join('\n\n').slice(0, 12000);
  }

  async function extractFromWorkspace() {
    const text = workspaceText();
    if (!text) {
      addAction({ title: 'Review workspace and add follow-up actions', source: 'empty workspace' });
      return;
    }
    const target = $('icActionsList');
    if (target) target.insertAdjacentHTML('afterbegin', '<div class="item">Extracting actions...</div>');
    try {
      const res = await fetch('/assistant/general/stream', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistant_surface: 'ai-suite',
          assistant_mode: 'intelligence',
          response_mode: 'balanced',
          project_id: project(),
          history: [],
          message: `Extract a concise operational action list from this workspace. Return each action on a new line starting with ACTION:. Include owner or due date only if stated.\n\n${text}`,
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (part.startsWith('event:')) continue;
          part.split('\n').forEach((line) => {
            if (!line.startsWith('data:')) return;
            const token = line.slice(5).trim();
            if (!token || token === '[DONE]') return;
            answer += token + '\n';
          });
        }
      }
      const lines = answer.split('\n').map((l) => l.replace(/^[-*\s]*(ACTION:)?\s*/i, '').trim()).filter(Boolean).slice(0, 12);
      lines.forEach((line) => addAction({ title: line, source: 'AI extraction' }));
      render();
    } catch (error) {
      addAction({ title: 'Manually review workspace for actions', source: `AI extraction failed: ${error.message}` });
    }
  }

  function interceptNotesActions() {
    if (window.__icActionsIntercepted) return;
    window.__icActionsIntercepted = true;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url] = args;
      const response = await originalFetch(...args);
      try {
        if (typeof url === 'string' && url.includes('/ai-notes/extract-actions')) {
          const clone = response.clone();
          clone.json().then((data) => {
            const actions = Array.isArray(data.actions) ? data.actions : [];
            actions.forEach((a) => addAction({ title: a.title || a.action || String(a), owner: a.owner, due: a.due, source: 'I-Notes' }));
          }).catch(() => {});
        }
      } catch (_) {}
      return response;
    };
  }

  function wire() {
    ensurePanel();
    render();
    interceptNotesActions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 800);
  setTimeout(wire, 1600);
  window.IndiCareActions = { addAction, completeAction, deleteAction, extractFromWorkspace, render };
})();
