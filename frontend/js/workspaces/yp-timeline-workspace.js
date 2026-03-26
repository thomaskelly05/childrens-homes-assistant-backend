window.YoungPersonTimelineWorkspace = (function () {
  let currentContext = null;
  let currentRows = [];

  function safe(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showStatus(message, type = "") {
    const el = document.getElementById("timelineStatus");
    if (!el) return;
    el.classList.remove("hidden", "error", "success");
    el.textContent = message || "";
    if (type) el.classList.add(type);
  }

  function clearStatus() {
    const el = document.getElementById("timelineStatus");
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("error", "success");
    el.textContent = "";
  }

  function getTodayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDateLabel(value) {
    if (!value) return "Unknown date";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatDateTime(value) {
    if (!value) return "No time recorded";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function normaliseType(type) {
    const t = String(type || "").toLowerCase();
    if (t === "incident") return "incident";
    if (t === "daily_note") return "daily_note";
    if (t === "health_record") return "health_record";
    if (t === "education_record") return "education_record";
    if (t === "family_contact") return "family_contact";
    if (t === "keywork_session") return "keywork_session";
    if (t === "risk_assessment") return "risk_assessment";
    if (t === "chronology_event") return "chronology_event";
    return t || "record";
  }

  function typeLabel(type) {
    const t = normaliseType(type);
    const labels = {
      incident: "Incident",
      daily_note: "Daily note",
      health_record: "Health",
      education_record: "Education",
      family_contact: "Family contact",
      keywork_session: "Keywork",
      risk_assessment: "Risk",
      chronology_event: "Chronology"
    };
    return labels[t] || "Record";
  }

  function typeTagClass(type) {
    const t = normaliseType(type);
    if (t === "incident" || t === "risk_assessment") return "danger";
    if (t === "health_record" || t === "family_contact") return "warn";
    if (t === "daily_note" || t === "education_record" || t === "keywork_session") return "good";
    return "";
  }

  function getFilters() {
    return {
      date_from: document.getElementById("timelineDateFrom")?.value || "",
      date_to: document.getElementById("timelineDateTo")?.value || "",
      record_type: document.getElementById("timelineTypeFilter")?.value || "",
      search: document.getElementById("timelineSearch")?.value || ""
    };
  }

  function buildQueryString(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        params.set(key, String(value).trim());
      }
    });
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  function groupRowsByDate(rows) {
    const groups = new Map();

    rows.forEach(row => {
      const raw = row.event_at || row.record_date || row.created_at || row.date || "";
      let key = "Unknown date";

      if (raw) {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
          key = d.toISOString().slice(0, 10);
        } else {
          key = String(raw).slice(0, 10) || "Unknown date";
        }
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "Unknown date") return 1;
      if (b[0] === "Unknown date") return -1;
      return a[0] < b[0] ? 1 : -1;
    });
  }

  function renderTimelineSummary(rows) {
    const box = document.getElementById("timelineSummaryBox");
    if (!box) return;

    if (!rows.length) {
      box.innerHTML = "No timeline records found for the current filters.";
      return;
    }

    const counts = rows.reduce((acc, row) => {
      const type = normaliseType(row.record_type);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const bits = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${typeLabel(type)}: ${count}`);

    box.innerHTML = `
      <strong style="display:block;margin-bottom:8px;color:var(--text);">Timeline overview</strong>
      Total records: ${safe(rows.length)}<br>
      ${bits.map(x => safe(x)).join("<br>")}
    `;
  }

  function renderTimeline(rows) {
    const host = document.getElementById("timelineList");
    if (!host) return;

    if (!rows.length) {
      host.innerHTML = `<div class="empty-state">No records found for this young person and filter selection.</div>`;
      renderTimelineSummary(rows);
      return;
    }

    const grouped = groupRowsByDate(rows);

    host.innerHTML = grouped.map(([dateKey, items]) => `
      <div class="timeline-group">
        <div class="timeline-date">${safe(formatDateLabel(dateKey))}</div>
        <div class="timeline-items">
          ${items.map(item => `
            <div class="timeline-item">
              <div class="timeline-item-head">
                <div>
                  <div class="timeline-item-title">${safe(item.title || item.summary || typeLabel(item.record_type))}</div>
                  <div class="timeline-item-meta">
                    <span class="tag ${typeTagClass(item.record_type)}">${safe(typeLabel(item.record_type))}</span>
                    <span>${safe(formatDateTime(item.event_at || item.record_date || item.created_at || ""))}</span>
                  </div>
                </div>
              </div>

              <div class="timeline-item-body">
                ${item.summary ? `<p>${safe(item.summary)}</p>` : ""}
                ${item.subtitle ? `<p>${safe(item.subtitle)}</p>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");

    renderTimelineSummary(rows);
  }

  async function loadTimeline() {
    if (!currentContext?.selectedYoungPerson?.id) {
      renderTimeline([]);
      return;
    }

    clearStatus();
    showStatus("Loading timeline...");

    try {
      const filters = getFilters();
      const url = `/young-people/${currentContext.selectedYoungPerson.id}/timeline${buildQueryString(filters)}`;
      const data = await window.YoungPeopleShell.api(url);
      currentRows = Array.isArray(data?.timeline) ? data.timeline : [];
      renderTimeline(currentRows);
      showStatus("Timeline loaded.", "success");
    } catch (error) {
      console.error("loadTimeline failed", error);
      renderTimeline([]);
      showStatus(error.message || "Could not load timeline.", "error");
    }
  }

  function resetFilters() {
    const dateTo = document.getElementById("timelineDateTo");
    const dateFrom = document.getElementById("timelineDateFrom");
    const type = document.getElementById("timelineTypeFilter");
    const search = document.getElementById("timelineSearch");

    if (dateTo) dateTo.value = "";
    if (dateFrom) dateFrom.value = "";
    if (type) type.value = "";
    if (search) search.value = "";
  }

  function bind(context) {
    currentContext = context || null;
    currentRows = [];

    const to = document.getElementById("timelineDateTo");
    const from = document.getElementById("timelineDateFrom");

    if (to && !to.value) {
      to.value = getTodayString();
    }

    if (from && !from.value) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      from.value = `${yyyy}-${mm}-${dd}`;
    }

    document.getElementById("applyTimelineFiltersBtn")?.addEventListener("click", loadTimeline);
    document.getElementById("refreshTimelineBtn")?.addEventListener("click", loadTimeline);
    document.getElementById("resetTimelineFiltersBtn")?.addEventListener("click", () => {
      resetFilters();
      loadTimeline();
    });

    document.getElementById("timelineSearch")?.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadTimeline();
      }
    });

    loadTimeline();
  }

  return {
    bind
  };
})();
