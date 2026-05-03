(() => {
  "use strict";

  const osState = {
    youngPersonId: null,
    data: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[char]);
  }

  function getYoungPersonId() {
    const selector = $("ypSelector");
    const value =
      selector?.value ||
      document.body.dataset.youngPersonId ||
      $("ypShell")?.dataset.youngPersonId ||
      "1001";
    return text(value) || "1001";
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.innerText = value ?? "";
  }

  function formatDate(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return text(value);
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getYoungPersonName() {
    const selector = $("ypSelector");
    return text(selector?.selectedOptions?.[0]?.textContent) || text($("ypPersonName")?.innerText) || "this young person";
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function sourceRef(item) {
    return item?.citation_ref || `${item?.source_table || item?.record_type || "record"}:${item?.id || item?.record_id || "unknown"}`;
  }

  function renderTimelineItem(item) {
    return `
      <div class="yp-timeline-item">
        <div class="yp-timeline-dot"></div>
        <div>
          <div class="yp-timeline-title-row">
            <strong>${escapeHtml(item.title || item.record_type || "Record")}</strong>
            <span>${escapeHtml(item.record_type || "record")}</span>
          </div>
          <p>${escapeHtml(item.summary || "No summary recorded.")}</p>
          <small>${escapeHtml(formatDate(item.date))} · ${escapeHtml(sourceRef(item))}</small>
        </div>
      </div>
    `;
  }

  function renderInsightItem(title, summary = "", meta = "") {
    return `
      <div class="yp-insight-item">
        <strong>${escapeHtml(title)}</strong>
        ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
        ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
      </div>
    `;
  }

  async function loadOSData(youngPersonId = getYoungPersonId()) {
    try {
      osState.youngPersonId = youngPersonId;
      const res = await fetch(`/assistant/os/context/${encodeURIComponent(youngPersonId)}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      osState.data = data;

      const timeline = safeArray(data.timeline);
      const risks = safeArray(data.risk_signals || data.risk_flags);
      const patterns = safeArray(data.patterns);
      const sources = safeArray(data.sources || data.items);

      setText("ypSummaryTimeline", timeline.length || 0);
      setText("ypSummaryRisk", risks.length || 0);
      setText("ypSummaryPatterns", patterns.length || 0);
      setText("ypSummarySources", sources.length || 0);
      setText("ypContextChip", data.ok ? "Live context" : "Context issue");
      setText("ypAssistantStatus", `${sources.length || 0} evidence source(s) available.`);

      const timelineEl = $("ypTimelinePreview");
      if (timelineEl) {
        timelineEl.innerHTML = timeline.length
          ? timeline.slice(0, 6).map(renderTimelineItem).join("")
          : "<p class='yp-muted'>No timeline records found yet.</p>";
      }

      const riskEl = $("ypRiskList");
      if (riskEl) {
        riskEl.innerHTML = risks.length
          ? risks.slice(0, 6).map((r) => renderInsightItem(
              r.title || "Risk signal",
              r.summary || "Review this risk in the full care record.",
              `${r.severity || "review"}${r.date ? ` · ${formatDate(r.date)}` : ""} · ${sourceRef(r)}`
            )).join("")
          : "<p class='yp-muted'>No active risk signals found in the current context window.</p>";
      }

      const patternsEl = $("ypPatternsList");
      if (patternsEl) {
        patternsEl.innerHTML = patterns.length
          ? patterns.map((p) => renderInsightItem(p, "Generated from the current OS context.")).join("")
          : "<p class='yp-muted'>No patterns detected yet. More linked records will improve insight.</p>";
      }

      return data;
    } catch (err) {
      console.error("OS load error", err);
      setText("ypAssistantStatus", "Could not load child context.");
      return null;
    }
  }

  function addMessage(role, html) {
    const box = $("ypAssistantMessages");
    if (!box) return;
    const message = document.createElement("div");
    message.className = `yp-message yp-message-${role}`;
    message.innerHTML = html;
    box.appendChild(message);
    box.scrollTop = box.scrollHeight;
  }

  function buildConcernAnswer(question, data) {
    const name = getYoungPersonName();
    const timeline = safeArray(data?.timeline);
    const risks = safeArray(data?.risk_signals || data?.risk_flags);
    const patterns = safeArray(data?.patterns);
    const incidents = timeline.filter((item) => item.record_type === "incident");
    const recent = timeline.slice(0, 5);

    const evidence = recent.map((item) => `<li>${escapeHtml(item.title || item.record_type)} — ${escapeHtml(formatDate(item.date))} <span class="yp-source-ref">[${escapeHtml(sourceRef(item))}]</span></li>`).join("");
    const riskText = risks.length
      ? risks.slice(0, 3).map((risk) => `<li>${escapeHtml(risk.title || "Risk")}: ${escapeHtml(risk.summary || "Review required")} <span class="yp-source-ref">[${escapeHtml(sourceRef(risk))}]</span></li>`).join("")
      : "<li>No active risk records were found in the current context window.</li>";
    const patternText = patterns.length
      ? patterns.map((pattern) => `<li>${escapeHtml(pattern)}</li>`).join("")
      : "<li>No clear pattern has been detected yet from the current records.</li>";

    return `
      <strong>IndiCare</strong>
      <div class="yp-answer-block">
        <p><b>Current read for ${escapeHtml(name)}:</b> I can see ${timeline.length} timeline item(s), ${incidents.length} incident(s), and ${risks.length} risk signal(s) in the current OS context.</p>
        <h4>What stands out</h4>
        <ul>${patternText}</ul>
        <h4>Risk / safeguarding lens</h4>
        <ul>${riskText}</ul>
        <h4>Recent evidence</h4>
        <ul>${evidence || "<li>No recent evidence found.</li>"}</ul>
        <h4>Suggested next actions</h4>
        <ol>
          <li>Review any risk signals with the manager or shift lead.</li>
          <li>Check whether the latest daily notes and incidents are linked to plans or chronology.</li>
          <li>Record the young person’s voice and any protective factors before drawing conclusions.</li>
        </ol>
      </div>
    `;
  }

  function answerAssistantQuestion() {
    const input = $("ypAssistantInput");
    const question = text(input?.value);
    if (!question) return;

    addMessage("user", `<strong>You</strong><span>${escapeHtml(question)}</span>`);
    if (input) input.value = "";

    if (!osState.data) {
      addMessage("assistant", `<strong>IndiCare</strong><span>I’m still loading the child context. Try again in a moment.</span>`);
      return;
    }

    addMessage("assistant", buildConcernAnswer(question, osState.data));
  }

  function bindAssistant() {
    const send = $("ypAssistantSend");
    const input = $("ypAssistantInput");
    if (send) send.addEventListener("click", answerAssistantQuestion);
    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          answerAssistantQuestion();
        }
      });
    }

    document.querySelectorAll(".yp-quick-prompts [data-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        const prompt = button.dataset.prompt || "";
        if (input) input.value = prompt;
        answerAssistantQuestion();
      });
    });
  }

  function bindSelector() {
    const selector = $("ypSelector");
    if (!selector) return;
    selector.addEventListener("change", () => {
      const selected = selector.selectedOptions?.[0]?.textContent || "Selected young person";
      setText("ypPersonName", selected);
      setText("ypPersonMeta", "Live care hub, chronology and assistant context open.");
      loadOSData(selector.value);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindAssistant();
    bindSelector();
    window.setTimeout(() => loadOSData(getYoungPersonId()), 500);
  });
})();
