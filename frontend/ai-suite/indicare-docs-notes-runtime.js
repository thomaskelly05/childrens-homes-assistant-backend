(() => {
  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));

  const state = {
    docSaveTimer: null,
    noteSaveTimer: null,
    activeDocId: localStorage.getItem('ic_active_doc') || 'default',
    activeNoteId: localStorage.getItem('ic_active_note') || 'default',
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

  function projectId() {
    return localStorage.getItem('ic_active_project') || 'general';
  }

  function setText(id, text) {
    const node = $(id);
    if (node) node.textContent = text;
  }

  async function streamAi(app, message, targetId) {
    const target = $(targetId);
    if (target) target.textContent = 'Thinking...';
    let answer = '';
    const res = await fetch('/assistant/general/stream', {
      method: 'POST',
      credentials: 'include',
      headers: headers(),
      body: JSON.stringify({
        message,
        response_mode: 'balanced',
        history: [],
        conversation_id: `${app}-${projectId()}`,
        assistant_surface: 'ai-suite',
        assistant_mode: app,
        project_id: projectId(),
      }),
    });
    if (!res.ok || !res.body) throw new Error(`AI request failed ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';
      for (const chunk of chunks) {
        if (chunk.startsWith('event:')) continue;
        chunk.split('\n').forEach((line) => {
          if (!line.startsWith('data:')) return;
          const token = line.slice(5).trimStart();
          if (!token || token === '[DONE]') return;
          answer += `${token}\n`;
          if (target) target.textContent = answer;
        });
      }
    }
    return answer;
  }

  function docKey(id = state.activeDocId) {
    return `ic_doc_${projectId()}_${id}`;
  }

  function noteKey(id = state.activeNoteId) {
    return `ic_note_${projectId()}_${id}`;
  }

  function saveDoc() {
    const editor = $('docEditor');
    if (!editor) return;
    localStorage.setItem(docKey(), editor.innerHTML);
    setText('docsOutput', 'Saved to this project.');
  }

  function loadDoc() {
    const editor = $('docEditor');
    if (!editor) return;
    const saved = localStorage.getItem(docKey());
    if (saved) editor.innerHTML = saved;
  }

  function saveNote() {
    const transcript = $('transcript');
    if (!transcript) return;
    localStorage.setItem(noteKey(), transcript.innerHTML);
    setText('notesOutput', 'Saved to this project.');
  }

  function loadNote() {
    const transcript = $('transcript');
    if (!transcript) return;
    const saved = localStorage.getItem(noteKey());
    if (saved) transcript.innerHTML = saved;
  }

  async function docAction(prompt) {
    const editor = $('docEditor');
    if (!editor) return;
    try {
      const selected = String(window.getSelection?.().toString() || '').trim();
      const source = selected || editor.innerText;
      const answer = await streamAi('docs', `${prompt}\n\n${source}`, 'docsOutput');
      if (/rewrite|improve/i.test(prompt) && answer) {
        editor.innerHTML = `<h1>AI revised document</h1><p>${esc(answer).replace(/\n+/g, '</p><p>')}</p>`;
        saveDoc();
      }
    } catch (error) {
      setText('docsOutput', `Docs AI failed. ${error.message}`);
    }
  }

  async function generateNote() {
    const transcript = $('transcript');
    if (!transcript) return;
    const form = new FormData();
    form.append('transcript', transcript.innerText);
    form.append('project_id', projectId());
    try {
      const data = await fetch('/ai-notes/generate', { method: 'POST', credentials: 'include', body: form }).then((res) => res.json());
      setText('notesOutput', data.note || data.summary || JSON.stringify(data, null, 2));
    } catch (_) {
      try {
        await streamAi('notes', `Generate a professional I-Notes record from this transcript:\n\n${transcript.innerText}`, 'notesOutput');
      } catch (error) {
        setText('notesOutput', `I-Notes failed. ${error.message}`);
      }
    }
  }

  async function editNote(mode) {
    const transcript = $('transcript');
    if (!transcript) return;
    const form = new FormData();
    form.append('text', transcript.innerText);
    form.append('mode', mode);
    form.append('project_id', projectId());
    try {
      const data = await fetch('/ai-notes/edit', { method: 'POST', credentials: 'include', body: form }).then((res) => res.json());
      setText('notesOutput', data.text || data.note || JSON.stringify(data, null, 2));
    } catch (_) {
      await streamAi('notes', `Transform this transcript into ${mode}:\n\n${transcript.innerText}`, 'notesOutput');
    }
  }

  async function extractActions() {
    const transcript = $('transcript');
    if (!transcript) return;
    const form = new FormData();
    form.append('text', transcript.innerText);
    form.append('project_id', projectId());
    try {
      const data = await fetch('/ai-notes/extract-actions', { method: 'POST', credentials: 'include', body: form }).then((res) => res.json());
      setText('notesOutput', JSON.stringify(data.actions || data, null, 2));
    } catch (_) {
      await streamAi('notes', `Extract actions, owners, risks and review dates from this transcript:\n\n${transcript.innerText}`, 'notesOutput');
    }
  }

  function wireDocs() {
    const editor = $('docEditor');
    if (!editor || editor.dataset.docsRuntimeWired) return;
    editor.dataset.docsRuntimeWired = '1';
    loadDoc();
    editor.addEventListener('input', () => {
      clearTimeout(state.docSaveTimer);
      state.docSaveTimer = setTimeout(saveDoc, 700);
    });
    qsa('[data-doc-ai]').forEach((button) => {
      if (button.dataset.docsRuntimeWired) return;
      button.dataset.docsRuntimeWired = '1';
      button.addEventListener('click', () => docAction(button.dataset.docAi || button.textContent || 'Improve this document:'));
    });
    const newDoc = $('newDoc');
    if (newDoc && !newDoc.dataset.docsRuntimeWired) {
      newDoc.dataset.docsRuntimeWired = '1';
      newDoc.addEventListener('click', () => {
        state.activeDocId = `doc-${Date.now()}`;
        localStorage.setItem('ic_active_doc', state.activeDocId);
        editor.innerHTML = '<h1>Untitled document</h1><p>Start writing...</p>';
        saveDoc();
      });
    }
  }

  function wireNotes() {
    const transcript = $('transcript');
    if (!transcript || transcript.dataset.notesRuntimeWired) return;
    transcript.dataset.notesRuntimeWired = '1';
    loadNote();
    transcript.addEventListener('input', () => {
      clearTimeout(state.noteSaveTimer);
      state.noteSaveTimer = setTimeout(saveNote, 700);
    });
    qsa('[data-note-generate]').forEach((button) => {
      if (button.dataset.notesRuntimeWired) return;
      button.dataset.notesRuntimeWired = '1';
      button.addEventListener('click', generateNote);
    });
    qsa('[data-note-edit]').forEach((button) => {
      if (button.dataset.notesRuntimeWired) return;
      button.dataset.notesRuntimeWired = '1';
      button.addEventListener('click', () => editNote(button.dataset.noteEdit || 'professional note'));
    });
    qsa('[data-note-actions]').forEach((button) => {
      if (button.dataset.notesRuntimeWired) return;
      button.dataset.notesRuntimeWired = '1';
      button.addEventListener('click', extractActions);
    });
    const saveButton = $('saveNote');
    if (saveButton && !saveButton.dataset.notesRuntimeWired) {
      saveButton.dataset.notesRuntimeWired = '1';
      saveButton.addEventListener('click', saveNote);
    }
  }

  function wireUploadTranscription() {
    const input = $('fileInput');
    if (!input || input.dataset.notesUploadRuntimeWired) return;
    input.dataset.notesUploadRuntimeWired = '1';
    input.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file || !file.type || !file.type.startsWith('audio/') || !$('transcript')) return;
      const form = new FormData();
      form.append('file', file);
      form.append('project_id', projectId());
      setText('notesOutput', 'Transcribing audio...');
      try {
        const data = await fetch('/ai-notes/transcribe', { method: 'POST', credentials: 'include', body: form }).then((res) => res.json());
        $('transcript').innerText += `\n${data.transcript || data.text || ''}`;
        saveNote();
        setText('notesOutput', 'Transcription added.');
      } catch (error) {
        setText('notesOutput', `Transcription failed. ${error.message}`);
      }
    });
  }

  function wire() {
    wireDocs();
    wireNotes();
    wireUploadTranscription();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  setTimeout(wire, 500);
  setTimeout(wire, 1500);
  window.IndiCareDocsNotesRuntime = { saveDoc, loadDoc, saveNote, loadNote, generateNote, extractActions };
})();
