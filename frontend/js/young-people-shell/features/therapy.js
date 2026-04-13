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

function render(items = []) {
  if (!items.length) {
    return `<div class="empty-state"><p>No therapy records.</p></div>`;
  }

  return `
    <div class="record-list">
      ${items.map(item => `
        <article class="record-row">
          <div class="record-row-main">
            <div class="record-row-title">${safeText(item.service_name)}</div>
            <div class="record-row-summary">${safeText(item.summary)}</div>
            <div class="record-row-meta">${safeText(item.professional_name)}</div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

export async function loadTherapy() {
  if (!els.viewContent) return;

  const homeId = getHomeId();

  els.viewContent.innerHTML = `<p>Loading therapy…</p>`;

  try {
    const data = await apiGet(`/homes/${homeId}/therapy`).catch(() => ({ items: [] }));
    const items = data.items || data.therapy || [];

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <h2>Therapy</h2>
        ${render(items)}
      </section>
    `;
  } catch {
    els.viewContent.innerHTML = `<p>Failed to load therapy</p>`;
  }
}
