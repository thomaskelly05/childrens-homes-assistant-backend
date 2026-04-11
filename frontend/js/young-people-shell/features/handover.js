import { els } from "../dom.js";
import { state } from "../state.js";
import { apiGet } from "../core/api.js";
import { escapeHtml } from "../core/utils.js";
import { renderRowList } from "../ui/records.js";

function renderSection(title, subtitle, body) {
  return `
    <section class="content-section">
      <div class="content-section-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      ${body}
    </section>
  `;
}

export async function loadTimeline() {
  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="spinner"></div>
        <p>Loading timeline...</p>
      </div>
    </div>
  `;

  const data = await apiGet(`/young-people/${state.youngPersonId}/timeline?limit=100`);
  const items = data.timeline || [];

  els.viewContent.innerHTML = `
    ${renderSection(
      "Timeline",
      "A clear chronology of what has happened over time.",
      renderRowList(items, "No timeline items found.")
    )}
  `;
}
