(() => {
  function getYoungPersonId() {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("young_person_id") || params.get("youngPersonId") || params.get("id") || "";
  }

  function rowsFromPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.timeline)) return payload.timeline;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.chronology)) return payload.chronology;
    if (Array.isArray(payload.records)) return payload.records;
    if (payload.timeline && Array.isArray(payload.timeline.events)) return payload.timeline.events;
    return [];
  }

  function text(value, fallback = "") {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
  }

  function escapeHtml(value) {
    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchChronology() {
    const youngPersonId = getYoungPersonId();
    const endpoint = youngPersonId
      ? `/young-people/${encodeURIComponent(youngPersonId)}/timeline?limit=250`
      : "/api/chronology";

    const res = await fetch(endpoint, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  function render(target, rows) {
    target.textContent = "";

    if (!rows.length) {
      target.innerHTML = '<div class="item"><strong>No chronology records found</strong><span>Record daily notes, incidents, keywork, health, education or safeguarding events and they will appear here.</span></div>';
      return;
    }

    rows.forEach((event) => {
      const date = event.date || event.occurred_at || event.event_at || event.created_at || event.record_date || "Date not recorded";
      const category = event.category || event.event_type || event.record_type || event.source_type || "record";
      const title = event.title || event.event_title || "Chronology item";
      const summary = event.summary || event.event_summary || event.narrative || event.child_voice || "No summary available.";
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `<strong>${escapeHtml(date)} - ${escapeHtml(category)}</strong><span>${escapeHtml(title)}</span><p>${escapeHtml(summary)}</p>`;
      target.appendChild(item);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const target = document.getElementById("timeline");
    if (!target) return;

    target.innerHTML = '<div class="item"><strong>Loading chronology…</strong><span>Gathering connected care records.</span></div>';

    try {
      const data = await fetchChronology();
      render(target, rowsFromPayload(data));
    } catch (error) {
      target.innerHTML = `<div class="item"><strong>Chronology could not load</strong><span>${escapeHtml(error.message || error)}</span></div>`;
    }
  });
})();