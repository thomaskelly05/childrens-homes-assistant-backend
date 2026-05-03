(() => {
  "use strict";

  const state = {
    activeTab: "overview",
    context: null,
    loading: false,
  };

  const TAB_COPY = {
    overview: {
      eyebrow: "Live workspace",
      title: "Overview",
      subtitle: "A joined-up child-centred view across records, chronology, risks and actions.",
    },
    timeline: {
      eyebrow: "Chronology",
      title: "Unified chronology",
      subtitle: "A live timeline across daily notes, incidents, health, education, family, plans and other records.",
    },
    safeguarding: {
      eyebrow: "Safeguarding lens",
      title: "Safeguarding",
      subtitle: "Safeguarding-related signals and evidence from the child context.",
    },
    risk: {
      eyebrow: "Risk lens",
      title: "Risk and vulnerability",
      subtitle: "Risk flags, high-significance entries and review prompts.",
    },
    keywork: {
      eyebrow: "Direct work",
      title: "Keywork",
      subtitle: "Keywork and direct work records connected into the wider child journey.",
    },
    plans: {
      eyebrow: "Care planning",
      title: "Plans",
      subtitle: "Support plans, risk plans and review evidence connected to chronology.",
    },
    documents: {
      eyebrow: "Evidence library",
      title: "Documents",
      subtitle: "Documents and statutory evidence connected to the care record.",
    },
  };

  const ROUTE_MAP = {
    timeline: "/timeline",
    safeguarding: "/safeguarding",
    risk: "/risk",
    keywork: "/keywork",
    plans: "/plans",
    documents: "/documents",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[char]);
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value ?? "";
  }

  function setStatus(value) {
    setText("ypStatus", value || "");
  }

  function getYoungPersonId() {
    const selector = $("ypSelector");
    const params = new URLSearchParams(window.location.search);
    const raw =
      selector?.value ||
      params.get("young_person_id") ||
      params.get("youngPersonId") ||
      document.body?.dataset?.youngPersonId ||
      $("ypShell")?.dataset?.youngPersonId ||
      "";
    const value = String(raw || "").trim();
    return value && value !== "null" && value !== "undefined" ? value : "";
  }

  function youngPersonPath(suffix) {
    const id = getYoungPersonId();
    if (!id) throw new Error("No young person selected.");
    return `/young-people/${encodeURIComponent(id)}${suffix}`;
  }

  async function apiGet(path) {
    const response = await fetch(path, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`GET ${path} failed with ${response.status}`);
    const type = response.headers.get("content-type") || "";
    return type.includes("application/json") ? response.json() : {};
  }

  function pickArray(value, keys = []) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    for (const key of keys) {
      if (Array.isArray(value[key])) return value[key];
    }
    return [];
  }

  function formatDate(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: String(value).includes("T") ? "2-digit" : undefined,
      minute: String(value).includes("T") ? "2-digit" : undefined,
    });
  }

  function firstText(row, keys = [], fallback = "") {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
    }
    return fallback;
  }

  function getContextParts(context = {}) {
    const bundle = context.scope_bundle || context.bundle || context.context || {};
    return {
      timeline: context.timeline || bundle.timeline || [],
      recentEvents: context.recent_events || bundle.recent_events || [],
      riskFlags: context.risk_flags || bundle.risk_flags || [],
      patterns: context.patterns || bundle.patterns || [],
      sources: context.sources || context.items || [],
      counts: bundle.counts_by_category || {},
      runtime: context.runtime || {},
    };
  }

  function renderMetrics(context = {}) {
    const parts = getContextParts(context);
    setText("ypSummaryTimeline", parts.timeline.length || parts.recentEvents.length || "0");
    setText("ypSummaryRisk", parts.riskFlags.length || "0");
    setText("ypSummaryPatterns", parts.patterns.length || "0");
    setText("ypSummarySources", parts.sources.length || "0");
    setText("ypContextChip", parts.runtime?.retrieval_mode === "unified_timeline" ? "Unified context" : "Context loaded");
    setText("ypAssistantStatus", `${parts.sources.length || 0} evidence source(s) loaded.`);
  }

  function renderPatterns(context = {}) {
    const list = $("ypPatternsList");
    if (!list) return;
    const patterns = getContextParts(context).patterns;
    if (!patterns.length) {
      list.innerHTML = `<p class="yp-muted">No clear patterns detected yet. Add more records or ask the assistant for a deeper review.</p>`;
      return;
    }
    list.innerHTML = patterns.slice(0, 6).map((item) => `
      <article class="yp-insight-item">
        <strong>${escapeHtml(String(item))}</strong>
        <span>Generated from the unified chronology.</span>
      </article>
    `).join("");
  }

  function renderRiskFlags(context = {}) {
    const list = $("ypRiskList");
    if (!list) return;
    const flags = getContextParts(context).riskFlags;
    if (!flags.length) {
      list.innerHTML = `<p class="yp-muted">No high-significance risk signals are visible in the current context window.</p>`;
      return;
    }
    list.innerHTML = flags.slice(0, 6).map((item) => {
      const title = firstText(item, ["title", "record_type"], "Risk signal");
      const summary = firstText(item, ["summary", "description"], "Review this signal in context.");
      const severity = firstText(item, ["severity"], "review");
      return `
        <article class="yp-insight-item yp-risk-item">
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(summary)}</p>
          <span>${escapeHtml(severity)}${item.date ? ` · ${escapeHtml(formatDate(item.date))}` : ""}</span>
        </article>
      `;
    }).join("");
  }

  function renderTimelinePreview(context = {}) {
    const box = $("ypTimelinePreview");
    if (!box) return;
    const events = getContextParts(context).recentEvents.length
      ? getContextParts(context).recentEvents
      : getContextParts(context).timeline;
    if (!events.length) {
      box.innerHTML = `<p class="yp-muted">No chronology evidence is visible yet.</p>`;
      return;
    }
    box.innerHTML = events.slice(0, 8).map((item) => timelineItemHtml(item)).join("");
  }

  function timelineItemHtml(item = {}) {
    const title = firstText(item, ["title", "event_type", "category", "record_type"], "Timeline event");
    const summary = firstText(item, ["summary", "narrative", "description", "excerpt"], "No summary recorded.");
    const type = firstText(item, ["record_type", "category", "event_type"], "record");
    const date = firstText(item, ["occurred_at", "event_datetime", "date", "created_at"], "");
    return `
      <article class="yp-timeline-item">
        <div class="yp-timeline-dot" aria-hidden="true"></div>
        <div>
          <div class="yp-timeline-title-row">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(type.replaceAll("_", " "))}</span>
          </div>
          <p>${escapeHtml(summary)}</p>
          ${date ? `<small>${escapeHtml(formatDate(date))}</small>` : ""}
        </div>
      </article>
    `;
  }

  function renderOverview(context = state.context) {
    $("ypOverviewPanel")?.classList.remove("hidden");
    $("ypRecordsList")?.classList.add("hidden");
    renderMetrics(context || {});
    renderPatterns(context || {});
    renderRiskFlags(context || {});
    renderTimelinePreview(context || {});
  }

  function renderRecordCard(record = {}, tab = "record") {
    const title = firstText(record, ["title", "summary", "presentation", "incident_type", "record_type", "category"], "Untitled record");
    const body = firstText(record, ["summary", "presentation", "description", "narrative", "outcome", "young_person_voice", "excerpt"], "No further detail recorded.");
    const date = firstText(record, ["date", "occurred_at", "event_datetime", "note_date", "incident_datetime", "record_date", "created_at"], "");
    const status = firstText(record, ["status", "workflow_status", "severity", "record_type"], "");
    return `
      <article class="yp-record-card" data-tab="${escapeHtml(tab)}">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <div class="yp-record-meta">
          ${date ? `<span class="yp-chip">${escapeHtml(formatDate(date))}</span>` : ""}
          ${status ? `<span class="yp-chip">${escapeHtml(status)}</span>` : ""}
        </div>
      </article>
    `;
  }

  function renderRecords(records = [], tab = "record", empty = "No records found for this area.") {
    const overview = $("ypOverviewPanel");
    const list = $("ypRecordsList");
    if (!list) return;
    overview?.classList.add("hidden");
    list.classList.remove("hidden");
    if (!records.length) {
      list.innerHTML = `<div class="yp-empty-card"><h3>${escapeHtml(empty)}</h3><p>Records will appear here when they are added or linked.</p></div>`;
      return;
    }
    list.innerHTML = records.map((record) => renderRecordCard(record, tab)).join("");
  }

  async function loadContext() {
    const id = getYoungPersonId();
    if (!id) return null;
    state.loading = true;
    setStatus("Loading child context…");
    try {
      const context = await apiGet(youngPersonPath("/assistant/context"));
      state.context = context;
      renderOverview(context);
      setStatus("OS context loaded.");
      return context;
    } catch (error) {
      console.error("[young-people-shell-os] context load failed", error);
      setStatus("Could not load OS context.");
      setText("ypAssistantStatus", "Assistant context could not load.");
      return null;
    } finally {
      state.loading = false;
    }
  }

  async function loadTab(tab) {
    const copy = TAB_COPY[tab] || { eyebrow: "Care records", title: tab.replaceAll("-", " "), subtitle: "Linked records for this area." };
    setText("ypRecordsEyebrow", copy.eyebrow);
    setText("ypRecordsTitle", copy.title);
    setText("ypRecordsSubtitle", copy.subtitle);

    if (tab === "overview" || tab === "assistant") {
      renderOverview(state.context || {});
      return;
    }

    if (tab === "timeline") {
      const parts = getContextParts(state.context || {});
      renderRecords(parts.timeline.length ? parts.timeline : parts.recentEvents, "timeline", "No chronology events found yet.");
      return;
    }

    if (tab === "risk" || tab === "safeguarding") {
      renderRecords(getContextParts(state.context || {}).riskFlags, tab, "No visible risk or safeguarding signals in the current context window.");
      return;
    }

    const route = ROUTE_MAP[tab];
    if (!route) return;
    try {
      setStatus(`Loading ${copy.title.toLowerCase()}…`);
      const data = await apiGet(youngPersonPath(route));
      renderRecords(pickArray(data, ["items", "records", tab, `${tab}_records`, "data", "timeline"]), tab);
      setStatus("Loaded.");
    } catch (error) {
      console.warn("[young-people-shell-os] tab route failed", tab, error);
      renderRecords([], tab, "This area is ready, but no linked records loaded yet.");
      setStatus("Area loaded with no records.");
    }
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll("#ypTabs [data-tab]").forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    loadTab(tab);
  }

  function syncProfile() {
    const selector = $("ypSelector");
    const selectedText = selector?.selectedOptions?.[0]?.textContent?.trim() || "Selected young person";
    if (getYoungPersonId()) {
      setText("ypPersonName", selectedText);
      setText("ypPersonMeta", "Live care hub, chronology and assistant context open.");
      setText("ypAvatar", selectedText.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "YP");
    }
  }

  function bindOsTabs() {
    document.querySelectorAll("#ypTabs [data-tab]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setActiveTab(button.dataset.tab || "overview");
      }, true);
    });

    document.querySelectorAll("[data-tab-jump]").forEach((button) => {
      button.addEventListener("click", () => setActiveTab(button.dataset.tabJump || "overview"));
    });
  }

  function bindSelectorRefresh() {
    const selector = $("ypSelector");
    if (!selector) return;
    selector.addEventListener("change", () => {
      window.setTimeout(async () => {
        syncProfile();
        await loadContext();
        await loadTab(state.activeTab);
      }, 50);
    });
  }

  function bindQuickPrompts() {
    document.querySelectorAll(".yp-quick-prompts [data-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = $("ypAssistantInput");
        if (input) {
          input.value = button.dataset.prompt || "";
          input.focus();
        }
      });
    });
  }

  async function boot() {
    bindOsTabs();
    bindSelectorRefresh();
    bindQuickPrompts();

    window.setTimeout(async () => {
      syncProfile();
      await loadContext();
      setActiveTab("overview");
    }, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
