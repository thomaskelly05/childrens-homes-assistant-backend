import { els } from "../dom.js";
import { apiGet } from "../core/api.js";
import { renderSection, renderRowList, bindDynamicOpenRecordButtons } from "./workspace.js";

export async function loadManager() {
  const [complianceData, timelineData] = await Promise.all([
    apiGet(`/young-people/${window.__YP_ID__ || ""}/compliance`).catch(() => ({ items: [] })),
    apiGet(`/young-people/${window.__YP_ID__ || ""}/timeline?limit=12`).catch(() => ({ timeline: [] })),
  ]);

  const compliance = complianceData.compliance_items || complianceData.items || [];
  const recent = timelineData.timeline || [];

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    ${renderSection(
      "Needs manager attention",
      "Items awaiting leadership oversight.",
      renderRowList(compliance, "No items currently need manager attention.")
    )}

    ${renderSection(
      "Recent record activity",
      "Latest activity across this workspace.",
      renderRowList(recent, "No recent activity found.")
    )}
  `;

  bindDynamicOpenRecordButtons();
}
