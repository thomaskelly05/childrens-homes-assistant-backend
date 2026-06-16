import { apiSend } from "../young-people-shell/core/api.js";
import { getOsContext, getOperationalSession, scopeContextToSession, recordKey, recordType, displayType, formatDate, escapeHtml, isHighPriority } from "./indicare-os-context.js";

const QA_STATE = { activeRecord: null, activeType: "", activeId: "", dashboardSignature: "" };

bootQaCollaboration();

function bootQaCollaboration() {
  document.addEventListener("click", handleQaClicks, true);
  window.addEventListener("indicare:open-record", (event) => {
    QA_STATE.activeRecord = event.detail || null;
    setTimeout(() => renderRecordQa({ force: true }), 300);
  });
  window.addEventListener("indicare:os-context-ready", () => renderDashboardQa({ force: true }));
  window.addEventListener("indicare:refresh-live-os", () => renderDashboardQa({ force: true }));
  new MutationObserver(() => { renderRecordQa(); renderDashboardQa(); }).observe(document.body, { childList: true, subtree: true });
  renderDashboardQa({ force: true });
}

function renderRecordQa({ force = false } = {}) {
  const side = document.querySelector(".record-context-panel");
  const hero = document.querySelector(".record-view-hero h1");
  if (!side || !hero) return;
  if (!force && side.querySelector("[data-os-qa-record]")) return;

  const active = QA_STATE.activeRecord || window.IndiCareActiveDocument || {};
  const type = window.IndiCareOSRecordRouter?.toWorkspaceType?.(active.record_type || active.type || recordType(active)) || "";
  const id = recordKey(active);
  QA_STATE.activeType = type;
  QA_STATE.activeId = id;

  const checks = qaChecks(active);
  const thread = readThread(active);
  const panel = side.querySelector("[data-os-qa-record]") || document.createElement("section");
  panel.className = "sp-card os-qa-panel";
  panel.dataset.osQaRecord = "true";
  panel.innerHTML = `
    <h2>Collaboration & QA</h2>
    <div class="os-qa-score ${scoreTone(checks.score)}"><strong>${checks.score}%</strong><span>${escapeHtml(checks.label)}</span></div>
    <div class="os-qa-checks">${checks.items.map((item) => `<p class="${item.ok ? "ok" : "gap"}"><span>${item.ok ? "✓" : "!"}</span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.help)}</small></p>`).join("")}</div>
    <div class="os-thread-box"><h3>Manager thread</h3>${threadHtml(thread)}<textarea data-qa-comment placeholder="Add QA note, amendment request or supervision comment..."></textarea><div class="os-thread-actions"><button type="button" class="sp-secondary" data-save-qa-note>Save note</button>${type && id ? `<button type="button" class="sp-secondary" data-request-qa-changes>Request changes</button><button type="button" class="sp-primary" data-approve-qa-record>Approve</button>` : `<button type="button" class="sp-secondary" disabled>Lifecycle unavailable</button>`}</div></div>
    <div class="os-qa-ai-actions"><button type="button" data-ai-record-quality>AI quality check</button><button type="button" data-ai-child-voice>Check child voice</button><button type="button" data-ai-safeguarding-review>Safeguarding review</button></div>`;
  if (!panel.parentElement) side.prepend(panel);
}

