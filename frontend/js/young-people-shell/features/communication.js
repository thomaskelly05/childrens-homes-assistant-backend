import { state } from "../state.js";
import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";

function getHomeId() {
  return state.homeId || state.currentUser?.home_id || state.currentUser?.homeId || null;
}

function safeText(v) {
  return escapeHtml(String(v ?? ""));
}

function formatDateTime(value) {
  if (!value) return "No date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderItems(items = []) {
  if (!items.length) {
    return `<div class="empty-state"><p>No communication records found.</p></div>`;
  }

  return `
    <div class="record-list">
      ${items.map(item => `
        <article class="record-row">
          <div class="record-row-main">
            <div class="record-row-title">${safeText(item.contact_person || "Contact")}</div>
            <div class="record-row-summary">${safeText(item.summary || "")}</div>
            <div class="record-row-meta">
              ${safeText(item.organisation || "")}
              • ${safeText(item.contact_type || "")}
              • ${formatDateTime(item.contact_datetime)}
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

export async function loadCommunication() {
  if (!els.viewContent) return;

  const homeId = getHomeId();
  if (!homeId) return;

  els.viewContent.innerHTML = `<p>Loading communication…</p>`;

  try {
    const data = await apiGet(`/homes/${homeId}/communications`).catch(() => ({ items: [] }));
    const items = data.items || data.communications || [];

    els.viewContent.innerHTML = `
      <section class="overview-panel">
        <h2>Communication</h2>
        ${renderItems(items)}
      </section>
    `;
  } catch {
    els.viewContent.innerHTML = `<p>Failed to load communication</p>`;
  }
}
