import {
  getOsContext,
  getOperationalSession,
  scopeContextToSession,
  childKey,
  childName,
  recordType,
  displayType,
  formatDate,
  escapeHtml,
} from "./indicare-os-context.js";

const PALETTE_STATE = {
  query: "",
  results: [],
  activeIndex: 0,
  open: false,
};

bootCommandPalette();

function bootCommandPalette() {
  document.addEventListener("input", handleSearchInput, true);
  document.addEventListener("keydown", handleKeys, true);
  document.addEventListener("click", handleClicks, true);
  window.addEventListener("indicare:os-context-ready", () => {
    if (PALETTE_STATE.open) renderResults();
  });
  ensurePalette();
  prepareTopbarSearch();
}

function prepareTopbarSearch() {
  const input = searchInput();
  if (!input || input.dataset.commandReady === "true") return;
  input.dataset.commandReady = "true";
  input.placeholder = "Search young people, records, safeguarding, handover...";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-controls", "ic-os-command-palette");
  input.setAttribute("aria-expanded", "false");
}

function ensurePalette() {
  if (document.getElementById("ic-os-command-palette")) return;
  const panel = document.createElement("section");
  panel.id = "ic-os-command-palette";
  panel.className = "os-command-palette";
  panel.setAttribute("role", "listbox");
  panel.setAttribute("aria-label", "Search IndiCare OS");
  panel.innerHTML = `
    <header class="os-command-head">
      <strong>Search IndiCare OS</strong>
      <span>Find young people, records, safeguarding, handover, reports and actions</span>
    </header>
    <div id="ic-os-command-results" class="os-command-results"></div>
    <footer class="os-command-footer"><span>Enter opens</span><span>↑ ↓ moves</span><span>Esc closes</span><span>Ctrl/⌘ K focuses search</span></footer>`;
  document.body.appendChild(panel);
}

function searchInput() {
  return document.querySelector(".sp-search input");
}

function handleSearchInput(event) {
  const input = event.target.closest?.(".sp-search input");
  if (!input) return;
  PALETTE_STATE.query = input.value.trim();
  PALETTE_STATE.activeIndex = 0;
  PALETTE_STATE.open = Boolean(PALETTE_STATE.query);
  input.setAttribute("aria-expanded", PALETTE_STATE.open ? "true" : "false");
  renderResults();
}

function handleKeys(event) {
  const input = searchInput();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    input?.focus();
    openPalette();
    return;
  }
  if (!PALETTE_STATE.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closePalette();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    PALETTE_STATE.activeIndex = Math.min(PALETTE_STATE.results.length - 1, PALETTE_STATE.activeIndex + 1);
    renderResults();
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    PALETTE_STATE.activeIndex = Math.max(0, PALETTE_STATE.activeIndex - 1);
    renderResults();
    return;
  }
  if (event.key === "Enter") {
    const result = PALETTE_STATE.results[PALETTE_STATE.activeIndex];
    if (result) {
      event.preventDefault();
      activateResult(result);
    }
  }
}

function handleClicks(event) {
  const resultNode = event.target.closest?.("[data-command-result]");
  if (resultNode) {
    event.preventDefault();
    const result = PALETTE_STATE.results[Number(resultNode.dataset.commandResult)];
    if (result) activateResult(result);
    return;
  }
  const searchBox = event.target.closest?.(".sp-search");
  if (searchBox) {
    openPalette();
    return;
  }
  const panel = document.getElementById("ic-os-command-palette");
  if (PALETTE_STATE.open && panel && !panel.contains(event.target) && !event.target.closest?.(".sp-search")) {
    closePalette();
  }
}

function openPalette() {
  PALETTE_STATE.open = true;
  renderResults();
  searchInput()?.setAttribute("aria-expanded", "true");
}

function closePalette() {
  PALETTE_STATE.open = false;
  const panel = document.getElementById("ic-os-command-palette");
  if (panel) panel.style.display = "none";
  searchInput()?.setAttribute("aria-expanded", "false");
}

