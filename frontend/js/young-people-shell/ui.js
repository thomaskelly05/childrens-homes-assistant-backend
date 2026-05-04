export function byId(id) {
  return document.getElementById(id);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '\"': "&quot;",
  })[char]);
}

export function setText(id, value) {
  const node = byId(id);
  if (node) node.textContent = value ?? "";
}

export function setStatus(message) {
  setText("ypStatus", message || "");
}

export function toggleHidden(id, hidden = true) {
  const node = byId(id);
  if (!node) return;
  node.classList.toggle("hidden", Boolean(hidden));
  node.setAttribute("aria-hidden", hidden ? "true" : "false");
}

export function normaliseError(error) {
  const status = error?.status || error?.body?.status || null;
  const body = error?.body;
  const rawMessage = typeof body === "string"
    ? body
    : body?.detail || body?.error || body?.message || error?.message || "Something went wrong.";

  if (status === 401) {
    return {
      title: "Please sign in again",
      message: "Your session has expired. Sign in again, then return to this page.",
      action: "Sign in",
      status,
    };
  }

  if (status === 403) {
    return {
      title: "Access restricted",
      message: "You do not have permission to view this information. Contact a manager or administrator if this seems wrong.",
      action: "Try again",
      status,
    };
  }

  if (status === 404) {
    return {
      title: "Information not found",
      message: "This record area could not be found for the selected young person.",
      action: "Retry",
      status,
    };
  }

  if (String(rawMessage).toLowerCase().includes("timed out")) {
    return {
      title: "Connection timed out",
      message: "The request took too long. Check the connection and try again.",
      action: "Retry",
      status,
    };
  }

  return {
    title: "Could not load this area",
    message: typeof rawMessage === "string" ? rawMessage : JSON.stringify(rawMessage),
    action: "Retry",
    status,
  };
}

export function bindErrorRetry(handler) {
  const button = byId("ypErrorRetry");
  if (!button || typeof handler !== "function") return;
  button.addEventListener("click", handler, { once: true });
}

