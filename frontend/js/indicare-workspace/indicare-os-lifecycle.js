import { apiGet, apiSend } from "../young-people-shell/core/api.js";

const REVIEW_QUEUE_URL = "/workspace-records/review/queue";
const LIFECYCLE_STATE = {
  reviewsLoadedForMarkup: "",
  lastReviewRecords: [],
};

bootOsLifecycle();

function bootOsLifecycle() {
  document.addEventListener("click", handleLifecycleClicks, true);
  const observer = new MutationObserver(() => enhanceCurrentOsView());
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceCurrentOsView();
}

function enhanceCurrentOsView() {
  enableNewRecordButtons();
  hydrateReviewsPageIfNeeded();
}

function enableNewRecordButtons() {
  document.querySelectorAll("button").forEach((button) => {
    const text = button.textContent?.trim().toLowerCase();
    if (text !== "new record") return;
    button.disabled = false;
    button.dataset.newLiveRecord = "true";
    button.type = "button";
  });
}

function hydrateReviewsPageIfNeeded() {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const heading = main.querySelector(".sp-page-head h1");
  if (heading?.textContent?.trim() !== "Reviews") return;
  const signature = main.innerHTML.slice(0, 500);
  if (LIFECYCLE_STATE.reviewsLoadedForMarkup === signature) return;
  LIFECYCLE_STATE.reviewsLoadedForMarkup = signature;
  renderReviewQueueLoading(main);
  loadReviewQueue(main);
}

function renderReviewQueueLoading(main) {
  const card = main.querySelector(".sp-card") || main;
  card.innerHTML = `<div class="sp-empty-state"><strong>Loading review queue</strong><p>Checking the existing workspace-records lifecycle service.</p></div>`;
}

async function loadReviewQueue(main) {
  try {
    const payload = await apiGet(REVIEW_QUEUE_URL, { skipCache: true });
    if (payload?.ok === false) throw new Error(payload?.error || payload?.detail || "Review queue failed");
    const records = arrayFrom(payload.records || payload.items || payload.data);
    LIFECYCLE_STATE.lastReviewRecords = records;
    renderReviewQueue(main, records, payload.summary || {});
  } catch (error) {
    const fallback = fallbackReviewRecords();
    LIFECYCLE_STATE.lastReviewRecords = fallback;
    renderReviewQueue(main, fallback, { source: "live_context_fallback", error: error?.message || "Review queue unavailable" });
  }
}

function renderReviewQueue(main, records, summary = {}) {
  const card = main.querySelector(".sp-card") || main;
  const total = records.length;
  const submitted = records.filter((record) => /submitted|review/i.test(String(record.status || ""))).length;
  const changes = records.filter((record) => /changes|return/i.test(String(record.status || ""))).length;
  const draft = records.filter((record) => /draft|ai_improved|pending|^$/i.test(String(record.status || ""))).length;
  card.innerHTML = `
    <section class="yp-overview-strip lifecycle-strip">
      ${metric("Queue", total, "Records needing attention")}
      ${metric("Submitted", submitted, "Awaiting manager review")}
      ${metric("Changes", changes, "Returned / changes requested", changes ? "amber" : "green")}
      ${metric("Drafts", draft, "Draft or AI improved")}
    </section>
    ${summary?.error ? `<section class="sp-empty-state lifecycle-warning"><strong>Review queue fallback</strong><p>${escapeHtml(summary.error)}. Showing review-like records from current live OS context instead.</p></section>` : ""}
    ${records.length ? lifecycleTable(records) : `<div class="sp-empty-state"><strong>No records awaiting review</strong><p>The workspace-records review queue returned no records for this login.</p></div>`}`;
}

