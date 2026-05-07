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
          <div>
            <strong style="display:block;font-size:1.2rem;">IndiCare AI</strong>
            <span style="color:#cbd5e1;font-size:.85rem;">Operational residential assistant</span>
          </div>
        </div>

        <div style="padding:14px;border-radius:16px;background:rgba(255,255,255,.06);">
          <span style="display:block;color:#93c5fd;font-size:.75rem;text-transform:uppercase;font-weight:800;letter-spacing:.08em;">Mode</span>
          <strong style="display:block;margin-top:6px;font-size:1rem;">Children & safeguarding</strong>
        </div>

        <div>
          <input placeholder="Search chats" style="width:100%;height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:#111827;color:#fff;padding:0 14px;outline:none;" />
        </div>

        <div style="display:grid;align-content:start;gap:10px;overflow:auto;">
          <button class="ic-history-item">Jordan chronology summary</button>
          <button class="ic-history-item">Open safeguarding concerns</button>
          <button class="ic-history-item">Missing records review</button>
          <button class="ic-history-item">Placement review prep</button>
        </div>

        <button id="ic-close-assistant" style="height:46px;border:0;border-radius:12px;background:#1e293b;color:#fff;font-weight:800;cursor:pointer;">Close assistant</button>
      </aside>

      <main style="display:grid;grid-template-rows:auto 1fr auto;background:#f8fafc;min-width:0;">
        <header style="height:84px;border-bottom:1px solid #e2e8f0;padding:0 24px;display:flex;align-items:center;justify-content:space-between;background:#fff;">
          <div>
            <div style="display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:.78rem;font-weight:800;">Live operational assistant</div>
            <h1 style="margin:8px 0 0;font-size:1.55rem;letter-spacing:-.04em;">Ask about children, chronology, safeguarding or records</h1>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="ic-action-btn">Export</button>
            <button class="ic-action-btn">Clear</button>
          </div>
        </header>

        <section id="ic-assistant-messages" style="padding:26px;overflow:auto;display:grid;align-content:start;gap:18px;">
          <div style="max-width:860px;background:#fff;border:1px solid #dbe4f0;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(15,23,42,.06);">
            <strong style="display:block;font-size:1.1rem;margin-bottom:8px;">Operational assistant ready</strong>
            <p style="margin:0;color:#475569;line-height:1.7;">This assistant is now being wired into live OS data. It will support chronology summaries, safeguarding analysis, record drafting and operational oversight using real child context.</p>
          </div>
        </section>

        <footer style="padding:18px 24px;border-top:1px solid #dbe4f0;background:#fff;">
          <div style="display:flex;gap:12px;align-items:flex-end;">
            <textarea id="ic-assistant-input" placeholder="Ask IndiCare AI about children, chronology, safeguarding or records..." style="flex:1;min-height:56px;max-height:180px;border:1px solid #dbe4f0;border-radius:16px;padding:14px;resize:vertical;outline:none;font:inherit;"></textarea>
            <button id="ic-send-assistant" style="width:56px;height:56px;border:0;border-radius:16px;background:#075fd1;color:#fff;font-size:1.2rem;font-weight:900;cursor:pointer;">↑</button>
          </div>
        </footer>
      </main>

      <aside style="border-left:1px solid #e2e8f0;background:#fff;padding:22px;display:grid;grid-template-rows:auto auto 1fr;gap:18px;overflow:auto;">
        <div>
          <h2 style="margin:0;font-size:1.1rem;">Child context</h2>
          <p style="margin:8px 0 0;color:#64748b;line-height:1.6;">Assistant responses will use chronology, safeguarding and document context from the OS.</p>
        </div>

        <div style="display:grid;gap:10px;">
          <button class="ic-context-btn">Summarise chronology</button>
          <button class="ic-context-btn">Review safeguarding</button>
          <button class="ic-context-btn">Check overdue records</button>
          <button class="ic-context-btn">Draft handover</button>
        </div>

        <div id="ic-live-context" style="display:grid;gap:12px;align-content:start;"></div>
      </aside>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#ic-close-assistant')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.style.display = 'none';
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

  const children = await window.IndiCareData?.load?.('children') || [];

  if (!children.length) {
    target.innerHTML = '<div style="padding:14px;border-radius:14px;background:#fff7ed;color:#c2410c;font-weight:700;">No live children returned yet from backend APIs.</div>';
    return;
  }

  target.innerHTML = children.slice(0, 6).map((child) => `
    <article style="padding:14px;border:1px solid #dbe4f0;border-radius:14px;background:#f8fafc;">
      <strong style="display:block;">${escapeHtml(child.name || child.full_name || child.young_person_name || 'Young person')}</strong>
      <span style="display:block;color:#64748b;margin-top:4px;">${escapeHtml(child.home || child.house || 'Residential placement')}</span>
    </article>
  `).join('');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

ensureAssistantModal();
