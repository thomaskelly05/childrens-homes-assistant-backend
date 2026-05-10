(function () {
  const OS_URL = "/young-people-shell";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function plainTextFromAssistantRow(row) {
    const card = row && row.querySelector ? row.querySelector(".ic-card") : null;
    return card ? String(card.innerText || card.textContent || "").trim() : "";
  }

  function latestUserPrompt(row) {
    let current = row ? row.previousElementSibling : null;
    while (current) {
      if (current.classList && current.classList.contains("user")) {
        const card = current.querySelector(".ic-card");
        return card ? String(card.innerText || card.textContent || "").trim() : "";
      }
      current = current.previousElementSibling;
    }
    return "";
  }

  function timestamp() {
    return new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function buildStructuredOutput(type, row) {
    const answer = plainTextFromAssistantRow(row);
    const prompt = latestUserPrompt(row);
    const now = timestamp();

    if (type === "daily_record") {
      return [
        "Daily record draft",
        `Generated: ${now}`,
        "Source: IndiCare Standalone Assistant guidance only. This draft must be checked by staff before saving to any child record.",
        "",
        "Original information provided:",
        prompt || "[Add original context]",
        "",
        "Draft wording / guidance to use:",
        answer || "[No assistant output found]",
        "",
        "Staff check before saving:",
        "- Confirm date, time, location and staff present.",
        "- Ensure the young person's exact words are recorded where known.",
        "- Remove any assumptions or unsupported interpretation.",
        "- Record who was informed and any follow-up required.",
      ].join("\n");
    }

    if (type === "chronology") {
      return [
        "Chronology entry draft",
        `Generated: ${now}`,
        "Source: IndiCare Standalone Assistant guidance only. Staff must verify before saving.",
        "",
        "Date/time:",
        "[Insert known date/time]",
        "",
        "Event:",
        prompt || "[Summarise event]",
        "",
        "Summary:",
        answer || "[No assistant output found]",
        "",
        "Outcome / action:",
        "[Insert action taken, people informed, and any follow-up plan]",
      ].join("\n");
    }

    if (type === "safeguarding") {
      return [
        "Safeguarding concern draft",
        `Generated: ${now}`,
        "Source: IndiCare Standalone Assistant guidance only. This does not replace manager/DSL judgement or local safeguarding procedures.",
        "",
        "Concern / information received:",
        prompt || "[Add concern]",
        "",
        "Assistant decision-support summary:",
        answer || "[No assistant output found]",
        "",
        "Immediate checks:",
        "- Is the child safe now?",
        "- Has the manager/DSL been informed?",
        "- Is local authority / placing authority / police / LADO consultation required according to the facts and local procedure?",
        "- Has the child's risk assessment and care plan been reviewed?",
      ].join("\n");
    }

    if (type === "manager_note") {
      return [
        "Manager oversight note draft",
        `Generated: ${now}`,
        "Source: IndiCare Standalone Assistant guidance only. Manager to review, amend and approve before recording.",
        "",
        "Context reviewed:",
        prompt || "[Add context]",
        "",
        "Oversight summary:",
        answer || "[No assistant output found]",
        "",
        "Management decision / rationale:",
        "[Manager to add decision, rationale, escalation route and oversight plan]",
        "",
        "Follow-up monitoring:",
        "[Add timescale, responsible person and review date]",
      ].join("\n");
    }

    return answer;
  }

  async function copyOutput(type, row) {
    const output = buildStructuredOutput(type, row);
    try {
      await navigator.clipboard.writeText(output);
      toast(labelFor(type) + " copied");
    } catch (_) {
      toast("Could not copy. Select and copy manually.");
    }
  }

  function labelFor(type) {
    return {
      daily_record: "Daily record draft",
      chronology: "Chronology entry",
      safeguarding: "Safeguarding concern",
      manager_note: "Manager oversight note",
    }[type] || "Draft";
  }

  function openOs(type, row) {
    const output = buildStructuredOutput(type, row);
    try {
      sessionStorage.setItem("indicare_os_prefill_type", type);
      sessionStorage.setItem("indicare_os_prefill_text", output);
    } catch (_) {}
    const url = `${OS_URL}?assistant_prefill=${encodeURIComponent(type)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function toast(text) {
    const old = document.querySelector(".ic-toast");
    if (old) old.remove();
    const div = document.createElement("div");
    div.className = "ic-toast";
    div.textContent = text;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1500);
  }

  function ensureStyles() {
    if (document.getElementById("ic-action-bridge-styles")) return;
    const style = document.createElement("style");
    style.id = "ic-action-bridge-styles";
    style.textContent = `
      .ic-system-panel{border:1px solid rgba(15,23,42,.12);background:#fff;border-radius:16px;padding:12px;color:#0f172a;animation:icFade .18s ease-out}
      .ic-system-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
      .ic-system-action{border:1px solid rgba(15,23,42,.12);border-radius:14px;background:#f8fafc;padding:10px;text-align:left;cursor:pointer;color:#0f172a;font-weight:850}
      .ic-system-action small{display:block;color:#64748b;font-weight:600;line-height:1.3;margin-top:3px}
      .ic-system-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
      .ic-system-mini{border:1px solid rgba(15,23,42,.12);border-radius:999px;background:#fff;padding:6px 9px;font-weight:850;cursor:pointer;color:#0f172a}
      body.theme-dark .ic-system-panel,body.theme-dark .ic-system-action,body.theme-dark .ic-system-mini{background:rgba(255,255,255,.06);color:#f8fafc;border-color:rgba(226,232,240,.16)}
      body.theme-dark .ic-system-action small{color:#cbd5e1}
      @media(max-width:700px){.ic-system-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function renderBridgePanel(row) {
    const meta = row.querySelector(".ic-meta");
    if (!meta || meta.querySelector(".ic-system-panel")) return;
    meta.insertAdjacentHTML("beforeend", `
      <div class="ic-system-panel">
        <div class="ic-panel-title">Use this in your system</div>
        <div class="ic-system-grid">
          <button type="button" class="ic-system-action" data-bridge-action="daily_record">Create daily record<small>Copies a checked, paste-ready daily record draft.</small></button>
          <button type="button" class="ic-system-action" data-bridge-action="chronology">Create chronology entry<small>Copies a concise chronology draft.</small></button>
          <button type="button" class="ic-system-action" data-bridge-action="safeguarding">Flag safeguarding concern<small>Copies a DSL/manager-ready concern summary.</small></button>
          <button type="button" class="ic-system-action" data-bridge-action="manager_note">Manager oversight note<small>Copies rationale and oversight wording.</small></button>
        </div>
        <div class="ic-system-row">
          <button type="button" class="ic-system-mini" data-open-os="daily_record">Open OS with prefill</button>
          <button type="button" class="ic-system-mini" data-copy-all="true">Copy full answer</button>
        </div>
      </div>
    `);
  }

  function scan() {
    document.querySelectorAll(".ic-row.assistant").forEach((row) => {
      const meta = row.querySelector(".ic-meta");
      if (meta && meta.dataset.done === "true") renderBridgePanel(row);
    });
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const action = event.target.closest && event.target.closest("[data-bridge-action]");
      if (action) {
        const row = action.closest(".ic-row.assistant");
        copyOutput(action.dataset.bridgeAction, row);
        return;
      }
      const open = event.target.closest && event.target.closest("[data-open-os]");
      if (open) {
        const row = open.closest(".ic-row.assistant");
        openOs(open.dataset.openOs, row);
        return;
      }
      const copyAll = event.target.closest && event.target.closest("[data-copy-all]");
      if (copyAll) {
        const row = copyAll.closest(".ic-row.assistant");
        copyOutput("full", row);
      }
    });

    const observer = new MutationObserver(() => window.setTimeout(scan, 80));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    ensureStyles();
    bind();
    scan();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
