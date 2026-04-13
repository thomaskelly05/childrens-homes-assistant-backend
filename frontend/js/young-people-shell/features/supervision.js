import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

function getHomeId() {
  return state.homeId || state.currentUser?.home_id;
}

function safeText(v) {
  return escapeHtml(String(v ?? ""));
}

function formatDate(v) {
  if (!v) return "No date";
  return new Date(v).toLocaleDateString("en-GB");
}

function render(items = []) {
  if (!items.length) {
    return `<div class="empty-state"><p>No supervision records.</p></div>`;
  }

  return `
    <div class="record-list">
      ${items.map(item => `
        <article class="record-row">
          <div class="record-row-main">
            <div class="record-row-title">${safeText(item.staff_member)}</div>
            <div class="record-row-summary">Supervisor: ${safeText(item.supervisor)}</div>
            <div class="record-row-meta">Due ${formatDate(item.next_due_date)}</div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

export async function loadSupervision() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  els.viewContent.innerHTML = `<p>Loading supervision…</p>`;

  try {
    const data = await apiGet(`/homes/${homeId}/supervisions`).catch(() => ({ items: [] }));
    const items = data.items || data.supervisions || [];

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <h2>Supervision</h2>
        ${render(items)}
      </section>
    `;
  } catch {
    els.viewContent.innerHTML = `<p>Failed to load supervision</p>`;
  }
}
