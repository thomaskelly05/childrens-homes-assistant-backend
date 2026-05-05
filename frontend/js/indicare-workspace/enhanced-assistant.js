const assistantButton = document.querySelector("#assistant-run");
const assistantInput = document.querySelector("#assistant-input");
const assistantOutput = document.querySelector("#assistant-output");
const assistantSuggestions = document.querySelector("#assistant-suggestions");

const DEFAULT_CHILD_ID = 1;

if (assistantSuggestions && !document.querySelector(".assistant-intelligence-controls")) {
  const controls = document.createElement("div");
  controls.className = "assistant-intelligence-controls";
  controls.innerHTML = `
    <button type="button" data-intelligence="ask">Ask with citations</button>
    <button type="button" data-intelligence="ofsted">Ofsted summary</button>
    <button type="button" data-intelligence="reg45">Reg 45 draft</button>
    <button type="button" data-intelligence="child">Analyse child</button>
    <button type="button" data-intelligence="proactive">What am I missing?</button>
  `;
  assistantSuggestions.insertAdjacentElement("afterend", controls);

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-intelligence]");
    if (!button) return;
    const mode = button.dataset.intelligence;
    if (mode === "ask") return runUnifiedAssistant();
    if (mode === "ofsted") return runInspectionBrief();
    if (mode === "reg45") return runReg45Draft();
    if (mode === "child") return runChildAnalysis();
    if (mode === "proactive") return runProactiveAssistant();
  });
}

if (assistantButton) {
  assistantButton.textContent = "Ask with citations";
  assistantButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    runUnifiedAssistant();
  }, true);
}

async function runUnifiedAssistant() {
  const question = valueOrDefault(assistantInput?.value, "What should I know from the approved documents and records?");
  setAssistantOutput("Searching approved documents first...");

  const knowledge = await postJson("/assistant/os/knowledge", {
    question,
    young_person_id: DEFAULT_CHILD_ID,
    limit: 8,
  });

  if (knowledge?.safeguarding_signal?.flagged) {
    renderKnowledgeResponse(knowledge, { emphasiseSafeguarding: true });
    return;
  }

  if (knowledge?.citations?.length) {
    renderKnowledgeResponse(knowledge);
    return;
  }

  setAssistantOutput("No approved document source found. Falling back to general workspace reasoning...");
  const reason = await postJson("/assistant/os/reason", {
    question,
    young_person_id: DEFAULT_CHILD_ID,
  });

  renderReasonResponse(reason, knowledge);
}

async function runInspectionBrief() {
  setAssistantOutput("Generating evidence-led Ofsted summary...");
  const data = await getJson("/assistant/intelligence/home");
  if (!data?.ok) return renderError(data?.detail || data?.error || "Could not generate Ofsted summary.");
  const sections = Object.values(data.inspection_sections || {});
  assistantOutput.innerHTML = `
    <h3>Ofsted Summary</h3>
    <p class="confidence">${escapeHtml(data.disclaimer || "Draft support only. Verify source records before use.")}</p>
    <p>${escapeHtml(data.headline || "Inspection brief generated.")}</p>
    ${sections.map(section => `
      <article class="assistant-citation-card">
        <h4>${escapeHtml(section.title || "Inspection section")}</h4>
        <p>${escapeHtml(section.draft || "No draft text available.")}</p>
      </article>
    `).join("")}
    ${renderActions(data.recommended_next_actions || [])}
  `;
}

async function runReg45Draft() {
  setAssistantOutput("Drafting Regulation 45 support text...");
  const data = await getJson("/assistant/intelligence/reg45");
  if (!data?.ok) return renderError(data?.detail || data?.error || "Could not generate Reg 45 draft.");
  assistantOutput.innerHTML = `
    <h3>Regulation 45 Draft</h3>
    <p class="confidence">${escapeHtml(data.disclaimer || "Draft support only. Registered manager must verify and approve.")}</p>
    ${Object.entries(data.sections || {}).map(([key, value]) => `
      <article class="assistant-citation-card">
        <h4>${humanise(key)}</h4>
        <p>${escapeHtml(typeof value === "string" ? value : JSON.stringify(value, null, 2))}</p>
      </article>
    `).join("")}
  `;
}

async function runChildAnalysis() {
  setAssistantOutput("Analysing child evidence...");
  const data = await getJson(`/assistant/intelligence/child/${DEFAULT_CHILD_ID}`);
  if (!data?.ok) return renderError(data?.detail || data?.error || "Could not analyse child evidence.");
  assistantOutput.innerHTML = `
    <h3>Child Analysis</h3>
    <p class="confidence">${escapeHtml(data.disclaimer || "Draft support only. Verify before use.")}</p>
    <p>${escapeHtml(data.headline || "Child analysis generated.")}</p>
    ${Object.values(data.inspection_sections || {}).map(section => `
      <article class="assistant-citation-card">
        <h4>${escapeHtml(section.title || "Evidence section")}</h4>
        <p>${escapeHtml(section.draft || "No draft text available.")}</p>
      </article>
    `).join("")}
    ${renderActions(data.recommended_next_actions || [])}
  `;
}

