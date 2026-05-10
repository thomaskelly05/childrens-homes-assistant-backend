const knowledgeNav = document.getElementById("workspace-nav");
const knowledgeMain = document.getElementById("workspace-main");
const knowledgeTitle = document.getElementById("view-title");
const knowledgeSubtitle = document.getElementById("view-subtitle");

if (knowledgeNav) {
  knowledgeNav.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view='knowledge']");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderKnowledgeWorkspace();
  }, true);
}

window.renderKnowledgeWorkspace = renderKnowledgeWorkspace;

function renderKnowledgeWorkspace() {
  if (knowledgeTitle) knowledgeTitle.textContent = "Knowledge encyclopaedia";
  if (knowledgeSubtitle) knowledgeSubtitle.textContent = "Ask questions about the home, children, plans and policies with document citations.";
  if (!knowledgeMain) return;

  knowledgeMain.innerHTML = `
    <section class="hero-card">
      <div>
        <p class="eyebrow">Document intelligence</p>
        <h3>Ask the home with sources</h3>
        <p>Answers should be grounded in approved/current documents. If no source exists, IndiCare should say so clearly.</p>
      </div>
      <span class="score-pill">Cited answers</span>
    </section>

    <section class="panel knowledge-panel">
      <label class="knowledge-question-label" for="knowledge-question">Question</label>
      <textarea id="knowledge-question" placeholder="Example: What helps this child regulate? What does the missing plan say? What are known triggers?"></textarea>
      <div class="record-actions">
        <button type="button" id="knowledge-ask-child">Ask about selected child</button>
        <button type="button" id="knowledge-ask-home">Ask about home/policy</button>
      </div>
    </section>

    <section class="two-column">
      <article class="panel">
        <h3>Useful questions</h3>
        <ul class="clean-list knowledge-examples">
          <li><button type="button">What are this child’s known triggers?</button></li>
          <li><button type="button">What helps this child feel safe?</button></li>
          <li><button type="button">What does the missing plan say?</button></li>
          <li><button type="button">What are the medication risks?</button></li>
          <li><button type="button">What does the behaviour support plan recommend?</button></li>
        </ul>
      </article>
      <article class="panel">
        <h3>Safe use rules</h3>
        <ul class="clean-list">
          <li>Use approved/current documents for answers.</li>
          <li>Check citations before acting.</li>
          <li>Do not rely on AI alone for safeguarding decisions.</li>
          <li>If no source is found, update the relevant plan or document.</li>
        </ul>
      </article>
    </section>

    <section class="panel">
      <h3>Answer</h3>
      <div id="knowledge-answer" class="assistant-output">Ask a question to search approved documents.</div>
    </section>
  `;

  document.getElementById("knowledge-ask-child")?.addEventListener("click", () => askKnowledge(true));
  document.getElementById("knowledge-ask-home")?.addEventListener("click", () => askKnowledge(false));
  knowledgeMain.querySelectorAll(".knowledge-examples button").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById("knowledge-question");
      if (input) input.value = button.textContent || "";
      askKnowledge(true);
    });
  });
}

async function askKnowledge(childScoped) {
  const input = document.getElementById("knowledge-question");
  const output = document.getElementById("knowledge-answer");
  const question = String(input?.value || "").trim();
  if (!question) {
    output.innerHTML = `<div class="warning-banner">Please enter a question.</div>`;
    return;
  }

  output.innerHTML = `<p>Searching approved documents...</p>`;

  try {
    const response = await fetch("/assistant/os/knowledge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        young_person_id: childScoped ? 1 : null,
        limit: 8,
      }),
    });
    const data = await response.json();
    renderKnowledgeAnswer(data, output);
  } catch (error) {
    output.innerHTML = `<div class="warning-banner">${escapeHtml(error.message)}</div>`;
  }
}

function renderKnowledgeAnswer(data, output) {
  if (!data?.ok) {
    output.innerHTML = `<div class="warning-banner">${escapeHtml(data?.answer || data?.detail || "Knowledge search failed.")}</div>`;
    return;
  }
  const safeguarding = data.safeguarding_signal?.flagged ? `
    <div class="warning-banner">
      <strong>Safeguarding-sensitive question</strong><br />
      ${escapeHtml(data.safeguarding_signal.message || "Follow safeguarding procedure and verify source records.")}
    </div>
  ` : "";

  output.innerHTML = `
    ${safeguarding}
    <p class="confidence">Confidence: ${escapeHtml(data.confidence || "unknown")}</p>
    <p>${escapeHtml(data.answer || "No answer returned.")}</p>
    <h4>Sources</h4>
    ${renderKnowledgeCitations(data.citations || [])}
    ${data.unapproved_source_count ? `<p class="confidence">${escapeHtml(data.unapproved_source_count)} unapproved possible source(s) found but not used as evidence.</p>` : ""}
  `;
}

function renderKnowledgeCitations(citations) {
  if (!citations.length) return `<p class="confidence">No approved source found. Add or approve the relevant document before relying on an answer.</p>`;
  return citations.map((citation) => `
    <article class="assistant-citation-card">
      <strong>${escapeHtml(citation.title || "Untitled document")}</strong>
      <p>${escapeHtml((citation.excerpt || "").slice(0, 900))}</p>
      <small>Document #${escapeHtml(citation.document_id || "?")} · ${escapeHtml(citation.document_type || "document")} · Status: ${escapeHtml(citation.approval_status || "unknown")}</small>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