function renderResults() {
  ensurePalette();
  const panel = document.getElementById("ic-os-command-palette");
  const target = document.getElementById("ic-os-command-results");
  if (!panel || !target) return;
  const input = searchInput();
  positionPanel(panel, input);
  PALETTE_STATE.results = buildResults(PALETTE_STATE.query);
  panel.style.display = PALETTE_STATE.open ? "grid" : "none";
  if (!PALETTE_STATE.open) return;
  target.innerHTML = PALETTE_STATE.results.length
    ? PALETTE_STATE.results.map((result, index) => renderResult(result, index)).join("")
    : `<div class="os-command-empty"><strong>No live results</strong><p>No matching young people, records, safeguarding items, tasks or reports were found in the current OS context.</p></div>`;
}

function positionPanel(panel, input) {
  if (!input) return;
  const box = input.closest(".sp-search")?.getBoundingClientRect() || input.getBoundingClientRect();
  panel.style.left = `${Math.max(16, box.left)}px`;
  panel.style.top = `${box.bottom + 10}px`;
  panel.style.width = `${Math.min(760, Math.max(430, box.width + 220))}px`;
}

function buildResults(query) {
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const q = String(query || "").toLowerCase();
  const results = [
    ...context.children.map((child) => ({
      kind: "young_person",
      title: childName(child),
      subtitle: child.home_name || child.home || getOperationalSession()?.homeName || "Young person",
      meta: child.status || child.placement_status || "Active",
      icon: "👤",
      score: score(`${childName(child)} ${child.status || ""} ${child.home_name || ""}`, q),
      data: child,
    })),
    ...context.documents.map((record) => recordResult(record, "record")),
    ...context.chronology.map((record) => recordResult(record, "chronology")),
    ...context.safeguarding.map((record) => recordResult(record, "safeguarding")),
    ...context.tasks.map((record) => recordResult(record, "task")),
    ...context.reports.map((record) => recordResult(record, "report")),
  ];
  return results
    .filter((item) => !q || item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function recordResult(record, kind) {
  const title = record.title || record.summary || record.name || displayType(recordType(record));
  const type = recordType(record);
  const child = record.child_name || record.young_person_name || record.childName || "";
  const searchable = `${title} ${type} ${child} ${record.status || ""} ${record.severity || ""} ${record.summary || ""}`;
  const icon = kind === "safeguarding" ? "🛡" : kind === "chronology" ? "🕘" : kind === "task" ? "☑" : kind === "report" ? "📊" : "📄";
  return {
    kind,
    title,
    subtitle: child || displayType(type),
    meta: `${displayType(type)} · ${formatDate(record.updated_at || record.created_at || record.occurred_at, "")}`,
    icon,
    score: score(searchable, PALETTE_STATE.query),
    data: record,
  };
}

function score(text, query) {
  const source = String(text || "").toLowerCase();
  const q = String(query || "").toLowerCase();
  if (!q) return 1;
  if (source === q) return 100;
  if (source.startsWith(q)) return 80;
  if (source.includes(q)) return 50;
  return q.split(/\s+/).filter((part) => part && source.includes(part)).length * 15;
}

function renderResult(result, index) {
  return `<article class="os-command-result ${index === PALETTE_STATE.activeIndex ? "active" : ""}" data-command-result="${index}" role="option" aria-selected="${index === PALETTE_STATE.activeIndex}">
    <span>${escapeHtml(result.icon)}</span>
    <div><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.subtitle || "")}</small></div>
    <em>${escapeHtml(result.meta || displayType(result.kind))}</em>
  </article>`;
}

function activateResult(result) {
  closePalette();
  const input = searchInput();
  if (input) input.value = "";
  if (result.kind === "young_person") {
    const id = childKey(result.data);
    const button = document.querySelector(`[data-open-child="${cssEscape(id)}"]`);
    if (button) button.click();
    else window.dispatchEvent(new CustomEvent("indicare:open-child", { detail: result.data }));
    return;
  }
  window.dispatchEvent(new CustomEvent("indicare:open-record", { detail: result.data }));
}

function cssEscape(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

window.IndiCareOSCommandPalette = {
  open: openPalette,
  close: closePalette,
  search: (query) => {
    const input = searchInput();
    if (input) input.value = query;
    PALETTE_STATE.query = query;
    PALETTE_STATE.open = true;
    renderResults();
  },
};
