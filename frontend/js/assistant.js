/*
  © 2026 IndiCare. All rights reserved.
  Proprietary and confidential. Unauthorised copying, reproduction,
  reverse engineering, redistribution, or commercial exploitation prohibited.
*/

window.onerror = function (message, source, line, col, error) {
  console.error("window.onerror", { message, source, line, col, error });
};

window.onunhandledrejection = function (event) {
  console.error("unhandledrejection", event.reason);
};

/* ---------------------------------------------------------
 * DOM helpers
 * --------------------------------------------------------- */

const $ = (id) => document.getElementById(id);
const has = (id) => !!document.getElementById(id);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function on(id, event, fn) {
  if (!has(id)) return;
  $(id).addEventListener(event, fn);
}

const safe = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function normArray(value) {
  return Array.isArray(value) ? value : [];
}

function normObj(value) {
  return value && typeof value === "object" ? value : {};
}

/* ---------------------------------------------------------
 * State
 * --------------------------------------------------------- */

const state = {
  conversationId: null,
  currentDocumentText: null,
  currentDocumentName: null,
  isStreaming: false,
  queue: [],
  typing: false,
  lastPrompt: "",
  cache: [],

  currentUser: null,
  adminCreateActive: true,
  adminUsers: [],
  homes: [],
  providers: [],
  docs: [],
  billing: null,
  audit: [],
  libraryDocs: [],
  selectedLibraryDoc: null,
  editingLibraryDocId: null,

  managerUsers: [],
  managerDocuments: [],

  indicareVoice: null,
  speechEnabled: false,
  speechReady: false,
  availableVoices: [],

  currentIntent: "general",
  lastAssistantText: "",

  currentStreamMeta: {
    sources: [],
    runtime: {},
    explainability: {},
  },

  currentProgressLines: [],

  contextState: {
    child: "",
    home: "",
    shift: "",
  },

  workspaceContext: {
    youngPersonId: null,
    youngPersonName: "",
    home: "",
    view: "",
  },

  themePreference: "system",
  systemPrefersDark: false,
  personality: "default",
};

/* ---------------------------------------------------------
 * Constants
 * --------------------------------------------------------- */

const DEFAULT_LANGUAGE = "en-GB";
const THEME_PREF_KEY = "indicare_theme_pref";
const LEGACY_THEME_KEY = "indicare_theme";
const PERSONALITY_KEY = "indicare_personality";

const REG_PROMPT =
  " [SYSTEM: Verify response against Ofsted SCCIF and Quality Standards for Children's Homes. Use a calm, professional, safeguarding-aware tone. Keep wording clear, factual, structured, and suitable for care records, management review, and professional communication. Avoid slang, exaggeration, or overly casual wording.]";

const RESP = {
  quick: "Fast",
  balanced: "Balanced",
  deep: "Detailed",
};

const LANG = {
  "en-GB": "English",
  "pl-PL": "Polish",
  "ro-RO": "Romanian",
  "ur-PK": "Urdu",
  ar: "Arabic",
};

const PERSONALITIES = {
  default:
    "You are IndiCare Assistant. Be calm, clear, balanced, and safeguarding-aware.",
  warm:
    "You are IndiCare Assistant. Be warm, reassuring, human, and supportive while staying professional and clear.",
  clear:
    "You are IndiCare Assistant. Be concise, direct, structured, and easy to scan.",
  professional:
    "You are IndiCare Assistant. Be formal, precise, professional, and suitable for management or external review.",
  supportive:
    "You are IndiCare Assistant. Be encouraging, thoughtful, calm, and practical while staying professional.",
};

const LEGAL_VERSION = "2026-03-29-v1";
const LEGAL_ACCEPTANCE_KEY = "indicare_legal_acceptance";
const LEGAL_TABS = ["terms", "privacy", "ip", "acceptance"];
const ASSISTANT_REDIRECT_GUARD_KEY = "indicare_assistant_redirect_guard";
const ASSISTANT_BOOTSTRAP_KEY = "indicare_assistant_bootstrap";
const WORKSPACE_CONTEXT_KEY = "indicare_workspace_context";

/* ---------------------------------------------------------
 * Derived helpers
 * --------------------------------------------------------- */

const role = () => String(state.currentUser?.role || "").toLowerCase();
const isAdmin = () => ["admin", "provider_admin"].includes(role());
const isManager = () => role() === "manager";
const isStaff = () => role() === "staff";
const isRi = () => role() === "ri";
const canManageLibrary = () => isAdmin() || isManager() || isRi();

const selectedLang = () =>
  has("lang") ? $("lang").value || DEFAULT_LANGUAGE : DEFAULT_LANGUAGE;

const selectedMode = () =>
  has("mode") ? $("mode").value || "balanced" : "balanced";

const selectedPersonality = () =>
  has("personality") ? $("personality").value || "default" : state.personality || "default";

const firstName = () =>
  state.currentUser?.first_name || localStorage.getItem("first_name") || "there";

/* ---------------------------------------------------------
 * Time / theme helpers
 * --------------------------------------------------------- */

function currentHour() {
  try {
    return new Date().getHours();
  } catch {
    return 12;
  }
}

function timeOfDayLabel() {
  const h = currentHour();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function greetingForUser(name = firstName()) {
  const tod = timeOfDayLabel();
  const cleanName = String(name || "there").trim();
  return `Good ${tod}, ${cleanName}.`;
}

function supportingWelcomeCopy() {
  const tod = timeOfDayLabel();
  if (tod === "morning") {
    return "Start the day with records, policy support, drafting, safeguarding guidance, and operational tasks in one place.";
  }
  if (tod === "afternoon") {
    return "Pick up records, policy, drafting, safeguarding support, and day-to-day operational work from one clear front door.";
  }
  return "Use Assistant to support handover, records, policy, safeguarding guidance, and the rest of the day’s operational work.";
}

function systemThemeMode() {
  return state.systemPrefersDark ? "dark" : "light";
}

function resolvedThemeMode() {
  if (state.themePreference === "dark") return "dark";
  if (state.themePreference === "light") return "light";
  return systemThemeMode();
}

function themeSummaryLabel() {
  const pref = state.themePreference;
  const resolved = resolvedThemeMode();

  if (pref === "system") {
    return `Theme: System (${resolved === "dark" ? "dark" : "light"})`;
  }

  return `Theme: ${resolved === "dark" ? "Dark" : "Light"}`;
}

function themeAwarePillText() {
  const mode = resolvedThemeMode();
  return mode === "dark" ? "Optimised for dark mode" : "Optimised for light mode";
}

/* ---------------------------------------------------------
 * CSRF helpers
 * --------------------------------------------------------- */

function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + escaped + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[2]) : "";
}

function getCsrfToken() {
  return getCookie("__Host-indicare_csrf") || getCookie("indicare_csrf") || "";
}

function withCsrfHeaders(method, headers = {}) {
  const normalisedMethod = String(method || "GET").toUpperCase();
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(normalisedMethod);
  const nextHeaders = { ...headers };

  if (needsCsrf) {
    const token = getCsrfToken();
    if (token) nextHeaders["X-CSRF-Token"] = token;
  }

  return nextHeaders;
}

/* ---------------------------------------------------------
 * Basic UI helpers
 * --------------------------------------------------------- */

function banner(text, ms = 2400) {
  const el = $("status");
  if (!el) return;

  el.textContent = text;
  el.style.display = "block";

  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => {
    el.style.display = "none";
  }, ms);
}

