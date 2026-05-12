(() => {
  const FLAG = '__indicareUniversalRecordWorkspaceModal';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function textOf(record) {
    return JSON.stringify(record || {}).toLowerCase();
  }

  function titleOf(record) {
    return record?.title || record?.event_title || record?.record_type || record?.pattern_type || record?.domain || 'Care record';
  }

  function typeOf(record) {
    return String(record?.record_type || record?.source_type || record?.pattern_type || record?.domain || record?.status || 'record').replaceAll('_', ' ');
  }

  function dateOf(record) {
    return record?.occurred_at || record?.event_at || record?.created_at || record?.detected_at || record?.record_date || record?.updated_at || '';
  }

  function summaryOf(record) {
    return record?.narrative || record?.summary || record?.event_summary || record?.recommended_action || record?.leadership_summary || record?.follow_up_summary || 'No narrative is available for this record yet.';
  }

  function idOf(record) {
    return String(record?.id || record?.feed_id || record?.timeline_id || record?.command_item_id || record?.source_id || `${titleOf(record)}-${dateOf(record)}`);
  }

  function collectRecords() {
    const stateRecords = window.__IndiCareOSLiveRecords || [];
    const cards = Array.from(document.querySelectorAll('[data-record-id]')).map((card) => ({
      id: card.dataset.recordId,
      title: card.querySelector('h4')?.textContent || 'Care record',
      summary: card.querySelector('p')?.textContent || '',
      record_type: card.querySelector('.mini-tag')?.textContent || 'record',
      status: card.querySelector('.ic365-record-head strong')?.textContent || 'recorded',
      occurred_at: card.querySelector('.ic365-record-head small')?.textContent || ''
    }));
    return [...stateRecords, ...cards];
  }

  function ensureModal() {
    if (document.getElementById('ic365-record-modal')) return;
    const modal = document.createElement('section');
    modal.id = 'ic365-record-modal';
    modal.className = 'ic365-record-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="ic365-record-modal-backdrop" data-close-record-modal></div>
      <article class="ic365-record-modal-dialog" role="dialog" aria-modal="true" aria-label="Record workspace">
        <header class="ic365-record-modal-header">
          <div>
            <p class="eyebrow">Record workspace</p>
            <h2 id="ic365-record-modal-title">Care record</h2>
            <div id="ic365-record-modal-meta" class="ic365-record-modal-meta"></div>
          </div>
          <div class="hero-actions">
            <button type="button" class="ic365-button" data-record-modal-mode="review">Review</button>
            <button type="button" class="ic365-button" data-record-modal-mode="edit">Edit / continue</button>
            <button type="button" class="ic365-button" data-record-modal-mode="documents">Documents</button>
            <button type="button" class="ic365-button primary" data-close-record-modal>Close</button>
          </div>
        </header>
        <div class="ic365-record-modal-body">
          <main id="ic365-record-modal-main" class="ic365-record-modal-main"></main>
          <aside id="ic365-record-modal-side" class="ic365-record-modal-side"></aside>
        </div>
      </article>`;
    document.body.appendChild(modal);
  }

  function relatedRecords(record, all) {
    const source = textOf(record);
    const keywords = ['incident', 'safeguard', 'risk', 'daily', 'education', 'health', 'medication', 'contact', 'document', 'review', 'handover'];
    const hits = keywords.filter((keyword) => source.includes(keyword));
    return all.filter((item) => idOf(item) !== idOf(record) && hits.some((keyword) => textOf(item).includes(keyword))).slice(0, 6);
  }

  function renderRecord(record, all, mode = 'overview') {
    const modal = document.getElementById('ic365-record-modal');
    if (!modal) return;
    const title = document.getElementById('ic365-record-modal-title');
    const meta = document.getElementById('ic365-record-modal-meta');
    const main = document.getElementById('ic365-record-modal-main');
    const side = document.getElementById('ic365-record-modal-side');
    const related = relatedRecords(record, all);
    const voice = record.child_voice || record.young_person_voice || '';
    const status = record.status || record.feed_state || record.timeline_state || record.priority || 'recorded';

    if (title) title.textContent = titleOf(record);
    if (meta) meta.innerHTML = `<span>${esc(typeOf(record))}</span><span>${esc(dateOf(record))}</span><span>${esc(status)}</span>`;

    if (main) main.innerHTML = `
      <section class="ic365-record-workspace-card">
        <h3>Narrative</h3>
        <p>${esc(summaryOf(record))}</p>
      </section>
      <section class="ic365-record-workspace-card">
        <h3>Child voice</h3>
        <p>${voice ? esc(voice) : 'No child voice is attached to this record yet.'}</p>
      </section>
      <section class="ic365-record-workspace-card ${mode === 'edit' ? 'active' : ''}">
        <h3>Continue / edit record</h3>
        <label>Continuation note<textarea placeholder="Continue this chronology entry, add context or correct the record..."></textarea></label>
        <label>Outcome / next step<input placeholder="What needs to happen next?" /></label>
        <div class="hero-actions"><button class="ic365-button primary">Save continuation</button><button class="ic365-button">Save draft</button></div>
      </section>
      <section class="ic365-record-workspace-card ${mode === 'review' ? 'active' : ''}">
        <h3>Manager review</h3>
        <label>Review comment<textarea placeholder="Manager comment, return reason, sign-off note or escalation rationale..."></textarea></label>
        <div class="hero-actions"><button class="ic365-button primary">Sign off</button><button class="ic365-button">Return</button><button class="ic365-button">Escalate</button></div>
      </section>`;

    if (side) side.innerHTML = `
      <section class="ic365-record-workspace-card">
        <h3>Linked documents</h3>
        <div class="ic365-action-list"><button><strong>Attach document</strong><span>Care plan, risk assessment, evidence or report</span></button><button><strong>Inspection evidence</strong><span>Mark this record as evidence-ready</span></button></div>
      </section>
      <section class="ic365-record-workspace-card">
        <h3>Related chronology</h3>
        <div class="ic365-action-list">${related.length ? related.map((item) => `<button type="button" data-open-record-id="${esc(idOf(item))}"><strong>${esc(titleOf(item))}</strong><span>${esc(String(summaryOf(item)).slice(0, 120))}</span></button>`).join('') : '<div class="ic365-empty-state">No related records found yet.</div>'}</div>
      </section>
      <section class="ic365-record-workspace-card">
        <h3>Audit trail</h3>
        <div class="ic365-continuity-item"><strong>Record opened</strong><span>This full-page workspace is connected to the chronology card and ready for persistence wiring.</span></div>
      </section>`;
  }

  function openById(id, mode = 'overview') {
    ensureModal();
    const all = collectRecords();
    const record = all.find((item) => idOf(item) === id || item.id === id) || all.find((item) => String(idOf(item)).includes(id)) || { id, title: 'Care record', summary: 'This record could not be resolved from the current feed yet.' };
    renderRecord(record, all, mode);
    const modal = document.getElementById('ic365-record-modal');
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ic365-record-modal-open');
  }

  function close() {
    const modal = document.getElementById('ic365-record-modal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ic365-record-modal-open');
  }

  function injectStyles() {
    if (document.getElementById('ic365-record-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'ic365-record-modal-styles';
    style.textContent = `
      .ic365-record-modal{position:fixed;inset:0;z-index:999997;display:none}.ic365-record-modal.open{display:block}.ic365-record-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.46);backdrop-filter:blur(10px)}.ic365-record-modal-dialog{position:absolute;inset:26px;border-radius:28px;background:rgba(255,255,255,.97);box-shadow:0 32px 100px rgba(15,23,42,.28);border:1px solid rgba(15,23,42,.10);display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden}.ic365-record-modal-header{padding:20px 22px;border-bottom:1px solid rgba(15,23,42,.08);display:flex;justify-content:space-between;gap:16px;align-items:flex-start;background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(248,250,252,.94))}.ic365-record-modal-header h2{margin:0;font-size:28px;letter-spacing:-.04em;color:#10201f}.ic365-record-modal-meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.ic365-record-modal-meta span{border-radius:999px;background:rgba(37,99,235,.09);color:#1d4ed8;padding:5px 10px;font-size:12px;font-weight:800;text-transform:capitalize}.ic365-record-modal-body{min-height:0;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(320px,.7fr);gap:16px;padding:16px;overflow:auto;background:#f5f7f6}.ic365-record-modal-main,.ic365-record-modal-side{display:grid;gap:14px;align-content:start}.ic365-record-workspace-card{border-radius:20px;background:#fff;border:1px solid rgba(15,23,42,.08);box-shadow:0 12px 30px rgba(15,23,42,.06);padding:18px}.ic365-record-workspace-card.active{border-color:rgba(37,99,235,.25);box-shadow:0 16px 36px rgba(37,99,235,.12)}.ic365-record-workspace-card h3{margin:0 0 10px;font-size:16px;font-weight:900;color:#10201f}.ic365-record-workspace-card p{margin:0;color:#475569;line-height:1.55}.ic365-record-workspace-card label{display:grid;gap:8px;font-size:12px;font-weight:800;color:#334155;margin-bottom:12px}.ic365-record-workspace-card textarea,.ic365-record-workspace-card input{width:100%;border:1px solid rgba(15,23,42,.12);background:#f8fafc;border-radius:14px;padding:12px}.ic365-record-workspace-card textarea{min-height:130px}.ic365-record-card{cursor:pointer}@media(max-width:900px){.ic365-record-modal-dialog{inset:0;border-radius:0}.ic365-record-modal-body{grid-template-columns:1fr}.ic365-record-modal-header{display:grid}}`;
    document.head.appendChild(style);
  }

  function bind() {
    document.addEventListener('click', (event) => {
      const closeButton = event.target.closest('[data-close-record-modal]');
      if (closeButton) { close(); return; }

      const modeButton = event.target.closest('[data-record-modal-mode]');
      if (modeButton) {
        const current = document.querySelector('.ic365-record-modal.open [data-current-record-id]')?.dataset.currentRecordId;
        if (current) openById(current, modeButton.dataset.recordModalMode || 'overview');
        return;
      }

      const related = event.target.closest('[data-open-record-id]');
      if (related) { openById(related.dataset.openRecordId); return; }

      const action = event.target.closest('[data-review-record],[data-link-document],[data-add-comment],[data-continue-record]');
      if (action) {
        const id = action.dataset.reviewRecord || action.dataset.linkDocument || action.dataset.addComment || action.dataset.continueRecord;
        openById(id, action.textContent.trim().toLowerCase());
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const card = event.target.closest('.ic365-record-card[data-record-id]');
      if (card && !event.target.closest('button,a,input,textarea,select')) {
        openById(card.dataset.recordId);
      }
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  function boot() {
    injectStyles();
    ensureModal();
    bind();
  }

  window.IndiCareOpenRecordWorkspace = openById;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