async function runProactiveAssistant() {
  setAssistantOutput("Looking for risks, gaps and next actions...");
  const [homeBrief, childBrief, knowledge] = await Promise.all([
    getJson("/assistant/intelligence/home"),
    getJson(`/assistant/intelligence/child/${DEFAULT_CHILD_ID}`),
    postJson("/assistant/os/knowledge", {
      question: "What key plans, risks, triggers, routines, safeguarding duties or support strategies should staff know?",
      young_person_id: DEFAULT_CHILD_ID,
    }),
  ]);

  const homeGaps = homeBrief?.gaps || [];
  const childGaps = childBrief?.gaps || [];
  const actions = [...(homeBrief?.recommended_next_actions || []), ...(childBrief?.recommended_next_actions || [])];

  assistantOutput.innerHTML = `
    <h3>What you may be missing</h3>
    <p>This is a proactive support note. Managers and staff must verify against source records before acting.</p>
    <article class="assistant-citation-card">
      <h4>Evidence gaps</h4>
      ${homeGaps.concat(childGaps).length ? `<ul>${homeGaps.concat(childGaps).map(g => `<li><strong>${escapeHtml(g.area || "Gap")}:</strong> ${escapeHtml(g.gap || "Review required")}</li>`).join("")}</ul>` : `<p>No obvious evidence gaps returned by the current evidence engine.</p>`}
    </article>
    ${renderActions(actions)}
    ${knowledge?.citations?.length ? renderCitationSection(knowledge.citations) : `<p class="confidence">No extra approved document citations were found for the proactive query.</p>`}
  `;
}

function renderKnowledgeResponse(data, options = {}) {
  if (!data?.ok) return renderError(data?.answer || data?.detail || "Knowledge search failed.");
  const safeguarding = data.safeguarding_signal?.flagged ? `
    <div class="warning-banner">
      <strong>Safeguarding-sensitive question</strong><br />
      ${escapeHtml(data.safeguarding_signal.message || "Follow safeguarding procedure and verify source records.")}
    </div>
  ` : "";
  assistantOutput.innerHTML = `
    <h3>Answer with sources</h3>
    ${safeguarding}
    <p class="confidence">Confidence: ${escapeHtml(data.confidence || "unknown")}</p>
    <p>${escapeHtml(data.answer || "No answer returned.")}</p>
    ${renderCitationSection(data.citations || [])}
    ${data.unapproved_source_count ? `<p class="confidence">${escapeHtml(data.unapproved_source_count)} unapproved possible source(s) were found but not used as evidence.</p>` : ""}
    ${!data.citations?.length ? `<p class="confidence">The assistant did not rely on uncited information for this answer.</p>` : ""}
  `;
}

function renderReasonResponse(data, knowledge) {
  if (!data) return renderError("Assistant did not return a response.");
  assistantOutput.innerHTML = `
    <h3>Assistant response</h3>
    <div class="warning-banner"><strong>No approved document citation found.</strong><br />Treat this as general support only and verify against records before acting.</div>
    <p>${escapeHtml(data.answer || data.response || data.message || "No answer returned.")}</p>
    ${knowledge?.answer ? `<p class="confidence">Document search result: ${escapeHtml(knowledge.answer)}</p>` : ""}
  `;
}

function renderCitationSection(citations) {
  if (!citations.length) return `<h4>Sources</h4><p class="confidence">No approved document source was found for this answer.</p>`;
  return `
    <h4>Sources</h4>
    ${citations.map(citation => `
      <article class="assistant-citation-card">
        <strong>${escapeHtml(citation.title || "Untitled document")}</strong>
        <p>${escapeHtml((citation.excerpt || "").slice(0, 900))}</p>
        <small>Document #${escapeHtml(citation.document_id || "?")} · ${escapeHtml(citation.document_type || "document")} · Status: ${escapeHtml(citation.approval_status || "unknown")}</small>
      </article>
    `).join("")}
  `;
}

function renderActions(actions) {
  if (!actions.length) return "";
  return `
    <article class="assistant-citation-card">
      <h4>Recommended next actions</h4>
      <ul>${actions.map(action => `<li>${escapeHtml(action.area ? `${action.area}: ` : "")}${escapeHtml(action.action || JSON.stringify(action))}</li>`).join("")}</ul>
    </article>
  `;
}

async function getJson(url) {
  try {
    const response = await fetch(url, { credentials: "include" });
    return await response.json();
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function postJson(url, payload) {
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function setAssistantOutput(message) {
  if (assistantOutput) assistantOutput.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function renderError(message) {
  if (assistantOutput) assistantOutput.innerHTML = `<div class="warning-banner">${escapeHtml(message)}</div>`;
}

function valueOrDefault(value, fallback) {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
}

function humanise(value) {
  return escapeHtml(String(value || "").replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase()));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
