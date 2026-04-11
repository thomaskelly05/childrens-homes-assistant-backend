import { els } from "../dom.js";
import { escapeHtml } from "../core/utils.js";
import { RECORD_TYPES } from "../core/contracts.js";
import { openComposerFor } from "./composer.js";

function getTargetLabel(type) {
const map = {
[RECORD_TYPES.health_record]: "Health record",
[RECORD_TYPES.education_record]: "Education record",
[RECORD_TYPES.family_contact_record]: "Family contact record",
[RECORD_TYPES.risk_assessment]: "Risk assessment",
[RECORD_TYPES.safeguarding_record]: "Safeguarding record",
[RECORD_TYPES.task]: "Task",
[RECORD_TYPES.support_plan]: "Support plan",
[RECORD_TYPES.manager_action]: "Manager action",
[RECORD_TYPES.appointment]: "Appointment",
};

return map[type] || "Linked record";
}

function getComposerTypeForSuggestion(targetType) {
const map = {
[RECORD_TYPES.health_record]: "health_record",
[RECORD_TYPES.education_record]: "education_record",
[RECORD_TYPES.family_contact_record]: "family_contact",
[RECORD_TYPES.risk_assessment]: "risk",
[RECORD_TYPES.safeguarding_record]: "safeguarding_record",
[RECORD_TYPES.task]: "task",
[RECORD_TYPES.support_plan]: "support_plan",
[RECORD_TYPES.appointment]: "appointment",
};

return map[targetType] || null;
}

function confidenceClass(value) {
const text = String(value || "").toLowerCase();

if (text === "high") return "success";
if (text === "medium") return "warning";
if (text === "low") return "";
return "";
}

function renderSuggestionCard(item) {
const targetLabel = getTargetLabel(item.target_record_type);

return `
<article class="suggestion-card" data-suggestion-id="${escapeHtml(item.id)}">
<div class="suggestion-card-top">
<div>
<h4>${escapeHtml(item.title || "Suggestion")}</h4>
<p>${escapeHtml(item.reason || "")}</p>
</div>

<div class="suggestion-meta">
<span class="badge ${confidenceClass(item.confidence)}">
${escapeHtml(item.confidence || "medium")}
</span>
<span class="badge">${escapeHtml(targetLabel)}</span>
</div>
</div>

<div class="suggestion-actions">
<button
class="primary-btn"
type="button"
data-suggestion-action="accept"
data-suggestion-id="${escapeHtml(item.id)}"
>
Create draft
</button>

<button
class="secondary-btn"
type="button"
data-suggestion-action="dismiss"
data-suggestion-id="${escapeHtml(item.id)}"
>
Dismiss
</button>
</div>
</article>
`;
}

function ensureSuggestionsHost() {
let host = document.getElementById("recordSuggestionsPanel");
if (host) return host;

const target = els.viewContent || els.workspaceScreen || document.body;
if (!target) return null;

const wrapper = document.createElement("section");
wrapper.id = "recordSuggestionsPanel";
wrapper.className = "workspace-side-card suggestion-panel";
wrapper.innerHTML = `
<div class="workspace-side-head">
<div>
<h3>Suggested follow-up</h3>
<p>Linked records and actions the system thinks may help next.</p>
</div>
<button
class="ghost-btn"
type="button"
id="closeSuggestionsPanelBtn"
>
Close
</button>
</div>
<div id="recordSuggestionsBody" class="assistant-side-block"></div>
`;

target.prepend(wrapper);

wrapper.querySelector("#closeSuggestionsPanelBtn")?.addEventListener("click", () => {
hideSuggestionsPanel();
});

return wrapper;
}

function getSuggestionsBody() {
const panel = ensureSuggestionsHost();
if (!panel) return null;
return panel.querySelector("#recordSuggestionsBody");
}

export function hideSuggestionsPanel() {
const panel = document.getElementById("recordSuggestionsPanel");
if (panel) {
panel.remove();
}
}

export function showSuggestionsPanel(suggestions = [], context = {}) {
if (!Array.isArray(suggestions) || !suggestions.length) {
hideSuggestionsPanel();
return;
}

const panel = ensureSuggestionsHost();
const body = getSuggestionsBody();
if (!panel || !body) return;

panel.dataset.sourceRecordType = context.source_record_type || "";
panel.dataset.sourceRecordId = String(context.source_record_id || "");

body.innerHTML = suggestions.map(renderSuggestionCard).join("");

bindSuggestionEvents(suggestions);
}

export function bindSuggestionEvents(suggestions = []) {
const body = getSuggestionsBody();
if (!body) return;

body.querySelectorAll("[data-suggestion-action='accept']").forEach((button) => {
button.addEventListener("click", () => {
const id = button.dataset.suggestionId;
const suggestion = suggestions.find((item) => item.id === id);
if (!suggestion) return;

const composerType = getComposerTypeForSuggestion(suggestion.target_record_type);
if (!composerType) return;

openComposerFor(composerType, "create", suggestion.prefill || {});
});
});

body.querySelectorAll("[data-suggestion-action='dismiss']").forEach((button) => {
button.addEventListener("click", () => {
const id = button.dataset.suggestionId;
const card = body.querySelector(`[data-suggestion-id="${CSS.escape(id)}"]`);
if (card) card.remove();

const remaining = body.querySelectorAll(".suggestion-card");
if (!remaining.length) {
hideSuggestionsPanel();
}
});
});
}