function stripSystem(s) {
  return String(s || "").replace(/\s*\[SYSTEM:[\s\S]*$/i, "").trim();
}

function setTitle(title = "Assistant") {
  if (has("title")) $("title").textContent = title;
}

function resize() {
  if (!has("input")) return;
  const input = $("input");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

function docShow(name) {
  if (!has("docText") || !has("doc")) return;
  $("docText").textContent = name || "";
  $("doc").classList.add("show");
}

function docHide() {
  if (!has("docText") || !has("doc")) return;
  $("docText").textContent = "";
  $("doc").classList.remove("show");
}

function applyResolvedTheme() {
  document.body.classList.toggle("theme-dark", resolvedThemeMode() === "dark");

  if (has("theme")) {
    $("theme").classList.toggle("active", resolvedThemeMode() === "dark");
  }

  if (has("themeLabel")) {
    $("themeLabel").textContent = themeSummaryLabel();
  }

  if (has("themeAwarePill")) {
    $("themeAwarePill").textContent = themeAwarePillText();
  }

  try {
    const themeColor = resolvedThemeMode() === "dark" ? "#0f172a" : "#f6f8fb";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeColor);
  } catch {}
}

function updateVoiceReplyToggles() {
  $$(".voice-replies-toggle").forEach((btn) => {
    btn.classList.toggle("active", state.speechEnabled);
    if (btn.tagName === "BUTTON" && btn.textContent.trim() === "Voice replies") {
      btn.textContent = state.speechEnabled ? "Voice replies on" : "Voice replies";
    }
  });
}

function syncHelpers() {
  if (has("langHelp")) {
    $("langHelp").textContent = `Assistant replies in ${
      LANG[selectedLang()] || "English"
    }.`;
  }

  if (has("modeHelp")) {
    $("modeHelp").textContent = `Mode: ${RESP[selectedMode()]}`;
  }

  if (has("privacy") && has("app")) {
    $("privacy").classList.toggle(
      "active",
      $("app").classList.contains("privacy-active")
    );
  }

  if (has("adminActiveToggle")) {
    $("adminActiveToggle").classList.toggle("active", state.adminCreateActive);
  }

  updateVoiceReplyToggles();
  applyResolvedTheme();
}

function userInitials() {
  const full =
    [state.currentUser?.first_name, state.currentUser?.last_name]
      .filter(Boolean)
      .join(" ") || firstName();

  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Y";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function setWelcome() {
  if (has("welcomeTitle")) {
    $("welcomeTitle").textContent = greetingForUser(firstName());
  }

  if (has("welcomeText")) {
    $("welcomeText").textContent = supportingWelcomeCopy();
  }

  if (has("themeAwarePill")) {
    $("themeAwarePill").textContent = themeAwarePillText();
  }
}

function indiCareCopy(key) {
  const map = {
    libraryLoadFail: "The library could not be loaded just now.",
    managerLoadFail: "The manager panel could not be loaded just now.",
    adminLoadFail: "The admin panel could not be loaded just now.",
    conversationsLoadFail: "Conversations could not be loaded just now.",
    adminDataLoadFail: "Admin data could not be loaded just now.",
    uploadFail: "The document could not be uploaded just now.",
    speechUnsupported: "Speech to text is not available on this device.",
    speechFailed: "Speech input could not be completed.",
    documentRemoved: "Document removed.",
    copied: "Copied.",
    updated: "Updated successfully.",
    saved: "Saved successfully.",
    deleted: "Deleted successfully.",
    contextSaved: "Context saved.",
  };
  return map[key] || "";
}

function scrollMessagesToBottom() {
  if (!has("messages")) return;
  $("messages").scrollTop = $("messages").scrollHeight;
}

/* ---------------------------------------------------------
 * Theme management
 * --------------------------------------------------------- */

function readStoredThemePreference() {
  const next = localStorage.getItem(THEME_PREF_KEY);
  if (next === "light" || next === "dark" || next === "system") return next;

  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === "light" || legacy === "dark") return legacy;

  return "system";
}

function saveThemePreference(pref) {
  state.themePreference = pref;
  localStorage.setItem(THEME_PREF_KEY, pref);
  if (pref === "light" || pref === "dark") {
    localStorage.setItem(LEGACY_THEME_KEY, pref);
  } else {
    localStorage.removeItem(LEGACY_THEME_KEY);
  }
  applyResolvedTheme();
  setWelcome();
  syncHelpers();
}

function cycleThemePreference() {
  const order = ["system", "light", "dark"];
  const idx = order.indexOf(state.themePreference);
  const next = order[(idx + 1) % order.length];
  saveThemePreference(next);
  banner(themeSummaryLabel());
}

function initSystemThemeListener() {
  try {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    state.systemPrefersDark = !!media.matches;

    const handler = (event) => {
      state.systemPrefersDark = !!event.matches;
      if (state.themePreference === "system") {
        applyResolvedTheme();
        setWelcome();
        syncHelpers();
      }
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
    } else if (typeof media.addListener === "function") {
      media.addListener(handler);
    }
  } catch {
    state.systemPrefersDark = false;
  }
}

/* ---------------------------------------------------------
 * Personality
 * --------------------------------------------------------- */

function loadPersonalityPref() {
  state.personality = localStorage.getItem(PERSONALITY_KEY) || "default";
  if (has("personality")) {
    $("personality").value = state.personality;
  }
}

function savePersonalityPref() {
  state.personality = selectedPersonality();
  localStorage.setItem(PERSONALITY_KEY, state.personality);
}

function personalityPrompt() {
  return PERSONALITIES[selectedPersonality()] || PERSONALITIES.default;
}

/* ---------------------------------------------------------
 * Redirect guard
 * --------------------------------------------------------- */

function hasRecentAssistantRedirectGuard() {
  try {
    const raw = sessionStorage.getItem(ASSISTANT_REDIRECT_GUARD_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!ts) return false;
    return Date.now() - ts < 5000;
  } catch (_) {
    return false;
  }
}

function markAssistantRedirectGuard() {
  try {
    sessionStorage.setItem(
      ASSISTANT_REDIRECT_GUARD_KEY,
      String(Date.now())
    );
  } catch (_) {}
}

function clearAssistantRedirectGuard() {
  try {
    sessionStorage.removeItem(ASSISTANT_REDIRECT_GUARD_KEY);
  } catch (_) {}
}

/* ---------------------------------------------------------
 * Settings / modal UI
 * --------------------------------------------------------- */

function openSettings() {
  if (has("settingsOverlay")) $("settingsOverlay").classList.add("show");
  if (has("settings")) $("settings").classList.add("open");
}

function closeSettings() {
  if (has("settingsOverlay")) $("settingsOverlay").classList.remove("show");
  if (has("settings")) $("settings").classList.remove("open");
}

/* ---------------------------------------------------------
 * Text formatting
 * --------------------------------------------------------- */

function summariseTitle(text) {
  const clean = stripSystem(text)
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "New Conversation";

  const stop = new Set([
    "the","a","an","and","or","but","for","with","from","about","who","what",
    "when","where","why","how","are","is","do","does","did","please","tell",
    "write","good","morning","afternoon","evening","indicare","assistant",
  ]);

  const words = clean.split(" ").filter(Boolean);
  const pool = words.filter((w) => !stop.has(w.toLowerCase()));
  const picked = (pool.length ? pool : words).slice(0, 3);

  return (
    picked.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") ||
    "New Conversation"
  );
}

function beautify(text) {
  let out = String(text || "").trim();

  out = out
    .replace(/([a-z]):(?=[A-Z])/g, "$1:\n")
    .replace(/What matters most here:/gi, "### What matters most here")
    .replace(/Key points:/gi, "### Key points")
    .replace(/Suggested staff response \/ next steps:/gi, "### Suggested next steps")
    .replace(/What should be recorded \/ handed over \/ reviewed if relevant:/gi, "### Recording and handover")
    .replace(/- /g, "\n- ")
    .replace(/\.\s+(?=[A-Z])/g, ".\n\n")
    .replace(/\n{3,}/g, "\n\n");

  return out;
}

function render(text, roleName = "assistant") {
  let s = safe(roleName === "assistant" ? beautify(text) : text)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  const lines = s.split("\n");
  let html = "";
  let list = false;

  for (const line of lines) {
    if (/^\s*-\s+/.test(line)) {
      if (!list) {
        html += "<ul>";
        list = true;
      }
      html += `<li>${line.replace(/^\s*-\s+/, "")}</li>`;
    } else {
      if (list) {
        html += "</ul>";
        list = false;
      }
      html +=
        line.trim() === ""
          ? "<br>"
          : /^<h3>.*<\/h3>$/.test(line)
          ? line
          : `<p>${line}</p>`;
    }
  }

  if (list) html += "</ul>";
  return html;
}

