import { state } from "../state.js";
import { els } from "../dom.js";
import { RECORD_CONFIG } from "../core/config.js";
import { apiGet, apiSend } from "../core/api.js";
import { escapeHtml, formatDate, formatShortDate } from "../core/utils.js";
import { loadCurrentView } from "../features/workspace.js";

export function statusBadgeClass(value) {
  const v = String(value || "").toLowerCase();

  if (["approved", "active", "recorded", "completed", "scheduled", "success"].includes(v)) {
    return "success";
  }

  if (["submitted", "pending", "draft", "warning", "medium", "due_soon", "not_required"].includes(v)) {
    return "warning";
  }

  if (["returned", "archived", "cancelled", "high", "critical", "overdue", "danger"].includes(v)) {
    return "danger";
  }

  return "";
}

export function renderBadges(values = []) {
  const list = values.filter(Boolean);
  if (!list.length) return "";

  return `
    <div class="badge-row">
      ${list
        .map(
          (value) =>
            `<span class="badge ${statusBadgeClass(value)}">${escapeHtml(String(value).replaceAll("_", " "))}</span>`
        )
        .join("")}
    </div>
  `;
}

export function normaliseRecordType(item) {
  const raw = String(item?.record_type || item?.event_type || item?.category || "").toLowerCase();

  if (raw === "plan") return "support_plan";
  if (raw === "daily_notes") return "daily_note";
  if (raw === "incidents") return "incident";
  if (raw === "risk_assessment") return "risk";

  return raw;
}

export function getRecordUrl(item) {
  const type = normaliseRecordType(item);
  const id = item?.record_id || item?.source_id || item?.id;

  if (!id) return null;

  const map = {
    daily_note: `/young-people/daily-notes/${id}`,
    incident: `/young-people/incidents/${id}`,
    risk: `/young-people/risk/${id}`,
    support_plan: `/young-people/plans/${id}`,
    appointment: `/young-people/appointments/${id}`,
    health: `/young-people/health-records/${id}`,
    health_record: `/young-people/health-records/${id}`,
    medication_profile: `/young-people/medication-profiles/${id}`,
    medication_record: `/young-people/medication-records/${id}`,
    education: `/young-people/education-records/${id}`,
    education_record: `/young-people/education-records/${id}`,
    family: `/young-people/family/records/${id}`,
    family_contact: `/young-people/family/records/${id}`,
    keywork: `/young-people/keywork/${id}`,
    report: `/young-people/reports/${id}`,
  };

  return map[type] || null;
}

export function getRecordTitle(item = {}) {
  return (
    item.title ||
    item.topic ||
    item.contact_person ||
    item.appointment_type ||
    item.incident_type ||
    item.record_type ||
    item.event_type ||
    "Record"
  );
}

export function getRecordSummary(item = {}) {
  return (
    item.summary ||
    item.narrative ||
    item.description ||
    item.concern_summary ||
    item.outcome ||
    item.presenting_need ||
    item.young_person_voice ||
    item.child_voice ||
    "Open to view details."
  );
}

export function getRecordWhen(item = {}) {
  return (
    item.recorded_at ||
    item.occurred_at ||
    item.event_datetime ||
    item.created_at ||
    item.note_date ||
    item.record_date ||
    item.appointment_date ||
    item.incident_datetime ||
    item.session_date ||
    null
  );
}

export function getRecordBy(item = {}) {
  return (
    item.recorded_by_name ||
    item.author_name ||
    item.created_by_name ||
    item.worker_name ||
    item.owner_name ||
    item.professional_name ||
    ""
  );
}

export function getFriendlyStatus(item = {}) {
  return (
    item.workflow_status ||
    item.status ||
    item.approval_status ||
    item.compliance_status ||
    item.severity ||
    ""
  );
}