export function setActiveTabButton(tab) {
  document.querySelectorAll("#ypTabs [data-tab]").forEach((button) => {
    const isActive = button.dataset.tab === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

export function showRecordsPanel() {
  toggleHidden("ypAssistantPanel", true);
  toggleHidden("ypRecordsPanel", false);
}

export function showAssistantPanel() {
  toggleHidden("ypAssistantPanel", false);
  toggleHidden("ypRecordsPanel", true);
}

function skeletonCard(index = 0) {
  return `
    <article class="yp-record-card yp-skeleton-card" aria-hidden="true" style="--yp-skeleton-delay: ${index * 80}ms">
      <span class="yp-skeleton-line yp-skeleton-title"></span>
      <span class="yp-skeleton-line"></span>
      <span class="yp-skeleton-line yp-skeleton-short"></span>
      <div class="yp-record-meta">
        <span class="yp-skeleton-pill"></span>
        <span class="yp-skeleton-pill yp-skeleton-pill-short"></span>
      </div>
    </article>
  `;
}

export function renderLoading(message = "Getting the latest information.") {
  const list = byId("ypRecordsList");
  if (!list) return;
  list.innerHTML = `
    <div class="sr-only" role="status" aria-live="polite">${escapeHtml(message)}</div>
    ${[0, 1, 2].map((index) => skeletonCard(index)).join("")}
  `;
}

export function renderEmpty(title = "No records yet.", body = "When records are added, they will appear here.") {
  const list = byId("ypRecordsList");
  if (!list) return;
  list.innerHTML = `
    <div class="yp-empty-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </div>
  `;
}

export function renderError(error, title = "") {
  const list = byId("ypRecordsList");
  if (!list) return;
  const details = normaliseError(error);
  const safeTitle = title || details.title;

  list.innerHTML = `
    <div class="yp-error-card" role="alert">
      <h3>${escapeHtml(safeTitle)}</h3>
      <p>${escapeHtml(details.message)}</p>
      <button id="ypErrorRetry" type="button" class="yp-button yp-button-primary">${escapeHtml(details.action)}</button>
    </div>
  `;
}

export function updateTabCopy(tab, copyMap = {}) {
  const copy = copyMap[tab] || copyMap.daily || { title: "Care records", subtitle: "Load records for this young person." };
  setText("ypRecordsTitle", copy.title);
  setText("ypRecordsSubtitle", copy.subtitle);
}

function firstText(record, keys, fallback = "Untitled record") {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function formatDateLike(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: String(value).includes("T") ? "2-digit" : undefined,
    minute: String(value).includes("T") ? "2-digit" : undefined,
  });
}

export function renderRecordCard(record, tab = "records") {
  const title = firstText(record, [
    "title",
    "summary",
    "presentation",
    "behaviour_summary",
    "pre_contact_presentation",
    "incident_type",
    "record_type",
    "contact_type",
    "attendance_status",
  ]);

  const body = firstText(record, [
    "presentation",
    "summary",
    "behaviour_update",
    "positives",
    "behaviour_summary",
    "learning_engagement",
    "issue_raised",
    "action_taken",
    "achievement_note",
    "pre_contact_presentation",
    "post_contact_presentation",
    "child_voice",
    "concerns",
    "staff_response",
    "actions_required",
    "outcome",
    "next_steps",
    "young_person_voice",
  ], "No further detail recorded.");

  const date = firstText(record, [
    "note_date",
    "event_datetime",
    "incident_datetime",
    "record_date",
    "contact_datetime",
    "created_at",
    "updated_at",
  ], "");

  const status = firstText(record, ["status", "workflow_status", "approval_status"], "");

  return `
    <article class="yp-record-card" data-tab="${escapeHtml(tab)}">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      <div class="yp-record-meta">
        ${date ? `<span class="yp-chip">${escapeHtml(formatDateLike(date))}</span>` : ""}
        ${status ? `<span class="yp-chip">${escapeHtml(status)}</span>` : ""}
      </div>
    </article>
  `;
}

export function renderRecords(records, tab = "records") {
  const list = byId("ypRecordsList");
  if (!list) return;
  if (!Array.isArray(records) || records.length === 0) {
    renderEmpty("No records yet.");
    return;
  }
  list.innerHTML = records.map((record) => renderRecordCard(record, tab)).join("");
}

export function appendAssistantMessage(role, text) {
  const box = byId("ypAssistantMessages");
  if (!box) return null;
  const item = document.createElement("article");
  item.className = `yp-assistant-message yp-assistant-message-${role || "assistant"}`;
  item.textContent = text || "";
  box.appendChild(item);
  box.scrollTop = box.scrollHeight;
  return item;
}

export function clearAssistantInput() {
  const input = byId("ypAssistantInput");
  if (input) input.value = "";
}

export function getAssistantInput() {
  return byId("ypAssistantInput")?.value?.trim() || "";
}

export function openComposerShell() {
  const composer = byId("ypComposer");
  composer?.classList.remove("hidden");
  composer?.setAttribute("aria-hidden", "false");
}

export function closeComposerShell() {
  const composer = byId("ypComposer");
  composer?.classList.add("hidden");
  composer?.setAttribute("aria-hidden", "true");
}

export function setComposerSaving(isSaving) {
  const saveDraft = byId("ypComposerSaveDraft");
  const submit = byId("ypComposerSubmit");
  if (saveDraft) saveDraft.disabled = Boolean(isSaving);
  if (submit) submit.disabled = Boolean(isSaving);
}

export function setComposerStatus(message = "") {
  setText("ypComposerStatus", message);
}

export function setComposerTitle(title, subtitle = "") {
  setText("ypComposerTitle", title);
  setText("ypComposerSubtitle", subtitle);
}