function cleanSpeechText(text) {
  return String(text || "")
    .replace(/###\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------------------------------------------------
 * Intent / prompt helpers
 * --------------------------------------------------------- */

function detectIntent(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("incident")) return "incident";
  if (t.includes("risk")) return "risk";
  if (t.includes("handover")) return "handover";
  if (t.includes("chronology")) return "chronology";
  if (t.includes("keywork")) return "keywork";
  if (t.includes("review")) return "review";
  if (t.includes("safeguard")) return "safeguarding";
  if (t.includes("daily note")) return "daily_note";
  if (t.includes("report")) return "report";
  if (t.includes("policy")) return "policy";
  return "general";
}

function buildStructuredPrompt(intent) {
  const map = {
    incident:
      "Respond as a professional incident record using factual, neutral language. Include headings: Summary, What happened, Staff response, Outcome, Follow-up.",
    risk:
      "Generate a structured risk assessment. Include headings: Presenting risks, Triggers, Protective factors, Staff actions, Review actions.",
    handover:
      "Write a clear handover summary for the next shift. Include: Key events, Risks, Actions completed, Outstanding actions.",
    chronology:
      "Write a factual chronology entry in neutral language, suitable for care records.",
    keywork:
      "Write a keywork record with discussion, young person's views, support given, and next steps.",
    review:
      "Write a formal review summary aligned with care standards and Ofsted expectations.",
    safeguarding:
      "Write a safeguarding-focused response prioritising risk, protection, immediate actions, and recording expectations.",
    daily_note:
      "Write a daily note suitable for care records using clear, factual wording.",
    report:
      "Write a formal report summary using structured, professional language.",
    policy:
      "Summarise the most relevant policy, procedure, or guidance clearly and professionally. Highlight key expectations, actions, and compliance points.",
    general: "Respond clearly and professionally for care documentation.",
  };

  return map[intent] || map.general;
}

function copilotPrompt() {
  const mode = has("copilot") ? $("copilot").value : "default";

  if (mode === "safeguarding") {
    return "You are IndiCare Safeguarding Copilot. Prioritise immediate safety, risk, protection, and accurate recording.";
  }
  if (mode === "manager") {
    return "You are IndiCare Manager Copilot. Focus on oversight, accountability, actions, and compliance.";
  }
  if (mode === "ofsted") {
    return "You are IndiCare Compliance Copilot. Write in a way that is defensible, inspection evidence preparation, and aligned to standards.";
  }
  if (mode === "documentation") {
    return "You are IndiCare Documentation Copilot. Produce clear, factual, well-structured records ready to paste.";
  }

  return personalityPrompt();
}

function buildLangInstruction() {
  return selectedLang() === DEFAULT_LANGUAGE
    ? ""
    : ` [SYSTEM: Reply in ${LANG[selectedLang()]}. Keep safeguarding, care, and formal documentation wording clear and professional.]`;
}

function convertPrompt(type) {
  const prompts = {
    incident: "Convert the last response into a formal incident report.",
    risk: "Convert the last response into a full risk assessment.",
    handover: "Rewrite the last response as a handover summary.",
    chronology: "Rewrite the last response as a chronology entry.",
    keywork: "Rewrite the last response as a keywork record.",
    review: "Rewrite the last response as a manager review summary.",
  };

  return prompts[type] || "Rewrite the last response in a more formal structured format.";
}

/* ---------------------------------------------------------
 * Context
 * --------------------------------------------------------- */

function loadContextState() {
  try {
    state.contextState = JSON.parse(
      localStorage.getItem("indicare_context_state") || "{}"
    );
  } catch {
    state.contextState = {};
  }

  state.contextState = {
    child: state.contextState.child || "",
    home: state.contextState.home || "",
    shift: state.contextState.shift || "",
  };

  if (has("contextChild")) $("contextChild").value = state.contextState.child;
  if (has("contextHome")) $("contextHome").value = state.contextState.home;
  if (has("contextShift")) $("contextShift").value = state.contextState.shift;
}

function renderContextSummary() {
  return;
}

function saveContextState() {
  state.contextState = {
    child: has("contextChild") ? $("contextChild").value.trim() : "",
    home: has("contextHome") ? $("contextHome").value.trim() : "",
    shift: has("contextShift") ? $("contextShift").value.trim() : "",
  };

  localStorage.setItem("indicare_context_state", JSON.stringify(state.contextState));
  renderContextSummary();
  banner(indiCareCopy("contextSaved"));
}

function applyAssistantBootstrap() {
  let payload = null;

  try {
    payload = JSON.parse(localStorage.getItem(ASSISTANT_BOOTSTRAP_KEY) || "null");
  } catch {
    payload = null;
  }

  if (!payload) return;

  localStorage.removeItem(ASSISTANT_BOOTSTRAP_KEY);

  const nextContext = {
    child: payload.youngPersonName || state.contextState.child || "",
    home: state.contextState.home || "",
    shift: payload.view
      ? String(payload.view).replaceAll("-", " ")
      : state.contextState.shift || "",
  };

  state.contextState = nextContext;
  localStorage.setItem("indicare_context_state", JSON.stringify(nextContext));

  if (has("contextChild")) $("contextChild").value = nextContext.child;
  if (has("contextHome")) $("contextHome").value = nextContext.home;
  if (has("contextShift")) $("contextShift").value = nextContext.shift;

  if (payload.prompt && has("input")) {
    $("input").value = payload.prompt;
    resize();
  }

  if (payload.youngPersonName) {
    banner(`Context loaded for ${payload.youngPersonName}.`, 3200);
  }
}

function loadWorkspaceContext() {
  try {
    state.workspaceContext = {
      youngPersonId: null,
      youngPersonName: "",
      home: "",
      view: "",
      ...(JSON.parse(localStorage.getItem(WORKSPACE_CONTEXT_KEY) || "{}") || {}),
    };
  } catch {
    state.workspaceContext = {
      youngPersonId: null,
      youngPersonName: "",
      home: "",
      view: "",
    };
  }
}

function saveWorkspaceContext(payload = {}) {
  state.workspaceContext = {
    ...state.workspaceContext,
    ...payload,
  };

  localStorage.setItem(WORKSPACE_CONTEXT_KEY, JSON.stringify(state.workspaceContext));
}

function buildYoungPeopleUrl() {
  const params = new URLSearchParams();

  if (state.workspaceContext.youngPersonId) {
    params.set("id", String(state.workspaceContext.youngPersonId));
  }

  const query = params.toString();
  return query ? `/young-people-shell?${query}` : "/young-people-shell";
}

function buildContextBlock() {
  const lines = [];
  if (state.contextState.child) lines.push(`Current focus: ${state.contextState.child}`);
  if (state.contextState.home) lines.push(`Current home: ${state.contextState.home}`);
  if (state.contextState.shift) lines.push(`Current context: ${state.contextState.shift}`);
  return lines.length ? `[CONTEXT]\n${lines.join("\n")}\n\n` : "";
}

/* ---------------------------------------------------------
 * Copilot / prefs
 * --------------------------------------------------------- */

function loadCopilotPref() {
  if (!has("copilot")) return;
  $("copilot").value = localStorage.getItem("indicare_copilot_mode") || "default";
}

function saveCopilotPref() {
  if (!has("copilot")) return;
  localStorage.setItem("indicare_copilot_mode", $("copilot").value);
}

/* ---------------------------------------------------------
 * Legal gate
 * --------------------------------------------------------- */

function legalStoragePayload() {
  try {
    return JSON.parse(localStorage.getItem(LEGAL_ACCEPTANCE_KEY) || "{}");
  } catch {
    return {};
  }
}

function legalAcceptanceValid() {
  const data = legalStoragePayload();
  return !!(data.accepted && data.version === LEGAL_VERSION);
}

function storeLegalAcceptance() {
  const payload = {
    accepted: true,
    version: LEGAL_VERSION,
    accepted_at: new Date().toISOString(),
    user_id: state.currentUser?.id || null,
    email: state.currentUser?.email || null,
  };
  localStorage.setItem(LEGAL_ACCEPTANCE_KEY, JSON.stringify(payload));
}

function clearLegalAcceptance() {
  localStorage.removeItem(LEGAL_ACCEPTANCE_KEY);
}

async function logLegalAcceptanceToServer() {
  try {
    await api("/auth/legal-acceptance", {
      method: "POST",
      body: JSON.stringify({
        version: LEGAL_VERSION,
        accepted_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn("Legal acceptance log skipped:", e?.message || e);
  }
}

function setLegalTab(name = "terms") {
  const tab = LEGAL_TABS.includes(name) ? name : "terms";

  document.querySelectorAll("[data-legal-tab]").forEach((btn) => {
    const active = btn.dataset.legalTab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll("[data-legal-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.legalPanel !== tab);
  });
}

function legalControlsDisabled(disabled) {
  [
    "send", "input", "upload", "mic", "newChat", "navAssistant",
    "navLibrary", "navManager", "navAdmin", "openSettings",
    "sideToggle", "mobileMenu",
  ].forEach((id) => {
    if (!has(id)) return;
    $(id).disabled = !!disabled;
  });
}

function openLegalModal(tab = "terms", force = false) {
  if (!has("legalModal") || !has("legalOverlay")) return;

  setLegalTab(tab);
  $("legalOverlay").classList.add("show");
  $("legalModal").classList.add("open");
  $("legalOverlay").setAttribute("aria-hidden", "false");

  if (force) {
    $("legalModal").dataset.force = "true";
    if (has("closeLegalModal")) $("closeLegalModal").style.display = "none";
  } else {
    $("legalModal").dataset.force = "false";
    if (has("closeLegalModal")) $("closeLegalModal").style.display = "";
  }
}

function closeLegalModal() {
  if (!has("legalModal") || !has("legalOverlay")) return;
  const forced = $("legalModal").dataset.force === "true";
  if (forced && !legalAcceptanceValid()) return;

  $("legalOverlay").classList.remove("show");
  $("legalModal").classList.remove("open");
  $("legalOverlay").setAttribute("aria-hidden", "true");
}

function allLegalChecksPassed() {
  return !!(
    has("acceptTermsCheck") &&
    has("acceptPrivacyCheck") &&
    has("acceptIPCheck") &&
    $("acceptTermsCheck").checked &&
    $("acceptPrivacyCheck").checked &&
    $("acceptIPCheck").checked
  );
}

async function acceptLegalTerms() {
  if (!allLegalChecksPassed()) {
    setLegalTab("acceptance");
    return banner("Please tick all acceptance boxes before continuing.");
  }

  storeLegalAcceptance();
  await logLegalAcceptanceToServer();
  legalControlsDisabled(false);
  closeLegalModal();
  banner("Legal terms accepted.");
}

async function declineLegalTerms() {
  clearLegalAcceptance();
  banner("You must accept the legal terms to use IndiCare OS.");
  await logoutNow();
}

function enforceLegalGate() {
  const accepted = legalAcceptanceValid();
  legalControlsDisabled(!accepted);

  if (!accepted) {
    openLegalModal("terms", true);
  } else {
    closeLegalModal();
  }
}

/* ---------------------------------------------------------
 * Speech
 * --------------------------------------------------------- */

function stopSpeaking() {
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch {}
}

function speakText(text) {
  if (!state.speechEnabled) return;
  if (!("speechSynthesis" in window)) return;

  const clean = cleanSpeechText(text);
  if (!clean) return;

  try {
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-GB";
    utterance.rate = 0.98;
    utterance.pitch = 1.02;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("speakText failed", e);
  }
}

function loadVoicePref() {
  state.speechEnabled =
    localStorage.getItem("indicare_voice_replies") === "true";
  updateVoiceReplyToggles();
}

function setVoicePref(value) {
  state.speechEnabled = !!value;
  localStorage.setItem("indicare_voice_replies", String(state.speechEnabled));
  updateVoiceReplyToggles();
}

function initSpeech() {
  if (!("speechSynthesis" in window)) {
    state.speechReady = false;
    updateVoiceReplyToggles();
    return;
  }
  state.speechReady = true;
}

function startSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return banner(indiCareCopy("speechUnsupported"));

  const rec = new SR();
  rec.lang = selectedLang() || "en-GB";
  rec.interimResults = true;
  rec.continuous = false;

  if (has("mic")) $("mic").style.color = "var(--accent)";

  rec.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i += 1) {
      text += `${e.results[i][0].transcript} `;
    }
    if (has("input")) $("input").value = text.trim();
    resize();
  };

  rec.onerror = () => banner(indiCareCopy("speechFailed"));
  rec.onend = () => {
    if (has("mic")) $("mic").style.color = "";
  };

  rec.start();
}

/* ---------------------------------------------------------
 * API
 * --------------------------------------------------------- */

function redirectFor403(data) {
  if (data?.code === "mfa_setup_required") {
    markAssistantRedirectGuard();
    window.location.replace("/mfa-setup");
    return true;
  }

  if (data?.code === "mfa_verification_required") {
    markAssistantRedirectGuard();
    window.location.replace("/mfa");
    return true;
  }

  return false;
}

async function api(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const isFormData = options.body instanceof FormData;

  const headers = withCsrfHeaders(method, {
    ...(options.headers || {}),
  });

  if (!isFormData && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    method,
    credentials: "include",
    headers,
  });

  const type = res.headers.get("content-type") || "";
  let data = null;

  try {
    if (type.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = text ? { detail: text } : {};
    }
  } catch {
    data = {};
  }

  if (res.status === 401) {
    throw new Error("Not authenticated");
  }

  if (res.status === 403 && redirectFor403(data)) {
    return null;
  }

  if (!res.ok) {
    const message =
      data?.detail ||
      data?.error ||
      `${res.status}: ${res.statusText || "Request failed"}`;
    throw new Error(message);
  }

  return data || {};
}

/* ---------------------------------------------------------
 * Auth / session
 * --------------------------------------------------------- */

async function logoutNow() {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: withCsrfHeaders("POST"),
    });
  } catch {}

  localStorage.removeItem("current_user");
  localStorage.removeItem("indicare_remember_me");
  localStorage.removeItem("first_name");
  sessionStorage.removeItem("current_user");
  sessionStorage.removeItem("indicare_login_redirect_guard");
  sessionStorage.removeItem("indicare_assistant_redirect_guard");
  sessionStorage.removeItem("indicare_recovery_codes");

  window.location.replace("/login");
}

