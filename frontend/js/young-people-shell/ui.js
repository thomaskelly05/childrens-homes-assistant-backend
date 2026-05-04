export function byId(id) {
  return document.getElementById(id);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
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

export function renderLoading(message = "Getting the latest information.") {
  const list = byId("ypRecordsList");
  if (!list) return;
  list.innerHTML = `
    <div class="yp-empty-card">
      <h3>Loading…</h3>
      <p>${escapeHtml(message)}</p>
    </div>
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

export function renderError(error, title = "Could not load this area") {
  const list = byId("ypRecordsList");
  if (!list) return;
  const detail = typeof error?.body === "string"
    ? error.body
    : error?.body?.detail || error?.message || "Something went wrong.";
  list.innerHTML = `
    <div class="yp-error-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(typeof detail === "string" ? detail : JSON.stringify(detail))}</p>
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