function lifecycleTable(records) {
  return `<table class="sp-table lifecycle-table"><thead><tr><th>Record</th><th>Type</th><th>Status</th><th>Updated</th><th>Lifecycle</th></tr></thead><tbody>${records.map((record, index) => `<tr><td>${escapeHtml(record.title || record.summary || "Care record")}</td><td>${escapeHtml(displayType(record.record_type || record.type || "record"))}</td><td>${statusBadge(record.status || "draft")}</td><td>${escapeHtml(formatDate(record.updated_at || record.created_at))}</td><td><div class="lifecycle-actions"><button class="sp-open-btn" data-lifecycle-action="submit" data-review-index="${index}" type="button">Submit</button><button class="sp-open-btn" data-lifecycle-action="approve" data-review-index="${index}" type="button">Approve</button><button class="sp-open-btn" data-lifecycle-action="request_changes" data-review-index="${index}" type="button">Changes</button></div></td></tr>`).join("")}</tbody></table>`;
}

function handleLifecycleClicks(event) {
  const actionButton = event.target.closest?.("[data-lifecycle-action]");
  if (!actionButton) return;
  event.preventDefault();
  event.stopPropagation();
  const record = LIFECYCLE_STATE.lastReviewRecords[Number(actionButton.dataset.reviewIndex)];
  if (!record) return;
  runLifecycleAction(record, actionButton.dataset.lifecycleAction, actionButton);
}

async function runLifecycleAction(record, action, button) {
  const recordId = record.id || record.record_id;
  const recordType = toWorkspaceRecordType(record.record_type || record.type);
  if (!recordId || !recordType) {
    alert("This record cannot be reviewed because it does not include a workspace record id/type.");
    return;
  }
  const oldText = button.textContent;
  button.disabled = true;
  button.textContent = "Working...";
  const url = action === "submit"
    ? `/workspace-records/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}/submit`
    : `/workspace-records/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}/review`;
  const body = action === "submit" ? { comment: "Submitted from IndiCare OS." } : { action, comment: `Actioned from IndiCare OS: ${action}` };
  try {
    const payload = await apiSend(url, "POST", body, { invalidatePrefixes: [REVIEW_QUEUE_URL, "/workspace-records"] });
    if (payload?.ok === false) throw new Error(payload?.error || payload?.detail || "Lifecycle action failed");
    button.textContent = "Done";
    window.dispatchEvent(new CustomEvent("indicare:refresh-live-os"));
    const main = document.getElementById("sp-main");
    if (main) await loadReviewQueue(main);
  } catch (error) {
    button.textContent = oldText;
    button.disabled = false;
    alert(error?.message || "Unable to complete lifecycle action.");
  }
}

function fallbackReviewRecords() {
  const ctx = window.IndiCareLiveContext || {};
  return arrayFrom(ctx.documents || ctx.records).filter((record) => /review|submitted|pending|draft|changes|ai_improved/i.test(String(record.status || "")));
}

function toWorkspaceRecordType(type) {
  const value = String(type || "").toLowerCase();
  if (["daily", "daily_note", "daily-notes", "daily_record"].includes(value)) return "daily";
  if (["incident", "incidents"].includes(value)) return "incident";
  if (["safeguarding", "safeguarding_record", "safeguarding-record"].includes(value)) return "safeguarding";
  if (["missing", "missing_episode", "missing-episode"].includes(value)) return "missing";
  return "";
}

function displayType(type) { return String(type || "record").replaceAll("_", " ").replaceAll("-", " "); }
function metric(label, value, sub, tone = "blue") { return `<article class="yp-compact-metric ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(sub)}</small></article>`; }
function statusBadge(value) { const key = String(value || "").toLowerCase().replaceAll("_", "-").replaceAll(" ", "-"); return `<span class="sp-status ${escapeHtml(key)}">${escapeHtml(displayType(value || "draft"))}</span>`; }
function arrayFrom(value) { if (Array.isArray(value)) return value; if (value && Array.isArray(value.items)) return value.items; if (value && Array.isArray(value.results)) return value.results; if (value && Array.isArray(value.data)) return value.data; return []; }
function formatDate(value) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