async function loadMe() {
  try {
    if (window.auth && typeof window.auth.validateSession === "function") {
      const sessionState = await window.auth.validateSession();

      if (!sessionState || !sessionState.authenticated) {
        if (!hasRecentAssistantRedirectGuard()) {
          markAssistantRedirectGuard();
          window.location.replace("/login");
        }
        throw new Error("Not authenticated");
      }

      if (!sessionState.mfa_enabled) {
        if (!hasRecentAssistantRedirectGuard()) {
          markAssistantRedirectGuard();
          window.location.replace("/mfa-setup");
        }
        throw new Error("MFA setup required");
      }

      if (!sessionState.mfa_verified) {
        if (!hasRecentAssistantRedirectGuard()) {
          markAssistantRedirectGuard();
          window.location.replace("/mfa");
        }
        throw new Error("MFA verification required");
      }
    }

    const data = await api("/auth/me");
    if (!data?.user) throw new Error("No user");

    state.currentUser = data.user;
    localStorage.setItem("first_name", state.currentUser.first_name || "");
    clearAssistantRedirectGuard();

    if (isAdmin() || isManager() || isStaff() || isRi()) {
      has("navYoungPeople") && $("navYoungPeople").classList.remove("hidden");
      has("navLibrary") && $("navLibrary").classList.remove("hidden");
    }

    if (isManager()) {
      has("navManager") && $("navManager").classList.remove("hidden");
    }

    if (isAdmin()) {
      has("navAdmin") && $("navAdmin").classList.remove("hidden");
    }

    if (canManageLibrary()) {
      has("managerEditorTab") && $("managerEditorTab").classList.remove("hidden");
    }

    if (canManageLibrary() && has("libraryUploadBtn")) {
      $("libraryUploadBtn").classList.remove("hidden");
    }
  } catch (e) {
    const message = String(e?.message || "");

    if (/subscription required/i.test(message)) {
      banner("Your account does not currently have an active subscription.");
      throw e;
    }

    if (/mfa/i.test(message)) throw e;

    if (/not authenticated/i.test(message)) {
      if (!hasRecentAssistantRedirectGuard()) {
        markAssistantRedirectGuard();
        window.location.replace("/login");
      }
      throw e;
    }

    throw e;
  }
}

