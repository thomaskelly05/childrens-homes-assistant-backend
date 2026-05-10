(() => {
  const STYLE_ID = 'document-intelligence-upload-style';
  const FLAG = '__indicareDocumentIntelligenceUpload';

  const state = {
    busy: false,
    lastResult: null,
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .doc-intel-bar{border:1px solid #dbe7f3;background:#f8fafc;border-radius:18px;padding:12px;margin:10px 0;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.doc-intel-bar strong{color:#0f172a}.doc-intel-bar small{display:block;color:#64748b}.doc-intel-btn{border:0;border-radius:14px;background:#155eef;color:#fff;font-weight:950;padding:10px 13px}.doc-intel-btn.secondary{background:#eef4fb;color:#334155}.doc-intel-btn:disabled{opacity:.55}.doc-intel-result{position:fixed;right:22px;bottom:96px;z-index:145;width:min(460px,calc(100vw - 44px));background:#fff;border:1px solid #dbe7f3;border-radius:22px;box-shadow:0 24px 70px rgba(15,23,42,.22);padding:14px;display:grid;gap:9px}.doc-intel-result h4{margin:0;color:#0f172a}.doc-intel-result p{margin:0;color:#475569;line-height:1.4}.doc-intel-pill{display:inline-flex;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:900;padding:4px 8px;margin:2px}.doc-intel-pill.good{background:#dcfce7;color:#166534}.doc-intel-pill.warn{background:#fef3c7;color:#92400e}.doc-intel-pill.safe{background:#fee2e2;color:#991b1b}.doc-intel-row{display:flex;gap:8px;flex-wrap:wrap}.doc-intel-textbox{width:100%;min-height:120px;border:1px solid #cbd5e1;border-radius:14px;padding:10px;font:inherit}.doc-intel-modal{position:fixed;inset:auto 22px 96px auto;z-index:146;width:min(560px,calc(100vw - 44px));background:#fff;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 24px 70px rgba(15,23,42,.24);padding:16px;display:none}.doc-intel-modal.open{display:grid;gap:10px}.doc-intel-modal h3{margin:0}.doc-intel-modal label{display:grid;gap:5px;font-size:12px;font-weight:900;color:#334155}.doc-intel-modal input,.doc-intel-modal textarea{border:1px solid #cbd5e1;border-radius:14px;padding:10px;font:inherit}.doc-intel-close{border:0;border-radius:999px;background:#e2e8f0;width:32px;height:32px;font-weight:950}.doc-intel-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
    `;
    document.head.appendChild(style);
  }

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function qs() { return new URLSearchParams(location.search); }
  function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
  function userId() { return numberOrNull(qs().get('user_id') || window.currentUser?.id) || 1; }
  function homeId() { return numberOrNull(window.state?.home_id || qs().get('home_id')) || 1; }
  function providerId() { return numberOrNull(window.state?.provider_id || qs().get('provider_id')); }
  function youngPersonId() {
    const selected = window.state?.selectedChild?.profile || {};
    return numberOrNull(selected.young_person_id || selected.id || qs().get('young_person_id') || qs().get('child_id'));
  }
  function headers() { return { 'Content-Type': 'application/json', 'X-User-Id': String(userId()), 'X-Role': qs().get('role') || 'manager' }; }

  function extractAttachmentContext(el) {
    const host = el?.closest?.('[data-attachment-id],[data-document-id],[data-record-id],[data-file-name]') || document.body;
    return {
      attachment_id: host.dataset?.attachmentId || qs().get('attachment_id') || null,
      source_record_id: host.dataset?.recordId || qs().get('record_id') || null,
      file_name: host.dataset?.fileName || document.querySelector('[data-file-name]')?.dataset.fileName || null,
      mime_type: host.dataset?.mimeType || null,
      home_id: numberOrNull(host.dataset?.homeId) || homeId(),
      provider_id: numberOrNull(host.dataset?.providerId) || providerId(),
      young_person_id: numberOrNull(host.dataset?.youngPersonId) || youngPersonId(),
      staff_id: numberOrNull(host.dataset?.staffId || qs().get('staff_id')),
      adult_id: numberOrNull(host.dataset?.adultId || qs().get('adult_id')),
    };
  }

  function ensureGlobalBar() {
    if (document.querySelector('[data-doc-intel-global]')) return;
    const target = document.querySelector('[data-os-panel="documents"]') || document.querySelector('[data-os-panel="education"]') || document.querySelector('[data-os-panel="care"]') || document.querySelector('[data-os-panel="placement"]') || document.querySelector('main');
    if (!target) return;
    const bar = document.createElement('div');
    bar.className = 'doc-intel-bar';
    bar.dataset.docIntelGlobal = 'true';
    bar.innerHTML = `<div><strong>Document Intelligence</strong><small>Analyse uploads, detect review/expiry dates and route into the right OS area.</small></div><div class="doc-intel-row"><button class="doc-intel-btn" data-doc-intel-open type="button">Analyse document</button><button class="doc-intel-btn secondary" data-doc-intel-reminders type="button">Review reminders</button></div>`;
    target.prepend(bar);
    bar.querySelector('[data-doc-intel-open]')?.addEventListener('click', () => openModal(extractAttachmentContext(bar)));
    bar.querySelector('[data-doc-intel-reminders]')?.addEventListener('click', loadReminders);
  }

  function enhanceAttachmentCards() {
    document.querySelectorAll('[data-attachment-id]:not([data-doc-intel-enhanced])').forEach((card) => {
      card.dataset.docIntelEnhanced = 'true';
      const button = document.createElement('button');
      button.className = 'doc-intel-btn secondary';
      button.type = 'button';
      button.textContent = 'Analyse with IndiCare';
      button.addEventListener('click', () => analyse(extractAttachmentContext(card)));
      card.appendChild(button);
    });
  }

  function ensureModal() {
    let modal = document.querySelector('[data-doc-intel-modal]');
    if (modal) return modal;
    modal = document.createElement('section');
    modal.className = 'doc-intel-modal';
    modal.dataset.docIntelModal = 'true';
    modal.innerHTML = `
      <div class="doc-intel-head"><h3>Analyse document</h3><button class="doc-intel-close" type="button" data-doc-intel-close>×</button></div>
      <p style="margin:0;color:#64748b">Paste extracted text or provide an attachment ID. IndiCare will classify, route and create review reminders.</p>
      <form data-doc-intel-form>
        <label>Attachment ID<input name="attachment_id" placeholder="Optional attachment UUID" /></label>
        <label>File name<input name="file_name" placeholder="e.g. EHCP.pdf" /></label>
        <label>Extracted text<textarea class="doc-intel-textbox" name="source_text" placeholder="Paste document text here if OCR is not available yet..."></textarea></label>
        <div class="doc-intel-row"><button class="doc-intel-btn" type="submit">Analyse and route</button><button class="doc-intel-btn secondary" type="button" data-doc-intel-close>Cancel</button></div>
      </form>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-doc-intel-close]').forEach((btn) => btn.addEventListener('click', closeModal));
    modal.querySelector('[data-doc-intel-form]')?.addEventListener('submit', submitModal);
    return modal;
  }

  function openModal(context = {}) {
    const modal = ensureModal();
    modal.classList.add('open');
    modal.dataset.context = JSON.stringify(context || {});
    modal.querySelector('[name="attachment_id"]').value = context.attachment_id || '';
    modal.querySelector('[name="file_name"]').value = context.file_name || '';
  }

  function closeModal() {
    document.querySelector('[data-doc-intel-modal]')?.classList.remove('open');
  }

  async function submitModal(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const modal = document.querySelector('[data-doc-intel-modal]');
    let context = {};
    try { context = JSON.parse(modal.dataset.context || '{}'); } catch {}
    await analyse({
      ...context,
      attachment_id: form.attachment_id.value.trim() || context.attachment_id || null,
      file_name: form.file_name.value.trim() || context.file_name || null,
      source_text: form.source_text.value.trim() || null,
    });
    closeModal();
  }

  async function analyse(context = {}) {
    if (state.busy) return;
    state.busy = true;
    showResult({ title: 'Analysing document…', summary: 'IndiCare is classifying the document, looking for expiry/review dates and preparing routes.' });
    try {
      const payload = {
        ...context,
        home_id: context.home_id || homeId(),
        provider_id: context.provider_id || providerId(),
        young_person_id: context.young_person_id || youngPersonId(),
        created_by: userId(),
        create_reminders: true,
        create_tasks: true,
        route_now: true,
        create_child_document: true,
      };
      if (!payload.attachment_id && !payload.source_text) throw new Error('Provide an attachment ID or paste extracted document text.');
      const res = await fetch('/api/document-intelligence/analyse', { method: 'POST', credentials: 'include', headers: headers(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      state.lastResult = data;
      showResultFromData(data);
      document.dispatchEvent(new CustomEvent('indicare:document-intelligence-complete', { detail: data }));
    } catch (error) {
      showResult({ title: 'Document analysis failed', summary: error.message, error: true });
    } finally {
      state.busy = false;
    }
  }

  function showResultFromData(data) {
    const job = data.job || {};
    const category = job.detected_category || 'document';
    const childDoc = data.child_document?.document;
    const reminders = data.reminders || [];
    const route = job.metadata?.route_target || 'documents';
    showResult({
      title: `${pretty(category)} identified`,
      summary: `${job.detected_title || job.file_name || 'Document'} routed to ${pretty(route)}.${childDoc ? ' Child document created.' : ''}`,
      pills: [category, route, `${reminders.length} reminders`, childDoc ? 'child record created' : null].filter(Boolean),
      data,
    });
  }

  function pretty(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

  function showResult({ title, summary, pills = [], error = false, data = null }) {
    document.querySelector('[data-doc-intel-result]')?.remove();
    const card = document.createElement('div');
    card.className = 'doc-intel-result';
    card.dataset.docIntelResult = 'true';
    card.innerHTML = `<h4>${esc(title)}</h4><p>${esc(summary || '')}</p><div>${pills.map((p) => `<span class="doc-intel-pill ${error ? 'safe' : 'good'}">${esc(p)}</span>`).join('')}</div><div class="doc-intel-row"><button class="doc-intel-btn secondary" data-close-result type="button">Dismiss</button><button class="doc-intel-btn" data-open-assistant type="button">Ask assistant</button></div>`;
    document.body.appendChild(card);
    card.querySelector('[data-close-result]')?.addEventListener('click', () => card.remove());
    card.querySelector('[data-open-assistant]')?.addEventListener('click', () => {
      window.IndiCareOSAssistant?.ask('Summarise the document intelligence result and explain what has been routed, what reminders were created, and what actions staff should take next.');
    });
    setTimeout(() => card.remove(), error ? 16000 : 12000);
  }

  async function loadReminders() {
    showResult({ title: 'Loading document reminders…', summary: 'Checking documents due for review or expiry.' });
    try {
      const params = new URLSearchParams({ home_id: String(homeId()), due_within_days: '60' });
      if (youngPersonId()) params.set('young_person_id', String(youngPersonId()));
      const res = await fetch(`/api/document-intelligence/reminders?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const count = (data.reminders || []).length;
      showResult({ title: `${count} document reminder${count === 1 ? '' : 's'}`, summary: count ? 'Review the reminders in tasks/oversight. The OS has already created linked tasks where enabled.' : 'No document reminders due in this period.', pills: [`${count} due`] });
    } catch (error) {
      showResult({ title: 'Could not load reminders', summary: error.message, error: true });
    }
  }

  function patchFetchForUploadDetection() {
    if (window.__indicareDocIntelFetchPatched) return;
    window.__indicareDocIntelFetchPatched = true;
    const originalFetch = window.fetch;
    window.fetch = async function patchedFetch(...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url = String(args[0]?.url || args[0] || '');
        const method = String(args[1]?.method || 'GET').toUpperCase();
        if (method !== 'POST' || !/upload|attachment|document/i.test(url)) return response;
        const clone = response.clone();
        const data = await clone.json().catch(() => null);
        const attachmentId = data?.attachment_id || data?.attachment?.id || data?.id && /attachment/i.test(url) ? data?.id : null;
        if (attachmentId) {
          setTimeout(() => analyse({ attachment_id: attachmentId, home_id: homeId(), provider_id: providerId(), young_person_id: youngPersonId() }), 300);
        }
      } catch {}
      return response;
    };
  }

  function boot() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    injectStyles();
    ensureModal();
    ensureGlobalBar();
    enhanceAttachmentCards();
    patchFetchForUploadDetection();
    const observer = new MutationObserver(() => {
      ensureGlobalBar();
      enhanceAttachmentCards();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.IndiCareDocumentIntelligence = { analyse, open: openModal, reminders: loadReminders, state };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