function renderDashboardQa({ force = false } = {}) {
  const main = document.getElementById("sp-main");
  if (!main) return;
  const title = main.querySelector(".sp-page-head h1")?.textContent?.trim();
  if (title !== "Dashboard") return;
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const signature = `${context.documents.length}:${context.safeguarding.length}:${context.tasks.length}:${context.chronology.length}`;
  if (!force && QA_STATE.dashboardSignature === signature && main.querySelector("[data-os-qa-dashboard]")) return;
  QA_STATE.dashboardSignature = signature;
  const metrics = qaMetrics(context);
  const html = `<section class="sp-card os-productivity-card os-qa-dashboard" data-os-qa-dashboard><div class="sp-card-head"><div><h2>Quality assurance & Inspection evidence preparation</h2><p>Live QA signals generated from records, safeguarding, chronology and review state.</p></div><button type="button" data-ai-os-qa-summary>AI QA summary →</button></div><div class="os-productivity-grid">${qaTile("Review queue", metrics.review, "Submitted, pending, returned or draft records", metrics.review ? "amber" : "green")}${qaTile("Child voice gaps", metrics.childVoiceGaps, "Records where child voice may need strengthening", metrics.childVoiceGaps ? "amber" : "green")}${qaTile("Safeguarding active", metrics.safeguarding, "Open safeguarding, missing, incident or risk context", metrics.safeguarding ? "amber" : "green")}${qaTile("Chronology gaps", metrics.chronologyGaps, "Priority records that may need chronology linkage", metrics.chronologyGaps ? "amber" : "green")}</div><div class="os-qa-actions-row"><button type="button" data-open-manager-review-centre>Open manager review centre</button><button type="button" data-ai-evidence-gaps>Find evidence gaps</button><button type="button" data-ai-inspection-readiness>Inspection evidence preparation check</button></div></section>`;
  const existing = main.querySelector("[data-os-qa-dashboard]");
  if (existing) existing.outerHTML = html;
  else (main.querySelector("[data-os-activity-intelligence]") || main).insertAdjacentHTML(main.querySelector("[data-os-activity-intelligence]") ? "afterend" : "beforeend", html);
}

function qaChecks(record = {}) {
  const body = stringify(record);
  const type = recordType(record);
  const items = [
    { label: "Factual detail", ok: /when|where|who|what|staff|young|child|incident|session|summary/i.test(body), help: "Record should explain what happened and who was involved." },
    { label: "Child voice", ok: /child_voice|young_person_voice|voice|said|told|wishes|feelings|views/i.test(body), help: "Include the young person's words, wishes, feelings or presentation." },
    { label: "Adult response", ok: /staff_response|adult_response|actions_taken|actions_required|support|response|follow/i.test(body), help: "Show what adults did and why." },
    { label: "Outcome / next action", ok: /outcome|actions_required|actions_agreed|next|review|follow/i.test(body), help: "Record what changed and what must happen next." },
    { label: "Safeguarding considered", ok: !/incident|missing|safeguarding|risk/i.test(type + body) || /safeguarding|risk|manager|social worker|police|notification|escalat/i.test(body), help: "Priority records should show safeguarding thinking and escalation." },
  ];
  const score = Math.round((items.filter((item) => item.ok).length / items.length) * 100);
  return { items, score, label: score >= 80 ? "Strong evidence" : score >= 60 ? "Needs QA review" : "Evidence gaps" };
}

function qaMetrics(context) {
  const documents = context.documents || [];
  const review = [...documents, ...(context.tasks || [])].filter((item) => /submitted|pending|changes|returned|draft|review/i.test(`${item.status || ""} ${item.workflow_status || ""} ${item.manager_review_status || ""}`)).length;
  const childVoiceGaps = documents.filter((item) => !/child_voice|young_person_voice|voice|said|told|views|feelings/i.test(stringify(item))).length;
  const safeguarding = [...(context.safeguarding || []), ...documents].filter((item) => !/closed|resolved|approved|complete/i.test(String(item.status || item.workflow_status || "")) && /safeguarding|missing|incident|risk|high|critical/i.test(`${recordType(item)} ${item.title || ""} ${item.summary || ""} ${item.severity || ""}`)).length;
  const chronologyGaps = documents.filter((item) => isHighPriority(item) || /incident|missing|safeguarding|risk/i.test(recordType(item))).filter((item) => !item.chronology_id && !item.timeline_id && !item.event_id).length;
  return { review, childVoiceGaps, safeguarding, chronologyGaps };
}