/* ---------------------------------------------------------
 * Panel navigation
 * --------------------------------------------------------- */

function closeMobilePanels() {
  if (window.innerWidth <= 768) {
    has("sidebar") && $("sidebar").classList.remove("open");
    has("overlay") && $("overlay").classList.remove("show");
    closeSettings();
  }
}

function hideAllPanels() {
  ["assistantPanel", "libraryPanel", "managerPanel", "adminPanel"].forEach(
    (id) => has(id) && $(id).classList.add("hidden")
  );

  ["navAssistant", "navYoungPeople", "navLibrary", "navManager", "navAdmin"].forEach(
    (id) => has(id) && $(id).classList.remove("active")
  );
}

function showAssistantView() {
  hideAllPanels();
  has("assistantPanel") && $("assistantPanel").classList.remove("hidden");
  has("inputWrap") && $("inputWrap").classList.remove("hidden");
  has("navAssistant") && $("navAssistant").classList.add("active");
  setTitle("Assistant");
  closeMobilePanels();
}

function showYoungPeopleView() {
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");
  window.location.href = buildYoungPeopleUrl();
}

function showLibraryView() {
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  hideAllPanels();
  has("libraryPanel") && $("libraryPanel").classList.remove("hidden");
  has("inputWrap") && $("inputWrap").classList.add("hidden");
  has("navLibrary") && $("navLibrary").classList.add("active");
  setTitle("Library");
  closeMobilePanels();

  loadLibrary().catch((e) => {
    console.error("showLibraryView failed", e);
    banner(indiCareCopy("libraryLoadFail"));
  });
}

async function showManagerView() {
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");
  if (!isManager()) return banner("Manager access required");

  hideAllPanels();
  has("managerPanel") && $("managerPanel").classList.remove("hidden");
  has("inputWrap") && $("inputWrap").classList.add("hidden");
  has("navManager") && $("navManager").classList.add("active");
  setTitle("Manager");
  closeMobilePanels();

  try {
    await loadManager();
  } catch (e) {
    console.error("showManagerView failed", e);
    banner(e.message || indiCareCopy("managerLoadFail"));
  }
}

async function showAdminView() {
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");
  if (!isAdmin()) return banner("Admin access required");

  hideAllPanels();
  has("adminPanel") && $("adminPanel").classList.remove("hidden");
  has("inputWrap") && $("inputWrap").classList.add("hidden");
  has("navAdmin") && $("navAdmin").classList.add("active");
  setTitle("Admin");
  closeMobilePanels();

  try {
    await loadAdminReferenceData();
    await loadActiveAdminTab();
  } catch (e) {
    console.error("showAdminView failed", e);
    banner(indiCareCopy("adminLoadFail"));
  }
}

function resetWelcome() {
  state.conversationId = null;
  state.currentDocumentText = null;
  state.currentDocumentName = null;
  state.currentStreamMeta = { sources: [], runtime: {}, explainability: {} };
  state.currentProgressLines = [];
  stopSpeaking();

  if (has("messages")) {
    $("messages").innerHTML = "";
    $("messages").classList.add("hidden");
  }

  has("empty") && $("empty").classList.remove("hidden");

  if (has("input")) $("input").value = "";
  resize();
  docHide();
  setTitle("Assistant");
  setWelcome();
  filterConversations();
  closeSettings();
  showAssistantView();
}

/* ---------------------------------------------------------
 * Conversations / history
 * --------------------------------------------------------- */

function renderHistory(rows) {
  if (!has("history")) return;

  const host = $("history");
  host.innerHTML = "";

  normArray(rows).forEach((row) => {
    const item = document.createElement("div");
    item.className = `item ${
      Number(row?.id) === Number(state.conversationId) ? "active" : ""
    }`;

    item.innerHTML = `
      <div class="row">
        <button class="mainbtn">
          <div class="ttl">${safe(stripSystem(row?.title || "Conversation"))}</div>
        </button>
        <button class="mini" aria-label="Copy conversation title">
          <svg class="ui-icon"><use href="#i-copy"></use></svg>
        </button>
        <button class="mini danger" aria-label="Delete conversation">
          <svg class="ui-icon"><use href="#i-trash"></use></svg>
        </button>
      </div>
    `;

    const buttons = item.querySelectorAll("button");
    const main = buttons[0];
    const copy = buttons[1];
    const del = buttons[2];

    if (main) {
      main.onclick = () => {
        if (!legalAcceptanceValid()) return openLegalModal("acceptance");
        showAssistantView();
        openConversation(row?.id, stripSystem(row?.title || "Conversation"));
      };
    }

    if (copy) {
      copy.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(stripSystem(row?.title || "Conversation"));
        banner(indiCareCopy("copied"));
      };
    }

    if (del) {
      del.onclick = async (e) => {
        e.stopPropagation();
        try {
          await deleteConversation(row?.id);
        } catch (err) {
          banner(err?.message || "Could not delete conversation");
        }
      };
    }

    host.appendChild(item);
  });
}

function filterConversations() {
  const q = has("search") ? $("search").value.trim().toLowerCase() : "";

  renderHistory(
    q
      ? state.cache.filter((r) =>
          stripSystem(r?.title || "").toLowerCase().includes(q)
        )
      : state.cache
  );
}

async function loadConversations() {
  const data = await api("/chat/conversations");
  if (!data) return [];

  state.cache = normArray(data?.conversations || data);
  renderHistory(state.cache);
  return state.cache;
}

async function openConversation(id, title) {
  if (!id) return;

  const data = await api(`/chat/conversations/${id}`);
  if (!data) return;

  state.conversationId = id;
  state.currentStreamMeta = { sources: [], runtime: {}, explainability: {} };
  state.currentProgressLines = [];

  if (has("messages")) {
    $("messages").innerHTML = "";
    has("empty") && $("empty").classList.add("hidden");
    $("messages").classList.remove("hidden");
  }

  normArray(data.messages).forEach((m) =>
    appendMessage(m?.role || "assistant", m?.message || "", {
      messageId: m?.id,
    })
  );

  if (data.document) {
    state.currentDocumentText =
      data.document.text || data.document.input_text || "";
    state.currentDocumentName =
      data.document.filename || data.document.name || "";
    docShow(state.currentDocumentName);
  } else {
    state.currentDocumentText = null;
    state.currentDocumentName = null;
    docHide();
  }

  setTitle(title || "Conversation");
  filterConversations();
  closeMobilePanels();
  scrollMessagesToBottom();
}

async function renameShort(id, prompt) {
  if (!id) return;

  const short = summariseTitle(prompt);

  try {
    await api(`/chat/conversations/${id}/rename`, {
      method: "POST",
      body: JSON.stringify({ title: short }),
    });
  } catch (e) {
    console.warn("Rename skipped:", e?.message || e);
  }

  setTitle(short);

  try {
    await loadConversations();
  } catch {}
}

async function deleteConversation(id) {
  if (!id || !confirm("Delete this conversation?")) return;

  await api(`/chat/conversations/${id}`, { method: "DELETE" });

  if (Number(state.conversationId) === Number(id)) {
    resetWelcome();
  }

  await loadConversations();
  banner(indiCareCopy("deleted"));
}

/* ---------------------------------------------------------
 * Sources / meta rendering
 * --------------------------------------------------------- */

