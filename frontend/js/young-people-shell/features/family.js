import { state } from "../state.js";
import { els } from "../dom.js";
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

function bindDynamicOpenRecordButtons() {
  if (!els.viewContent) return;

  els.viewContent.querySelectorAll("[data-open-record]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const item = JSON.parse(btn.dataset.openRecord);
        const mod = await import("../ui/records.js");
        mod.openRecordDetail(item);
      } catch {
        // ignore
      }
    });
  });
}

export async function loadFamily() {
  const data = await apiGet(`/young-people/${state.youngPersonId}/family`);
  const records = data.family_contact_records || data.items || [];

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    ${renderSection(
      "Family and relationships",
      "Important family time, contact, connection and relationship records.",
      renderRowList(records, "No family or relationship records found.")
    )}
  `;

  bindDynamicOpenRecordButtons();
}
