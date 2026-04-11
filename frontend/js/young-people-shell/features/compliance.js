import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { renderSection, renderRowList, bindDynamicOpenRecordButtons } from "./workspace.js";

export async function loadCompliance() {
  const data = await apiGet(`/young-people/${window.__YP_ID__ || ""}/compliance`).catch(() => ({ items: [] }));
  const items = data.compliance_items || data.items || [];

  if (!els.viewContent) return;

  els.viewContent.innerHTML = renderSection(
    "Checks and due items",
    "Keep the record complete and up to date.",
    renderRowList(items, "No due items found.")
  );

  bindDynamicOpenRecordButtons();
}