export function renderRowItem(item = {}) {
  const title = getRecordTitle(item);
  const when = getRecordWhen(item);
  const summary = getRecordSummary(item);
  const by = getRecordBy(item);
  const status = getFriendlyStatus(item);

  return `
    <button class="record-row" type="button" data-open-record='${escapeHtml(JSON.stringify(item))}'>
      <div class="record-row-main">
        <div class="record-row-title">${escapeHtml(String(title).replaceAll("_", " "))}</div>
        <div class="record-row-subtitle">${escapeHtml(summary)}</div>
      </div>

      <div class="record-row-meta">
        <div class="record-row-date">${escapeHtml(formatDate(when))}</div>
        ${by ? `<div class="record-row-by">${escapeHtml(by)}</div>` : ""}
        ${status ? `<div class="row-pill-wrap">${renderBadges([status])}</div>` : ""}
      </div>
    </button>
  `;
}

export function renderRowList(items = [], emptyText = "No items found.") {
  if (!items.length) {
    return `
      <div class="empty-state">
        <p>${escapeHtml(emptyText)}</p>
      </div>
    `;
  }

  return `
    <div class="record-rows">
      ${items.map(renderRowItem).join("")}
    </div>
  `;
}

export function renderRecordsTable(title, subtitle, items = []) {
  if (!items.length) {
    return `
      <section class="table-shell">
        <div class="table-toolbar">
          <div>
            <h3>${escapeHtml(title)}</h3>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          </div>
        </div>
        <div class="empty-state">
          <p>No items found.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="table-shell">
      <div class="table-toolbar">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>

      <div class="records-table-wrap">
        <table class="records-table">
          <thead>
            <tr>
              <th>Record</th>
              <th>When</th>
              <th>By</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((item) => {
                const titleText = getRecordTitle(item);
                const summaryText = getRecordSummary(item);
                const when = getRecordWhen(item);
                const by = getRecordBy(item);
                const status = getFriendlyStatus(item);

                return `
                  <tr data-open-record='${escapeHtml(JSON.stringify(item))}'>
                    <td>
                      <div class="row-title">${escapeHtml(String(titleText).replaceAll("_", " "))}</div>
                      <div class="row-subtitle">${escapeHtml(summaryText)}</div>
                    </td>
                    <td>${escapeHtml(formatShortDate(when))}</td>
                    <td>${escapeHtml(by || "—")}</td>
                    <td>${status ? renderBadges([status]) : "—"}</td>
                    <td class="row-actions">
                      <button class="secondary-btn" type="button">Open</button>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="mobile-record-list">
        ${items
          .map((item) => {
            const titleText = getRecordTitle(item);
            const summaryText = getRecordSummary(item);
            const when = getRecordWhen(item);
            const by = getRecordBy(item);
            const status = getFriendlyStatus(item);

            return `
              <article class="mobile-record-row" data-open-record='${escapeHtml(JSON.stringify(item))}'>
                <div class="mobile-record-row-top">
                  <div>
                    <div class="mobile-record-row-title">${escapeHtml(String(titleText).replaceAll("_", " "))}</div>
                    <div class="mobile-record-row-meta">${escapeHtml(formatDate(when))}</div>
                  </div>
                  ${status ? renderBadges([status]) : ""}
                </div>
                <div class="mobile-record-row-meta">${escapeHtml(by || "—")}</div>
                <div class="mobile-record-row-summary">${escapeHtml(summaryText)}</div>
                <div class="mobile-record-row-actions">
                  <button class="secondary-btn" type="button">Open</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

export async function loadRecordList(url, label) {
  const data = await apiGet(url);
  const items = data.items || data.records || data.timeline || [];

  if (!els.viewContent) return;

  els.viewContent.innerHTML = `
    <section class="content-section">
      <div class="content-section-head">
        <div>
          <h3>${escapeHtml(label)}</h3>
          <p>Browse and open ${escapeHtml(label.toLowerCase())} in a clean list.</p>
        </div>
      </div>
      ${renderRowList(items, `No ${label.toLowerCase()} found.`)}
    </section>
  `;
}

export function openDrawer() {
  els.drawer?.classList.remove("hidden");
  els.drawerBackdrop?.classList.remove("hidden");
  els.drawer?.setAttribute("aria-hidden", "false");
}

export function closeDrawer() {
  els.drawer?.classList.add("hidden");
  els.drawerBackdrop?.classList.add("hidden");
  els.drawer?.setAttribute("aria-hidden", "true");

  state.activeRecordItem = null;
  state.activeRecordType = null;
}

export async function openRecordDetail(item) {
  const type = normaliseRecordType(item);
  const url = getRecordUrl(item);

  if (!url) {
    return;
  }

  state.activeRecordItem = item;
  state.activeRecordType = type;

  openDrawer();
  els.drawerActions?.classList.toggle("hidden", !RECORD_CONFIG[type]);

  if (els.drawerTitle) els.drawerTitle.textContent = item.title || "Details";
  if (els.drawerSubtitle) els.drawerSubtitle.textContent = "Loading…";

  if (els.drawerBody) {
    els.drawerBody.innerHTML = `
      <div class="loading-state">
        <div>
          <div class="spinner"></div>
          <p>Loading details…</p>
        </div>
      </div>
    `;
  }

  if (type === "appointment") {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Complete";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Cancel";
    els.drawerSubmitBtn?.classList.add("hidden");
    els.drawerArchiveBtn?.classList.add("hidden");
  } else {
    if (els.drawerApproveBtn) els.drawerApproveBtn.textContent = "Approve";
    if (els.drawerReturnBtn) els.drawerReturnBtn.textContent = "Return";
    els.drawerSubmitBtn?.classList.remove("hidden");
    els.drawerArchiveBtn?.classList.remove("hidden");
  }

  try {
    const data = await apiGet(url);
    const detail =
      data.daily_note ||
      data.incident ||
      data.risk ||
      data.risk_assessment ||
      data.support_plan ||
      data.plan ||
      data.appointment ||
      data.health_record ||
      data.medication_profile ||
      data.medication_record ||
      data.education_record ||
      data.family_contact_record ||
      data.contact ||
      data.keywork ||
      data.report ||
      data;

    const entries = Object.entries(detail || {}).filter(
      ([key, value]) =>
        !["id", "young_person_id", "home_id"].includes(key) &&
        value !== null &&
        value !== "" &&
        value !== undefined
    );

    if (els.drawerTitle) {
      els.drawerTitle.textContent = item.title || detail.title || "Details";
    }

    if (els.drawerSubtitle) {
      els.drawerSubtitle.textContent = `${String(type).replaceAll("_", " ")} • ${formatDate(
        item.recorded_at ||
          item.occurred_at ||
          item.created_at ||
          detail.recorded_at ||
          detail.appointment_date ||
          detail.incident_datetime ||
          detail.note_date ||
          detail.created_at
      )}`;
    }

    if (els.drawerBody) {
      els.drawerBody.innerHTML = `
        <div class="drawer-section">
          ${entries
            .map(
              ([key, value]) => `
                <div class="drawer-row">
                  <div class="drawer-key">${escapeHtml(key.replaceAll("_", " "))}</div>
                  <div class="drawer-value">${escapeHtml(
                    typeof value === "object" ? JSON.stringify(value) : String(value)
                  )}</div>
                </div>
              `
            )
            .join("")}
        </div>
      `;
    }
  } catch (error) {
    if (els.drawerSubtitle) els.drawerSubtitle.textContent = "Unable to load";
    if (els.drawerBody) {
      els.drawerBody.innerHTML = `
        <div class="empty-state">
          <p>${escapeHtml(error.message || "Failed to load record details.")}</p>
        </div>
      `;
    }
  }
}

export async function runDrawerWorkflow(action) {
  const item = state.activeRecordItem;
  const type = state.activeRecordType;
  const config = RECORD_CONFIG[type];

  if (!item || !config) return;

  const id = item.record_id || item.source_id || item.id;
  if (!id) return;

  let url = null;
  let body = null;

  if (type === "appointment") {
    if (action === "approve") url = config.approveUrl?.(id);
    if (action === "return") url = config.returnUrl?.(id);
  } else {
    if (action === "submit") url = config.submitUrl?.(id);
    if (action === "approve") {
      url = config.approveUrl?.(id);
      body = { review_note: "Approved in workspace" };
    }
    if (action === "return") {
      url = config.returnUrl?.(id);
      body = { review_note: "Returned in workspace" };
    }
    if (action === "archive") url = config.archiveUrl?.(id);
  }

  if (!url) return;

  await apiSend(url, "POST", body);
  closeDrawer();
  await loadCurrentView();
}