function handleQaClicks(event) {
  if (event.target.closest?.("[data-save-qa-note]")) { event.preventDefault(); saveLocalQaNote(); return; }
  if (event.target.closest?.("[data-request-qa-changes]")) { event.preventDefault(); submitReviewAction("request_changes"); return; }
  if (event.target.closest?.("[data-approve-qa-record]")) { event.preventDefault(); submitReviewAction("approve"); return; }
  if (event.target.closest?.("[data-ai-record-quality]")) return ai(event, "Quality check the currently open record. Identify factual gaps, child voice gaps, safeguarding concerns, chronology links, and exact amendments needed. Use the open document only.");
  if (event.target.closest?.("[data-ai-child-voice]")) return ai(event, "Review the currently open record for child voice. Explain what is strong, what is missing, and suggest child-centred wording without inventing facts.");
  if (event.target.closest?.("[data-ai-safeguarding-review]")) return ai(event, "Review the currently open record for safeguarding implications, escalation needs, chronology links and manager oversight gaps. Do not invent information.");
  if (event.target.closest?.("[data-ai-os-qa-summary]")) return ai(event, "Create a manager QA summary from the current OS context. Include review queue, child voice gaps, safeguarding concerns, chronology gaps and priority actions.");
  if (event.target.closest?.("[data-ai-evidence-gaps]")) return ai(event, "Find evidence gaps in the current OS context. Focus on child voice, safeguarding rationale, chronology links, management oversight and incomplete records.");
  if (event.target.closest?.("[data-ai-inspection-readiness]")) return ai(event, "Run an Inspection evidence preparation check from the current OS context. Identify evidence strengths, gaps, overdue actions and what a manager should review today.");
  if (event.target.closest?.("[data-open-manager-review-centre]")) { event.preventDefault(); document.querySelector('[data-sp-view="reviews"]')?.click(); }
}

function saveLocalQaNote() {
  const active = QA_STATE.activeRecord || window.IndiCareActiveDocument || {};
  const input = document.querySelector("[data-qa-comment]");
  const comment = input?.value?.trim();
  if (!comment) return;
  saveThread(active, { author: "Current user", comment, createdAt: new Date().toISOString() });
  input.value = "";
  renderRecordQa({ force: true });
}

async function submitReviewAction(action) {
  const input = document.querySelector("[data-qa-comment]");
  const comment = input?.value?.trim() || (action === "approve" ? "Approved from QA collaboration panel." : "Changes requested from QA collaboration panel.");
  if (!QA_STATE.activeType || !QA_STATE.activeId) return;
  try {
    const response = await apiSend(`/workspace-records/${encodeURIComponent(QA_STATE.activeType)}/${encodeURIComponent(QA_STATE.activeId)}/review`, "POST", { action, comment }, { invalidatePrefixes: ["/workspace-records", "/api/os/context"] });
    if (response?.ok === false) throw new Error(response.error || response.detail || "Review action failed");
    saveThread(QA_STATE.activeRecord || {}, { author: "Manager", comment, createdAt: new Date().toISOString() });
    window.dispatchEvent(new CustomEvent("indicare:refresh-live-os"));
    renderRecordQa({ force: true });
  } catch (error) { alert(error?.message || "Unable to submit review action."); }
}

function readThread(record) { try { return JSON.parse(localStorage.getItem(threadKey(record)) || "[]"); } catch { return []; } }
function saveThread(record, item) { const thread = readThread(record); thread.unshift(item); localStorage.setItem(threadKey(record), JSON.stringify(thread.slice(0, 20))); }
function threadKey(record) { return `indicare.os.qa.thread.${recordType(record)}.${recordKey(record) || record.title || "active"}`; }
function threadHtml(thread) { return thread.length ? thread.map((item) => `<article><strong>${escapeHtml(item.author)}</strong><span>${escapeHtml(formatDate(item.createdAt))}</span><p>${escapeHtml(item.comment)}</p></article>`).join("") : `<div class="os-rail-empty">No discussion notes yet.</div>`; }
function ai(event, prompt) { event.preventDefault(); openAssistantPrompt(prompt); }
function openAssistantPrompt(prompt) { document.querySelector(".sp-ai-bubble")?.click(); setTimeout(() => { const input = document.getElementById("ic-assistant-input"); if (!input) return; input.value = prompt; document.getElementById("ic-send-assistant")?.click(); }, 160); }
function qaTile(label, value, body, tone = "blue") { return `<article class="os-productivity-tile ${escapeHtml(tone)}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(body)}</small></article>`; }
function scoreTone(score) { return score >= 80 ? "green" : score >= 60 ? "amber" : "red"; }
function stringify(record = {}) { try { return JSON.stringify(record.content || record) + " " + Object.values(record).filter((value) => typeof value === "string").join(" "); } catch { return String(record.summary || record.description || ""); } }

window.IndiCareOSQA = { refresh: () => { renderRecordQa({ force: true }); renderDashboardQa({ force: true }); } };