function renderSourceCard(source) {
  const type = safe(source?.type || "source");
  const label = safe(source?.label || source?.document_title || "Source");
  const excerpt = safe(source?.excerpt || "");
  const section = safe(source?.section || "");
  const page =
    source?.page_number != null ? safe(String(source.page_number)) : "";
  const url = source?.url ? String(source.url) : "";

  return `
    <div class="entity-row" style="padding:10px 12px;margin-top:8px;">
      <div style="width:100%;">
        <div class="entity-title" style="font-size:.88rem;">${label}</div>
        <div class="entity-meta">
          <span class="tag neutral">${type}</span>
          ${section ? `<span>${section}</span>` : ""}
          ${page ? `<span> · p.${page}</span>` : ""}
        </div>
        ${
          excerpt
            ? `<div class="entity-meta" style="margin-top:8px;line-height:1.55;">${excerpt}</div>`
            : ""
        }
        ${
          url
            ? `<div class="entity-meta" style="margin-top:8px;"><a href="${safe(
                url
              )}" target="_blank" rel="noopener noreferrer">Open source</a></div>`
            : ""
        }
      </div>
    </div>
  `;
}

function renderSourcesHtml(sources) {
  const rows = normArray(sources);
  if (!rows.length) return "";

  return `
    <div class="card" style="margin-top:10px;padding:12px;">
      <div style="font-weight:600;margin-bottom:6px;">Sources used</div>
      <div class="entity-meta">This response used the following source material.</div>
      ${rows.map(renderSourceCard).join("")}
    </div>
  `;
}

function attachMetaToWrap(wrap, meta = {}) {
  if (!wrap) return;

  const block = wrap.querySelector(".block");
  if (!block) return;

  const oldMetaBox = wrap.querySelector(".assistant-source-box");
  if (oldMetaBox) oldMetaBox.remove();

  const html = renderSourcesHtml(meta.sources);
  if (!html) return;

  const box = document.createElement("div");
  box.className = "assistant-source-box";
  box.innerHTML = html;
  block.appendChild(box);
}

function attachMetaToStreamingMessage(meta = {}) {
  const wrap = document.getElementById("streaming");
  if (!wrap) return;
  attachMetaToWrap(wrap, meta);
}

function renderProgressLines(lines = []) {
  const cleaned = normArray(lines)
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .slice(-3);

  if (!cleaned.length) return "";

  return `
    <div class="stream-progress">
      ${cleaned
        .map((line) => `<div class="stream-progress-line">${safe(line)}</div>`)
        .join("")}
    </div>
  `;
}

function updateStreamingProgress() {
  const wrap = document.getElementById("streaming");
  if (!wrap) return;

  const block = wrap.querySelector(".block");
  if (!block) return;

  let box = wrap.querySelector(".stream-progress-box");
  const html = renderProgressLines(state.currentProgressLines);

  if (!html) {
    if (box) box.remove();
    return;
  }

  if (!box) {
    box = document.createElement("div");
    box.className = "stream-progress-box";

    const msg = block.querySelector(".msg");
    if (msg && msg.nextSibling) {
      block.insertBefore(box, msg.nextSibling);
    } else if (msg) {
      block.appendChild(box);
    } else {
      block.prepend(box);
    }
  }

  box.innerHTML = html;
}

function clearStreamingProgress() {
  state.currentProgressLines = [];
  const wrap = document.getElementById("streaming");
  if (!wrap) return;

  const box = wrap.querySelector(".stream-progress-box");
  if (box) box.remove();
}

function handleProgressEvent(payload) {
  let parsed = {};
  try {
    parsed = JSON.parse(payload || "{}");
  } catch {
    parsed = {};
  }

  const content = String(parsed?.content || "").trim();
  if (!content) return;

  state.currentProgressLines.push(content);
  state.currentProgressLines = state.currentProgressLines.filter(Boolean).slice(-3);
  updateStreamingProgress();
}

function handleMetaEvent(payload) {
  let parsed = {};
  try {
    parsed = JSON.parse(payload || "{}");
  } catch {
    parsed = {};
  }

  if (parsed.conversation_id) {
    state.conversationId = Number(parsed.conversation_id);
  }

  state.currentStreamMeta = {
    sources: normArray(parsed.sources),
    runtime: normObj(parsed.runtime),
    explainability: normObj(parsed.explainability),
  };

  attachMetaToStreamingMessage(state.currentStreamMeta);
}

/* ---------------------------------------------------------
 * Messages / chat rendering
 * --------------------------------------------------------- */

function appendMessage(roleName, text, opts = {}) {
  if (!has("messages")) return;

  const shown = roleName === "user" ? stripSystem(text) : text;

  if (roleName === "assistant") {
    state.lastAssistantText = shown;
  }

  const wrap = document.createElement("div");
  wrap.className = `wrap ${roleName}`;
  wrap.innerHTML = `
    <div class="avatar">${roleName === "assistant" ? "IC" : userInitials()}</div>
    <div class="block">
      <div class="msg">${
        roleName === "assistant" ? render(shown, "assistant") : safe(shown)
      }</div>
      ${opts.meta ? `<div class="meta">${safe(opts.meta)}</div>` : ""}
      <div class="actions"></div>
    </div>
  `;

  const actions = wrap.querySelector(".actions");

  const addChip = (label, fn) => {
    if (!actions) return;
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = label;
    btn.onclick = fn;
    actions.appendChild(btn);
  };

  addChip("Copy", () =>
    navigator.clipboard
      .writeText(shown)
      .then(() => banner(indiCareCopy("copied")))
      .catch(() => banner("Could not copy"))
  );

  if (roleName === "assistant") {
    addChip("Read aloud", () => speakText(shown));
    addChip("Stop", stopSpeaking);
    addChip("→ Incident", () => convert("incident"));
    addChip("→ Risk", () => convert("risk"));
    addChip("→ Handover", () => convert("handover"));
    addChip("→ Chronology", () => convert("chronology"));
    addChip("Save to record", () => saveRecord(shown));
    addChip("Continue", () => {
      if (!has("input")) return;
      if (!legalAcceptanceValid()) return openLegalModal("acceptance");
      $("input").value = "Continue and expand this.";
      resize();
      sendMessage();
    });
  }

  if (roleName === "user" && opts.messageId) {
    addChip("Edit", () => editMessage(opts.messageId, shown));
  }

  if (roleName === "assistant" && opts.sources) {
    attachMetaToWrap(wrap, { sources: opts.sources || [] });
  }

  $("messages").appendChild(wrap);
  scrollMessagesToBottom();
}

function createStreamMsg() {
  if (!has("messages")) return null;

  const old = $("streaming");
  if (old) old.remove();

  const wrap = document.createElement("div");
  wrap.id = "streaming";
  wrap.className = "wrap assistant";
  wrap.innerHTML = `
    <div class="avatar">IC</div>
    <div class="block">
      <div class="msg typing" data-raw=""></div>
      <div class="meta">Reply language: ${
        LANG[selectedLang()] || "English"
      } · Mode: ${RESP[selectedMode()]}</div>
    </div>
  `;

  $("messages").appendChild(wrap);
  updateStreamingProgress();
  scrollMessagesToBottom();

  return wrap;
}

function startTyping() {
  if (state.typing) return;
  state.typing = true;

  const el = document.querySelector("#streaming .msg");
  if (!el) {
    state.typing = false;
    return;
  }

  let raw = el.getAttribute("data-raw") || "";

  const tick = setInterval(() => {
    if (state.queue.length) {
      raw += state.queue.shift();
      el.innerHTML = render(raw, "assistant");
      el.setAttribute("data-raw", raw);
      scrollMessagesToBottom();
    } else if (!state.isStreaming) {
      clearInterval(tick);
      state.typing = false;
      el.classList.remove("typing");

      const finalRaw = el.getAttribute("data-raw") || "";
      state.lastAssistantText = finalRaw;
      clearStreamingProgress();
      attachMetaToStreamingMessage(state.currentStreamMeta);
      speakText(finalRaw);
      scrollMessagesToBottom();
    }
  }, 2);
}

/* ---------------------------------------------------------
 * SSE / streaming
 * --------------------------------------------------------- */

function parseSseChunk(buffer, onEvent) {
  const parts = buffer.split("\n\n");
  const complete = parts.slice(0, -1);
  const remainder = parts[parts.length - 1] || "";

  for (const block of complete) {
    const lines = block.split("\n");
    let eventName = "message";
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.startsWith("data: ") ? line.slice(6) : line.slice(5));
      }
    }

    const data = dataLines.join("\n");
    onEvent(eventName, data);
  }

  return remainder;
}

async function stream(url, body) {
  body = normObj(body);

  state.currentIntent = body.intent || detectIntent(body.message || "");
  state.currentStreamMeta = { sources: [], runtime: {}, explainability: {} };
  state.currentProgressLines = [];

  const promptPrefix =
    copilotPrompt() +
    "\n\n" +
    buildContextBlock() +
    buildStructuredPrompt(state.currentIntent) +
    "\n\n";

  body.message =
    promptPrefix +
    String(body.message || "") +
    REG_PROMPT +
    buildLangInstruction();

  body.intent = state.currentIntent;
  body.structured = true;
  body.reply_language = selectedLang();
  body.reply_language_label = LANG[selectedLang()] || "English";
  body.response_mode = selectedMode();
  body.context = state.contextState;
  body.theme_mode = resolvedThemeMode();
  body.personality = selectedPersonality();

  const headers = withCsrfHeaders("POST", {
    "Content-Type": "application/json",
  });

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";

  if (res.status === 401) {
    markAssistantRedirectGuard();
    window.location.replace("/login");
    return;
  }

  if (res.status === 403) {
    let data = {};
    try {
      if (contentType.includes("application/json")) {
        data = await res.json();
      }
    } catch {}
    if (redirectFor403(data)) return;
    throw new Error(data?.detail || "403: Access denied");
  }

  if (!res.ok) {
    throw new Error((await res.text()) || `Chat request failed (${res.status})`);
  }

  if (!res.body || contentType.includes("application/json")) {
    let data = {};
    try {
      data = await res.json();
    } catch {}

    const reply = data.reply || data.message || data.output || "Done.";
    appendMessage("assistant", reply, {
      sources: normArray(data.sources),
    });
    speakText(reply);
    return;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";

  createStreamMsg();
  state.queue.push(" ");
  startTyping();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += dec.decode(value, { stream: true });

    buffer = parseSseChunk(buffer, (eventName, payload) => {
      if (eventName === "done" || payload === "[DONE]") return;

      if (eventName === "meta") {
        handleMetaEvent(payload);
        return;
      }

      if (eventName === "progress") {
        handleProgressEvent(payload);
        return;
      }

      if (eventName === "message") {
        if (!payload) return;
        for (const ch of payload) state.queue.push(ch);
        startTyping();
      }
    });
  }
}

/* ---------------------------------------------------------
 * Chat actions
 * --------------------------------------------------------- */

function convert(type) {
  if (!state.lastAssistantText || !has("input")) return;
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  $("input").value = `${convertPrompt(type)}\n\n${state.lastAssistantText}`;
  resize();
  sendMessage();
}

async function saveRecord(text) {
  try {
    await api("/records/save", {
      method: "POST",
      body: JSON.stringify({
        content: text,
        type: detectIntent(text),
        conversation_id: state.conversationId,
        context: state.contextState,
      }),
    });
    banner("Saved to record");
  } catch (e) {
    banner(e.message || "Save failed");
  }
}

async function uploadDoc(file) {
  const fd = new FormData();
  fd.append("file", file);
  if (state.conversationId) fd.append("conversation_id", state.conversationId);

  const data = await api("/chat/upload", { method: "POST", body: fd });
  if (!data) return;

  state.currentDocumentText = data?.text || data?.document_text || "";
  state.currentDocumentName = data?.filename || data?.name || file?.name || "";
  docShow(state.currentDocumentName);
  banner(`Document attached: ${state.currentDocumentName}`);
}

async function uploadLibraryDocument(file) {
  const fd = new FormData();
  fd.append("file", file);

  const data = await api("/documents/library/upload", {
    method: "POST",
    body: fd,
  });

  banner(data?.message || "Library document uploaded");
  await loadLibrary();
}

async function editMessage(messageId, currentText) {
  if (!messageId) return;
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  const edited = prompt("Edit message", currentText);
  if (edited === null) return;

  const cleaned = stripSystem(edited).trim();
  if (!cleaned) return banner("Message cannot be empty");

  state.isStreaming = true;
  if (has("send")) $("send").disabled = true;

  try {
    await stream(`/chat/messages/${messageId}/edit`, {
      message: cleaned,
      intent: detectIntent(cleaned),
      structured: true,
      document_text: state.currentDocumentText,
      document_name: state.currentDocumentName,
      response_mode: selectedMode(),
    });

    if (state.conversationId) {
      await openConversation(
        state.conversationId,
        has("title") ? $("title").textContent : "Conversation"
      );
    }

    banner(indiCareCopy("updated"));
  } catch (e) {
    banner(e.message || "Edit failed");
  } finally {
    state.isStreaming = false;
    if (has("send")) $("send").disabled = false;
  }
}

async function sendMessage() {
  if (!has("input")) return;
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  const raw = $("input").value.trim();
  const text = stripSystem(raw);

  if (!text || state.isStreaming) return;

  const prevConversationId = state.conversationId;
  state.lastPrompt = text;
  state.currentIntent = detectIntent(text);

  state.isStreaming = true;
  if (has("send")) $("send").disabled = true;

  if (has("empty")) $("empty").classList.add("hidden");
  if (has("messages")) $("messages").classList.remove("hidden");

  appendMessage("user", text, {
    meta: `Mode: ${RESP[selectedMode()]} · Intent: ${state.currentIntent}`,
  });

  $("input").value = "";
  resize();

  try {
    await stream("/chat/", {
      message: text,
      intent: state.currentIntent,
      structured: true,
      conversation_id: state.conversationId,
      document_text: state.currentDocumentText,
      document_name: state.currentDocumentName,
    });
  } catch (e) {
    const streamEl = document.querySelector("#streaming .msg");

    if (streamEl) {
      streamEl.classList.remove("typing");
      streamEl.innerHTML = render(
        `Sorry, there was a problem: ${e.message}`,
        "assistant"
      );
      clearStreamingProgress();
      attachMetaToStreamingMessage(state.currentStreamMeta);
    } else {
      appendMessage("assistant", `Sorry, there was a problem: ${e.message}`);
    }
  } finally {
    state.isStreaming = false;
    if (has("send")) $("send").disabled = false;

    try {
      await loadConversations();

      if (!prevConversationId && state.conversationId) {
        await renameShort(state.conversationId, state.lastPrompt);
      }
    } catch {}
  }
}

function quick(type) {
  if (!has("input")) return;
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  const prompts = {
    policy:
      "Find the relevant policy or guidance for this issue and summarise the main points clearly.",
    incident:
      "Draft a factual, professional incident record using a calm and defensible tone.",
    risk:
      "Create a structured risk summary with risks, protective factors, actions, and follow-up.",
    handover:
      "Write a concise handover with key information, current risks, actions completed, and next steps.",
  };

  $("input").value =
    prompts[type] || "Help me with this clearly and professionally.";
  resize();
}

/* ---------------------------------------------------------
 * Shared select / tab helpers
 * --------------------------------------------------------- */

function fillSelect(id, rows, placeholder, valueKey = "id", labelFn = (r) => r.name) {
  if (!has(id)) return;

  const sel = $(id);
  const current = sel.value;
  sel.innerHTML = `<option value="">${placeholder}</option>`;

  normArray(rows).forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r?.[valueKey] ?? "";
    opt.textContent = labelFn(r || {}) || "";
    sel.appendChild(opt);
  });

  if ([...sel.options].some((o) => String(o.value) === String(current))) {
    sel.value = current;
  }
}

function activeAdminTab() {
  return localStorage.getItem("indicare_admin_tab") || "users";
}

function setAdminTab(name) {
  document
    .querySelectorAll(".tabbtn[data-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === name));

  document
    .querySelectorAll(".admin-tab")
    .forEach((t) => t.classList.add("hidden"));

  if (has(`tab-${name}`)) $(`tab-${name}`).classList.remove("hidden");
  localStorage.setItem("indicare_admin_tab", name);
}

function setLibraryTab(name) {
  document
    .querySelectorAll(".tabbtn[data-library-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.libraryTab === name));

  if (has("library-list-tab")) {
    $("library-list-tab").classList.toggle("hidden", name !== "list");
  }

  if (has("library-editor-tab")) {
    $("library-editor-tab").classList.toggle("hidden", name !== "editor");
  }

  if (name === "editor" && !canManageLibrary()) {
    setLibraryTab("list");
  }
}

function setManagerTab(name) {
  document
    .querySelectorAll(".tabbtn[data-manager-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.managerTab === name));

  document
    .querySelectorAll(".manager-tab")
    .forEach((t) => t.classList.add("hidden"));

  if (has(`manager-${name}-tab`)) {
    $(`manager-${name}-tab`).classList.remove("hidden");
  }
}

/* ---------------------------------------------------------
 * Admin / Library / Manager loaders
 * --------------------------------------------------------- */
/* Keep your existing admin/library/manager functions here unchanged if already working.
   The core mobile/personality changes above are the important part for this pass. */

async function loadAdminReferenceData() {}
async function loadActiveAdminTab() {}
async function loadAdminUsers() {}
async function loadHomes() {}
async function loadProviders() {}
async function loadDocuments() {}
async function loadBilling() {}
async function loadAudit() {}
function renderAdminUsers() {}
function renderHomes() {}
function renderProviders() {}
function renderDocuments() {}
function renderBilling() {}
function renderAudit() {}
async function createAdminUser() {}
async function createHome() {}
async function createProvider() {}
async function createDocumentRecord() {}
async function loadLibrary() {}
function renderLibraryList() {}
function renderManagerLibraryList() {}
async function openLibraryDocument() {}
function resetLibraryEditor() {}
function populateLibraryEditor() {}
async function saveLibraryDocument() {}
async function deleteLibraryDocument() {}
async function loadManager() {}
function renderManagerUsers() {}
function renderManagerDocuments() {}
async function createManagerStaff() {}
async function saveManagerDoc() {}

/* ---------------------------------------------------------
 * Preferences
 * --------------------------------------------------------- */

function restorePrefs() {
  state.themePreference = readStoredThemePreference();
  applyResolvedTheme();

  if (has("lang")) {
    $("lang").value =
      localStorage.getItem("indicare_reply_language") || DEFAULT_LANGUAGE;
  }

  if (has("mode")) {
    $("mode").value =
      localStorage.getItem("indicare_response_mode") || "balanced";
  }

  loadVoicePref();
  loadCopilotPref();
  loadPersonalityPref();
  loadContextState();
  loadWorkspaceContext();
  applyAssistantBootstrap();
  renderContextSummary();
  syncHelpers();
  setLibraryTab("list");
  setManagerTab("staff");
}

/* ---------------------------------------------------------
 * Event binding
 * --------------------------------------------------------- */

function bindLegalControls() {
  document.querySelectorAll("[data-legal-tab]").forEach((btn) => {
    btn.addEventListener("click", () => setLegalTab(btn.dataset.legalTab));
  });

  on("openLegalFromSettings", "click", () => openLegalModal("terms"));
  on("openLegalHeaderBtn", "click", () => openLegalModal("terms"));
  on("closeLegalModal", "click", closeLegalModal);

  on("legalOverlay", "click", () => {
    const forced =
      has("legalModal") && $("legalModal").dataset.force === "true";
    if (!forced || legalAcceptanceValid()) closeLegalModal();
  });

  on("acceptLegalBtn", "click", acceptLegalTerms);
  on("declineLegalBtn", "click", declineLegalTerms);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (has("legalModal") && $("legalModal").classList.contains("open")) {
        closeLegalModal();
      }
    }
  });
}

function bind() {
  on("sideToggle", "click", () => {
    if (has("sidebar")) $("sidebar").classList.toggle("open");
    if (window.innerWidth <= 768 && has("overlay")) {
      $("overlay").classList.toggle(
        "show",
        has("sidebar") && $("sidebar").classList.contains("open")
      );
    }
  });

  on("mobileMenu", "click", () => {
    if (has("sidebar")) $("sidebar").classList.add("open");
    if (has("overlay")) $("overlay").classList.add("show");
  });

  on("overlay", "click", () => {
    if (has("sidebar")) $("sidebar").classList.remove("open");
    if (has("overlay")) $("overlay").classList.remove("show");
    closeSettings();
  });

  on("openSettings", "click", openSettings);
  on("closeSettings", "click", closeSettings);
  on("settingsOverlay", "click", closeSettings);

  on("newChat", "click", resetWelcome);
  on("logout", "click", logoutNow);
  on("theme", "click", cycleThemePreference);
  on("privacy", "click", () => {
    if (has("app")) $("app").classList.toggle("privacy-active");
    syncHelpers();
  });

  $$(".voice-replies-toggle").forEach((btn) => {
    btn.addEventListener("click", () => setVoicePref(!state.speechEnabled));
  });

  on("stopVoiceBtn", "click", stopSpeaking);
  on("copilot", "change", saveCopilotPref);
  on("personality", "change", savePersonalityPref);
  on("saveContextBtn", "click", saveContextState);

  on("lang", "change", () => {
    localStorage.setItem("indicare_reply_language", selectedLang());
    syncHelpers();
  });

  on("mode", "change", () => {
    localStorage.setItem("indicare_response_mode", selectedMode());
    syncHelpers();
  });

  on("navAssistant", "click", showAssistantView);
  on("navYoungPeople", "click", showYoungPeopleView);
  on("navLibrary", "click", showLibraryView);
  on("navManager", "click", showManagerView);
  on("navAdmin", "click", showAdminView);

  window.addEventListener("message", (event) => {
    const data = event?.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "indicare-context") {
      saveWorkspaceContext({
        youngPersonId: data.payload?.youngPersonId ?? state.workspaceContext.youngPersonId,
        youngPersonName: data.payload?.youngPersonName || "",
        home: data.payload?.home || "",
        view: data.payload?.view || "",
      });
    }

    if (data.type === "indicare-open-assistant") {
      if (data.payload?.prompt && has("input")) {
        $("input").value = data.payload.prompt;
        resize();
      }
      showAssistantView();
    }
  });

  on("search", "input", filterConversations);

  if (has("input")) {
    $("input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    $("input").addEventListener("input", resize);
  }

  on("send", "click", sendMessage);
  on("mic", "click", startSpeech);

  on("chatUploadBtn", "click", () => {
    if (has("upload")) $("upload").click();
  });

  if (has("upload")) {
    $("upload").addEventListener("change", async (e) => {
      if (!legalAcceptanceValid()) {
        e.target.value = "";
        return openLegalModal("acceptance");
      }

      const file = e.target.files?.[0];
      if (!file) return;

      try {
        await uploadDoc(file);
      } catch (err) {
        banner(err.message || indiCareCopy("uploadFail"));
      }

      e.target.value = "";
    });
  }

  on("libraryUploadBtn", "click", () => {
    if (has("libraryUpload")) $("libraryUpload").click();
  });

  if (has("libraryUpload")) {
    $("libraryUpload").addEventListener("change", async (e) => {
      if (!legalAcceptanceValid()) {
        e.target.value = "";
        return openLegalModal("acceptance");
      }

      const file = e.target.files?.[0];
      if (!file) return;

      try {
        await uploadLibraryDocument(file);
      } catch (err) {
        banner(err.message || "Library upload failed");
      }

      e.target.value = "";
    });
  }

  on("clearDoc", "click", async () => {
    try {
      if (state.conversationId) {
        await api(`/chat/conversations/${state.conversationId}/document`, {
          method: "DELETE",
        });
      }
    } catch {}

    state.currentDocumentText = null;
    state.currentDocumentName = null;
    docHide();
    banner(indiCareCopy("documentRemoved"));
  });

  bindLegalControls();
}

/* ---------------------------------------------------------
 * Init
 * --------------------------------------------------------- */

async function init() {
  initSystemThemeListener();
  bind();
  restorePrefs();
  initSpeech();
  resize();

  try {
    await loadMe();
  } catch (_) {
    return;
  }

  setWelcome();

  try {
    await loadConversations();
  } catch (e) {
    console.error("loadConversations failed", e);
    banner(indiCareCopy("conversationsLoadFail"));
  }

  try {
    await loadLibrary();
  } catch (e) {
    console.error("loadLibrary failed", e);
  }

  showAssistantView();
  enforceLegalGate();
  syncHelpers();
  setWelcome();
}

window.quick = quick;
window.resize = resize;

document.addEventListener("DOMContentLoaded", init);
