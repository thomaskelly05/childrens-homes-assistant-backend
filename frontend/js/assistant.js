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

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function setHtml(id, html) {
  if (!has(id)) return;
  $(id).innerHTML = html;
}

function setText(id, text) {
  if (!has(id)) return;
  $(id).textContent = text;
}

/* ---------------------------------------------------------
 * App dataset / assistant scope helpers
 * --------------------------------------------------------- */

function appRoot() {
  return $("app");
}

function datasetValue(key) {
  const app = appRoot();
  if (!app || !app.dataset) return "";
  return String(app.dataset[key] || "").trim();
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getPageAssistantScope() {
  const scopeType = datasetValue("assistantScopeType") || "global";
  const youngPersonId = parseOptionalNumber(datasetValue("youngPersonId"));
  const homeId = parseOptionalNumber(datasetValue("homeId"));
  const workspace = datasetValue("workspace") || "assistant";

  return {
    scope_type: scopeType === "young_person" ? "young_person" : "global",
    young_person_id: youngPersonId,
    home_id: homeId,
    workspace,
  };
}

function setPageAssistantScope(scope = {}) {
  const app = appRoot();
  if (!app) return;

  app.dataset.assistantScopeType = scope.scope_type || "global";
  app.dataset.youngPersonId =
    scope.young_person_id != null ? String(scope.young_person_id) : "";
  app.dataset.homeId = scope.home_id != null ? String(scope.home_id) : "";
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
    assistant_scope: { scope_type: "global" },
    assistant_context: {},
    suggested_actions: [],
  },

  currentProgressLines: [],

  contextState: {
    child: "",
    home: "",
    shift: "",
  },
};

/* ---------------------------------------------------------
 * Constants
 * --------------------------------------------------------- */

const DEFAULT_LANGUAGE = "en-GB";
const REG_PROMPT =
  " [SYSTEM: Verify response against Ofsted SCCIF and Quality Standards for Children's Homes. Use a calm, professional, safeguarding-aware tone. Keep wording clear, factual, structured, and suitable for care records, management review, and professional communication. Avoid slang, exaggeration, or overly casual wording.]";

const RESP = {
  quick: "Quick",
  balanced: "Balanced",
  deep: "Deep",
};

const LANG = {
  "en-GB": "English",
  "pl-PL": "Polish",
  "ro-RO": "Romanian",
  "ur-PK": "Urdu",
  ar: "Arabic",
};

const GREET = [
  (n) => `Good morning, ${n}.`,
  (n) => `Welcome back, ${n}.`,
  (n) => `Ready when you are, ${n}.`,
  (n) => `Good to see you, ${n}.`,
];

const LEGAL_VERSION = "2026-03-29-v1";
const LEGAL_ACCEPTANCE_KEY = "indicare_legal_acceptance";
const LEGAL_TABS = ["terms", "privacy", "ip", "acceptance"];
const ASSISTANT_REDIRECT_GUARD_KEY = "indicare_assistant_redirect_guard";

/* ---------------------------------------------------------
 * Derived helpers
 * --------------------------------------------------------- */

const role = () => String(state.currentUser?.role || "").toLowerCase();
const isAdmin = () => ["admin", "provider_admin"].includes(role());
const isManager = () => role() === "manager";
const isStaff = () => role() === "staff";
const canManageLibrary = () => isAdmin() || isManager();

const selectedLang = () =>
  has("lang") ? $("lang").value || DEFAULT_LANGUAGE : DEFAULT_LANGUAGE;

const selectedMode = () =>
  has("mode") ? $("mode").value || "balanced" : "balanced";

const firstName = () =>
  state.currentUser?.first_name || localStorage.getItem("first_name") || "there";

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
    if (token) {
      nextHeaders["X-CSRF-Token"] = token;
    }
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

function setTitle(title = "Intelligence for Care") {
  if (has("title")) $("title").textContent = title;
}

function resize() {
  if (!has("input")) return;
  const input = $("input");
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
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

function syncHelpers() {
  if (has("langHelp")) {
    $("langHelp").textContent = `Assistant replies in ${
      LANG[selectedLang()] || "English"
    }.`;
  }

  if (has("modeHelp")) {
    $("modeHelp").textContent = `Mode: ${RESP[selectedMode()]}`;
  }

  if (has("theme")) {
    $("theme").classList.toggle(
      "active",
      document.body.classList.contains("theme-dark")
    );
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

  if (has("voiceReplies")) {
    $("voiceReplies").classList.toggle("active", state.speechEnabled);
  }
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
    $("welcomeTitle").textContent =
      GREET[Math.floor(Math.random() * GREET.length)](firstName());
  }

  if (has("welcomeText")) {
    $("welcomeText").textContent =
      "Your assistant is ready to help with records, safeguarding, risk, guidance, drafting, and young person context.";
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

  if (!clean) return "New Log";

  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "for",
    "with",
    "from",
    "about",
    "who",
    "what",
    "when",
    "where",
    "why",
    "how",
    "are",
    "is",
    "do",
    "does",
    "did",
    "please",
    "tell",
    "write",
    "good",
    "morning",
    "indicare",
  ]);

  const words = clean.split(" ").filter(Boolean);
  const pool = words.filter((w) => !stop.has(w.toLowerCase()));
  const picked = (pool.length ? pool : words).slice(0, 3);

  return (
    picked.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") ||
    "New Log"
  );
}

function beautify(text) {
  let out = String(text || "").trim();

  out = out
    .replace(/([a-z]):(?=[A-Z])/g, "$1:\n")
    .replace(/What matters most here:/gi, "### What matters most here")
    .replace(/Key points:/gi, "### Key points")
    .replace(
      /Suggested staff response \/ next steps:/gi,
      "### Suggested next steps"
    )
    .replace(
      /What should be recorded \/ handed over \/ reviewed if relevant:/gi,
      "### Recording and handover"
    )
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
    return "You are IndiCare Ofsted Copilot. Write in a way that is defensible, inspection-ready, and aligned to standards.";
  }
  if (mode === "documentation") {
    return "You are IndiCare Documentation Copilot. Produce clear, factual, well-structured records ready to paste.";
  }

  return "You are IndiCare Assistant. Be calm, professional, structured, and safeguarding-aware.";
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

  return (
    prompts[type] ||
    "Rewrite the last response in a more formal structured format."
  );
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

  const pageScope = getPageAssistantScope();

  if (has("contextYoungPersonId")) {
    $("contextYoungPersonId").value =
      pageScope.young_person_id != null ? String(pageScope.young_person_id) : "";
  }

  if (has("contextHomeId")) {
    $("contextHomeId").value =
      pageScope.home_id != null ? String(pageScope.home_id) : "";
  }
}

function saveContextState() {
  state.contextState = {
    child: has("contextChild") ? $("contextChild").value.trim() : "",
    home: has("contextHome") ? $("contextHome").value.trim() : "",
    shift: has("contextShift") ? $("contextShift").value.trim() : "",
  };

  localStorage.setItem(
    "indicare_context_state",
    JSON.stringify(state.contextState)
  );

  const currentScope = getPageAssistantScope();

  const nextScope = {
    scope_type:
      currentScope.scope_type === "young_person" ||
      (has("contextYoungPersonId") && $("contextYoungPersonId").value.trim())
        ? "young_person"
        : "global",
    young_person_id:
      has("contextYoungPersonId") && $("contextYoungPersonId").value.trim()
        ? Number($("contextYoungPersonId").value.trim())
        : currentScope.young_person_id,
    home_id:
      has("contextHomeId") && $("contextHomeId").value.trim()
        ? Number($("contextHomeId").value.trim())
        : currentScope.home_id,
  };

  setPageAssistantScope(nextScope);
  renderScopeBadges(nextScope);
  renderAssistantScopeSummary();

  banner(indiCareCopy("contextSaved"));
}

function buildContextBlock() {
  const lines = [];
  if (state.contextState.child) lines.push(`Current child: ${state.contextState.child}`);
  if (state.contextState.home) lines.push(`Current home: ${state.contextState.home}`);
  if (state.contextState.shift) lines.push(`Current shift: ${state.contextState.shift}`);
  return lines.length ? `[CONTEXT]\n${lines.join("\n")}\n\n` : "";
}

/* ---------------------------------------------------------
 * Copilot / prefs
 * --------------------------------------------------------- */

function loadCopilotPref() {
  if (!has("copilot")) return;
  $("copilot").value =
    localStorage.getItem("indicare_copilot_mode") || "default";
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
    "send",
    "input",
    "upload",
    "mic",
    "newChat",
    "navAssistant",
    "navLibrary",
    "navManager",
    "navAdmin",
    "openSettings",
    "sideToggle",
    "mobileMenu",
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

function getSavedVoiceName() {
  return localStorage.getItem("indicare_selected_voice_name") || "";
}

function saveVoiceName(name) {
  localStorage.setItem("indicare_selected_voice_name", name || "");
}

function populateVoiceSelect() {
  if (!has("voiceSelect")) return;

  const sel = $("voiceSelect");
  const current = getSavedVoiceName();
  sel.innerHTML = `<option value="">Auto select</option>`;

  state.availableVoices.forEach((voice) => {
    const opt = document.createElement("option");
    opt.value = voice.name;
    opt.textContent = `${voice.name} (${voice.lang})`;
    sel.appendChild(opt);
  });

  if ([...sel.options].some((o) => o.value === current)) {
    sel.value = current;
  } else {
    sel.value = "";
  }
}

function pickIndiCareVoice() {
  if (!("speechSynthesis" in window)) return null;

  const savedName = getSavedVoiceName();
  const voices = window.speechSynthesis.getVoices() || [];

  state.availableVoices = voices.slice().sort((a, b) => {
    const gbA = /en-GB/i.test(a.lang) ? 0 : 1;
    const gbB = /en-GB/i.test(b.lang) ? 0 : 1;
    if (gbA !== gbB) return gbA - gbB;
    return a.name.localeCompare(b.name);
  });

  populateVoiceSelect();

  if (!voices.length) return null;

  state.indicareVoice =
    voices.find((v) => savedName && v.name === savedName) ||
    voices.find(
      (v) =>
        /en-GB/i.test(v.lang) &&
        /female|samantha|serena|karen|libby|hazel|susan|zira/i.test(v.name)
    ) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices.find((v) => /en/i.test(v.lang)) ||
    voices[0] ||
    null;

  state.speechReady = true;
  return state.indicareVoice;
}

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
    utterance.voice = state.indicareVoice || pickIndiCareVoice();
    utterance.lang = utterance.voice?.lang || "en-GB";
    utterance.rate = 0.98;
    utterance.pitch = 1.08;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("speakText failed", e);
  }
}

function loadVoicePref() {
  state.speechEnabled =
    localStorage.getItem("indicare_voice_replies") === "true";

  if (has("voiceReplies")) {
    $("voiceReplies").classList.toggle("active", state.speechEnabled);
  }
}

function setVoicePref(value) {
  state.speechEnabled = !!value;
  localStorage.setItem("indicare_voice_replies", String(state.speechEnabled));

  if (has("voiceReplies")) {
    $("voiceReplies").classList.toggle("active", state.speechEnabled);
  }
}

function initSpeech() {
  if (!("speechSynthesis" in window)) {
    state.speechReady = false;
    state.availableVoices = [];
    populateVoiceSelect();

    if (has("voiceReplies")) {
      $("voiceReplies").classList.remove("active");
    }
    return;
  }

  pickIndiCareVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    pickIndiCareVoice();
  };
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

    if (isAdmin() || isManager() || isStaff()) {
      has("navLibrary") && $("navLibrary").classList.remove("hidden");
    }

    if (isManager()) {
      has("navManager") && $("navManager").classList.remove("hidden");
    }

    if (isAdmin()) {
      has("navAdmin") && $("navAdmin").classList.remove("hidden");
    }

    if (canManageLibrary()) {
      has("managerEditorTab") &&
        $("managerEditorTab").classList.remove("hidden");
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
 * Assistant scope / insights rendering
 * --------------------------------------------------------- */

function renderScopeBadges(scope = null) {
  const current = scope || state.currentStreamMeta.assistant_scope || getPageAssistantScope();

  if (has("scopeBadge")) {
    $("scopeBadge").textContent =
      current?.scope_type === "young_person" ? "Young person assistant" : "Global assistant";
  }

  if (has("scopeHomeBadge")) {
    const homeText =
      state.contextState.home ||
      (current?.home_id != null ? `Home ${current.home_id}` : "");

    if (homeText) {
      $("scopeHomeBadge").textContent = homeText;
      $("scopeHomeBadge").classList.remove("hidden");
    } else {
      $("scopeHomeBadge").textContent = "";
      $("scopeHomeBadge").classList.add("hidden");
    }
  }

  if (has("scopeChildBadge")) {
    const childText =
      state.contextState.child ||
      (current?.scope_type === "young_person"
        ? current?.young_person_id != null
          ? `Young person ${current.young_person_id}`
          : "Young person"
        : "");

    if (childText) {
      $("scopeChildBadge").textContent = childText;
      $("scopeChildBadge").classList.remove("hidden");
    } else {
      $("scopeChildBadge").textContent = "";
      $("scopeChildBadge").classList.add("hidden");
    }
  }

  if (has("scopeShiftBadge")) {
    if (state.contextState.shift) {
      $("scopeShiftBadge").textContent = state.contextState.shift;
      $("scopeShiftBadge").classList.remove("hidden");
    } else {
      $("scopeShiftBadge").textContent = "";
      $("scopeShiftBadge").classList.add("hidden");
    }
  }
}

function inferSuggestedActions(meta = {}) {
  const runtime = normObj(meta.runtime);
  const actions = normArray(runtime.suggested_actions);
  if (actions.length) return actions;

  const context = normObj(meta.assistant_context);
  const scope = normObj(meta.assistant_scope);

  const inferred = [];

  if (scope.scope_type === "young_person") {
    inferred.push("Summarise current risks");
    inferred.push("Draft handover");
    inferred.push("Pull child voice themes");
  } else {
    inferred.push("Summarise priority tasks");
    inferred.push("Draft shift overview");
  }

  const activeWork = normObj(context.active_work);
  const recentRecords = normObj(context.recent_records);

  if (normArray(activeWork.tasks).length) inferred.push("Review outstanding tasks");
  if (normArray(recentRecords.incidents).length) inferred.push("Review recent incidents");
  if (normArray(recentRecords.chronology).length) inferred.push("Update chronology summary");

  return [...new Set(inferred)].slice(0, 8);
}

function renderAssistantScopeSummary() {
  if (!has("assistantScopeSummary")) return;

  const scope = normObj(state.currentStreamMeta.assistant_scope);
  const context = normObj(state.currentStreamMeta.assistant_context);
  const pageScope = getPageAssistantScope();
  const effectiveScope = Object.keys(scope).length ? scope : pageScope;

  const rows = [];

  rows.push(
    `<div class="entity-row"><div><div class="entity-title">${
      effectiveScope.scope_type === "young_person" ? "Young person scope" : "Global scope"
    }</div><div class="entity-meta">Workspace: ${safe(
      getPageAssistantScope().workspace || "assistant"
    )}</div></div></div>`
  );

  if (effectiveScope.home_id != null) {
    rows.push(
      `<div class="entity-row"><div><div class="entity-title">Home</div><div class="entity-meta">ID ${safe(
        String(effectiveScope.home_id)
      )}</div></div></div>`
    );
  }

  if (effectiveScope.young_person_id != null) {
    rows.push(
      `<div class="entity-row"><div><div class="entity-title">Young person</div><div class="entity-meta">ID ${safe(
        String(effectiveScope.young_person_id)
      )}</div></div></div>`
    );
  }

  const youngPerson = normObj(context.young_person);
  if (youngPerson.id) {
    const displayName =
      youngPerson.preferred_name ||
      [youngPerson.first_name, youngPerson.last_name].filter(Boolean).join(" ") ||
      `Young person ${youngPerson.id}`;

    rows.push(
      `<div class="entity-row"><div><div class="entity-title">${safe(
        displayName
      )}</div><div class="entity-meta">Placement: ${safe(
        youngPerson.placement_status || "—"
      )} · Risk: ${safe(youngPerson.summary_risk_level || "—")}</div></div></div>`
    );
  }

  if (!rows.length) {
    setHtml("assistantScopeSummary", "<p>No scoped context loaded.</p>");
    return;
  }

  setHtml("assistantScopeSummary", rows.join(""));
}

function renderAssistantActions() {
  if (!has("assistantActions")) return;

  const actions = inferSuggestedActions(state.currentStreamMeta);
  if (!actions.length) {
    setHtml("assistantActions", "<p>No suggested actions yet.</p>");
    return;
  }

  setHtml(
    "assistantActions",
    actions
      .map(
        (item) =>
          `<button class="chip" type="button" data-suggested-action="${safe(item)}">${safe(
            item
          )}</button>`
      )
      .join("")
  );

  document.querySelectorAll("[data-suggested-action]").forEach((btn) => {
    btn.onclick = () => {
      if (!has("input")) return;
      $("input").value = btn.dataset.suggestedAction || "";
      resize();
      $("input").focus();
    };
  });
}

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

function renderAssistantSources() {
  if (!has("assistantSources")) return;

  const rows = normArray(state.currentStreamMeta.sources);
  if (!rows.length) {
    setHtml("assistantSources", "<p>Sources will appear here after a response.</p>");
    return;
  }

  setHtml("assistantSources", rows.map(renderSourceCard).join(""));
}

function renderAssistantRuntime() {
  if (!has("assistantRuntime")) return;
  setText("assistantRuntime", prettyJson(state.currentStreamMeta.runtime || {}));
}

function renderAssistantExplainability() {
  if (!has("assistantExplainability")) return;
  setText(
    "assistantExplainability",
    prettyJson(state.currentStreamMeta.explainability || {})
  );
}

function renderAssistantInsights() {
  renderScopeBadges();
  renderAssistantScopeSummary();
  renderAssistantActions();
  renderAssistantSources();
  renderAssistantRuntime();
  renderAssistantExplainability();
}

function resetAssistantInsights() {
  state.currentStreamMeta = {
    sources: [],
    runtime: {},
    explainability: {},
    assistant_scope: getPageAssistantScope(),
    assistant_context: {},
    suggested_actions: [],
  };
  renderAssistantInsights();
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

  ["navAssistant", "navLibrary", "navManager", "navAdmin"].forEach(
    (id) => has(id) && $(id).classList.remove("active")
  );
}

function showAssistantView() {
  hideAllPanels();
  has("assistantPanel") && $("assistantPanel").classList.remove("hidden");
  has("inputWrap") && $("inputWrap").classList.remove("hidden");
  has("navAssistant") && $("navAssistant").classList.add("active");

  setTitle(
    state.conversationId
      ? has("title")
        ? $("title").textContent
        : "Intelligence for Care"
      : "Intelligence for Care"
  );

  closeMobilePanels();
}

function showLibraryView() {
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  hideAllPanels();
  has("libraryPanel") && $("libraryPanel").classList.remove("hidden");
  has("inputWrap") && $("inputWrap").classList.add("hidden");
  has("navLibrary") && $("navLibrary").classList.add("active");
  setTitle("Policies");
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
  state.currentProgressLines = [];
  stopSpeaking();

  resetAssistantInsights();

  if (has("messages")) {
    $("messages").innerHTML = "";
    $("messages").classList.add("hidden");
  }

  has("empty") && $("empty").classList.remove("hidden");

  if (has("input")) $("input").value = "";
  resize();
  docHide();
  setTitle();
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
          <div class="ttl">${safe(stripSystem(row?.title || "Observation"))}</div>
        </button>
        <button class="mini">⧉</button>
        <button class="mini danger">🗑</button>
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
        openConversation(row?.id, stripSystem(row?.title || "Observation"));
      };
    }

    if (copy) {
      copy.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(stripSystem(row?.title || "Observation"));
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
  state.currentProgressLines = [];
  resetAssistantInsights();

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

  setTitle(title || "Observation");
  filterConversations();
  closeMobilePanels();
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
    assistant_scope: normObj(parsed.assistant_scope),
    assistant_context: normObj(parsed.assistant_context),
    suggested_actions: inferSuggestedActions(parsed),
  };

  if (parsed.assistant_scope) {
    setPageAssistantScope(parsed.assistant_scope);
  }

  attachMetaToStreamingMessage(state.currentStreamMeta);
  renderAssistantInsights();
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

  if (has("assistantPanel")) {
    $("assistantPanel").scrollTop = $("assistantPanel").scrollHeight;
  }
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

  if (has("assistantPanel")) {
    $("assistantPanel").scrollTop = $("assistantPanel").scrollHeight;
  }

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

      if (has("assistantPanel")) {
        $("assistantPanel").scrollTop = $("assistantPanel").scrollHeight;
      }
    } else if (!state.isStreaming) {
      clearInterval(tick);
      state.typing = false;
      el.classList.remove("typing");

      const finalRaw = el.getAttribute("data-raw") || "";
      state.lastAssistantText = finalRaw;
      clearStreamingProgress();
      attachMetaToStreamingMessage(state.currentStreamMeta);
      renderAssistantInsights();
      speakText(finalRaw);
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
      if (line.startsWith(":")) {
        continue;
      } else if (line.startsWith("event:")) {
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
  state.currentProgressLines = [];
  state.currentStreamMeta = {
    sources: [],
    runtime: {},
    explainability: {},
    assistant_scope: getPageAssistantScope(),
    assistant_context: {},
    suggested_actions: [],
  };

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

  const pageScope = getPageAssistantScope();

  body.intent = state.currentIntent;
  body.structured = true;
  body.reply_language = selectedLang();
  body.reply_language_label = LANG[selectedLang()] || "English";
  body.response_mode = selectedMode();
  body.context = state.contextState;
  body.scope = {
    scope_type: pageScope.scope_type || "global",
    young_person_id:
      pageScope.young_person_id != null ? pageScope.young_person_id : null,
    home_id: pageScope.home_id != null ? pageScope.home_id : null,
  };

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
    throw new Error(
      (await res.text()) || `Chat request failed (${res.status})`
    );
  }

  if (!res.body || contentType.includes("application/json")) {
    let data = {};
    try {
      data = await res.json();
    } catch {}

    const reply = data.reply || data.message || data.output || "Done.";

    state.currentStreamMeta = {
      sources: normArray(data.sources),
      runtime: normObj(data.runtime),
      explainability: normObj(data.explainability),
      assistant_scope: normObj(data.assistant_scope || body.scope),
      assistant_context: normObj(data.assistant_context),
      suggested_actions: inferSuggestedActions(data),
    };

    appendMessage("assistant", reply, {
      sources: normArray(data.sources),
    });
    renderAssistantInsights();
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
        has("title") ? $("title").textContent : "Observation"
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
      renderAssistantInsights();
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
    ofsted:
      "Rewrite the above documentation so it aligns with Ofsted Quality Standards and is ready for professional review.",
    risk:
      "Generate a formal risk assessment based on this situation. Include presenting risks, protective factors, staff actions, and follow-up actions.",
  };

  $("input").value =
    prompts[type] || "Rewrite this in a more formal professional format.";
  resize();
  sendMessage();
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
 * Admin
 * --------------------------------------------------------- */

function updateAdminSummary() {
  if (has("sumUsers")) $("sumUsers").textContent = String(state.adminUsers.length || 0);
  if (has("sumHomes")) $("sumHomes").textContent = String(state.homes.length || 0);
  if (has("sumProviders")) $("sumProviders").textContent = String(state.providers.length || 0);
  if (has("sumDocs")) $("sumDocs").textContent = String(state.docs.length || 0);
}

async function loadAdminReferenceData() {
  const [homesRes, providersRes, usersRes] = await Promise.allSettled([
    api("/admin/homes"),
    api("/admin/providers"),
    api("/admin/users"),
  ]);

  state.homes = normArray(homesRes.status === "fulfilled" ? homesRes.value?.homes : []);
  state.providers = normArray(providersRes.status === "fulfilled" ? providersRes.value?.providers : []);
  state.adminUsers = normArray(usersRes.status === "fulfilled" ? usersRes.value?.users : []);

  fillSelect("adminHomeId", state.homes, "Select home");
  fillSelect("userHomeFilter", state.homes, "All homes");
  fillSelect("docHomeFilter", state.homes, "All homes");
  fillSelect("docHomeId", state.homes, "Select home");
  fillSelect("homeProviderId", state.providers, "Select provider");

  const managers = state.adminUsers.filter((u) =>
    ["manager", "admin", "provider_admin"].includes(
      String(u?.role || "").toLowerCase()
    )
  );

  fillSelect(
    "homeRegisteredManagerId",
    managers,
    "Select manager",
    "id",
    (r) =>
      `${r?.first_name || ""} ${r?.last_name || ""}`.trim() ||
      r?.email ||
      ""
  );

  fillSelect(
    "docOwnerId",
    state.adminUsers,
    "Select owner",
    "id",
    (r) =>
      `${r?.first_name || ""} ${r?.last_name || ""}`.trim() ||
      r?.email ||
      ""
  );

  fillSelect(
    "libraryOwnerId",
    state.adminUsers,
    "Select owner",
    "id",
    (r) =>
      `${r?.first_name || ""} ${r?.last_name || ""}`.trim() ||
      r?.email ||
      ""
  );

  updateAdminSummary();
}

async function loadActiveAdminTab() {
  const tab = activeAdminTab();
  if (tab === "users") await loadAdminUsers();
  if (tab === "homes") await loadHomes();
  if (tab === "providers") await loadProviders();
  if (tab === "documents") await loadDocuments();
  if (tab === "billing") await loadBilling();
  if (tab === "audit") await loadAudit();
}

function clearAdminForm() {
  ["adminFirstName", "adminLastName", "adminEmail", "adminPassword"].forEach(
    (id) => has(id) && ($(id).value = "")
  );

  if (has("adminRole")) $("adminRole").value = "staff";
  if (has("adminHomeId")) $("adminHomeId").value = "";
  state.adminCreateActive = true;
  syncHelpers();
}

function adminPayloadFromForm() {
  return {
    first_name: has("adminFirstName") ? $("adminFirstName").value.trim() : "",
    last_name: has("adminLastName") ? $("adminLastName").value.trim() : "",
    email: has("adminEmail") ? $("adminEmail").value.trim() : "",
    password: has("adminPassword") ? $("adminPassword").value : "",
    role: has("adminRole") ? $("adminRole").value : "staff",
    home_id:
      has("adminHomeId") && $("adminHomeId").value
        ? Number($("adminHomeId").value)
        : null,
    is_active: state.adminCreateActive,
  };
}

async function createAdminUser() {
  const payload = adminPayloadFromForm();

  if (!payload.first_name || !payload.last_name || !payload.email || !payload.password || !payload.role) {
    return banner("Complete all user fields");
  }

  await api("/admin/users", { method: "POST", body: JSON.stringify(payload) });
  clearAdminForm();
  await loadAdminUsers();
  await loadAdminReferenceData();
  banner("User created");
}

async function loadAdminUsers() {
  const params = new URLSearchParams();

  if (has("userSearch") && $("userSearch").value.trim()) {
    params.set("q", $("userSearch").value.trim());
  }
  if (has("userRoleFilter") && $("userRoleFilter").value) {
    params.set("role", $("userRoleFilter").value);
  }
  if (has("userHomeFilter") && $("userHomeFilter").value.trim()) {
    params.set("home_id", $("userHomeFilter").value.trim());
  }
  if (has("userArchivedFilter") && $("userArchivedFilter").value) {
    params.set("archived", $("userArchivedFilter").value);
  }

  const data = await api("/admin/users" + (params.toString() ? `?${params}` : ""));
  if (!data) return;

  state.adminUsers = normArray(data?.users);
  renderAdminUsers();
  updateAdminSummary();
}

function renderAdminUsers() {
  if (!has("adminUsersList")) return;

  const host = $("adminUsersList");
  host.innerHTML = "";

  if (!state.adminUsers.length) {
    host.innerHTML = `<div class="entity-row"><div>No users found.</div></div>`;
    return;
  }

  state.adminUsers.forEach((user) => {
    const row = document.createElement("div");
    row.className = "entity-row";

    row.innerHTML = `
      <div>
        <div class="entity-title">${safe(
          [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
            user?.email ||
            "Unknown user"
        )}</div>
        <div class="entity-meta">${safe(user?.email || "")} · ${safe(
      user?.role || ""
    )} · home ${safe(String(user?.home_id ?? ""))}</div>
        <div class="entity-meta">
          <span class="tag ${user?.is_active ? "ok" : "bad"}">${
      user?.is_active ? "active" : "inactive"
    }</span>
          <span class="tag ${user?.archived ? "bad" : "neutral"}">${
      user?.archived ? "archived" : "live"
    }</span>
        </div>
      </div>
      <div class="entity-actions"></div>
    `;

    const right = row.querySelector(".entity-actions");

    const add = (label, fn) => {
      if (!right) return;
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = label;
      btn.onclick = fn;
      right.appendChild(btn);
    };

    add(user?.is_active ? "Deactivate" : "Activate", async () => {
      await api(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !user?.is_active }),
      });
      await loadAdminUsers();
      banner("User updated");
    });

    add(user?.archived ? "Unarchive" : "Archive", async () => {
      await api(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: !user?.archived }),
      });
      await loadAdminUsers();
      banner("User updated");
    });

    add("Role", async () => {
      const newRole = prompt(
        `Set role for ${user?.email || "user"}`,
        user?.role || "staff"
      );
      if (newRole === null) return;

      await api(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });

      await loadAdminUsers();
      banner("Role updated");
    });

    add("Home", async () => {
      const choices = state.homes.map((h) => `${h?.id}: ${h?.name}`).join("\n");
      const homeId = prompt(
        `Set home id for ${user?.email || "user"}\n\n${choices}`,
        String(user?.home_id ?? "")
      );
      if (homeId === null) return;

      await api(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          home_id: homeId ? Number(homeId) : null,
        }),
      });

      await loadAdminUsers();
      banner("Home updated");
    });

    add("Reset password", async () => {
      const password = prompt(`Set new password for ${user?.email || "user"}`);
      if (password === null || !password.trim()) {
        return banner("Password cannot be empty");
      }

      await api(`/admin/users/${user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      banner("Password reset");
    });

    host.appendChild(row);
  });
}

async function createHome() {
  const payload = {
    name: has("homeName") ? $("homeName").value.trim() : "",
    address: has("homeAddress") ? $("homeAddress").value.trim() || null : null,
    postcode: has("homePostcode") ? $("homePostcode").value.trim() || null : null,
    region: has("homeRegion") ? $("homeRegion").value.trim() || null : null,
    local_authority: has("homeLocalAuthority")
      ? $("homeLocalAuthority").value.trim() || null
      : null,
    ofsted_urn: has("homeOfstedUrn") ? $("homeOfstedUrn").value.trim() || null : null,
    provider_id:
      has("homeProviderId") && $("homeProviderId").value
        ? Number($("homeProviderId").value)
        : null,
    registered_manager_id:
      has("homeRegisteredManagerId") && $("homeRegisteredManagerId").value
        ? Number($("homeRegisteredManagerId").value)
        : null,
    geofence_radius_m:
      has("homeGeofence") && $("homeGeofence").value.trim()
        ? Number($("homeGeofence").value)
        : null,
  };

  if (!payload.name) return banner("Home name is required");

  await api("/admin/homes", { method: "POST", body: JSON.stringify(payload) });

  [
    "homeName",
    "homeAddress",
    "homePostcode",
    "homeRegion",
    "homeLocalAuthority",
    "homeOfstedUrn",
    "homeGeofence",
  ].forEach((id) => has(id) && ($(id).value = ""));

  if (has("homeProviderId")) $("homeProviderId").value = "";
  if (has("homeRegisteredManagerId")) $("homeRegisteredManagerId").value = "";

  await loadHomes();
  await loadAdminReferenceData();
  banner("Home created");
}

async function loadHomes() {
  const data = await api("/admin/homes");
  if (!data) return;

  state.homes = normArray(data?.homes);
  renderHomes();
  updateAdminSummary();
}

function renderHomes() {
  if (!has("homesList")) return;

  const host = $("homesList");
  host.innerHTML = "";

  if (!state.homes.length) {
    host.innerHTML = `<div class="entity-row"><div>No homes found.</div></div>`;
    return;
  }

  state.homes.forEach((home) => {
    const row = document.createElement("div");
    row.className = "entity-row";

    row.innerHTML = `
      <div>
        <div class="entity-title">${safe(home?.name || "Unnamed home")}</div>
        <div class="entity-meta">${safe(home?.postcode || "")} · ${safe(
      home?.region || ""
    )} · ${safe(home?.local_authority || "")}</div>
        <div class="entity-meta">URN: ${safe(home?.ofsted_urn || "—")} · users: ${safe(
      String(home?.user_count ?? 0)
    )}</div>
      </div>
      <div class="entity-actions"></div>
    `;

    const right = row.querySelector(".entity-actions");

    [
      [
        "Edit",
        async () => {
          const name = prompt("Home name", home?.name || "");
          if (name === null) return;

          await api(`/admin/homes/${home.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name }),
          });

          await loadHomes();
          banner("Home updated");
        },
      ],
      [
        home?.archived ? "Unarchive" : "Archive",
        async () => {
          await api(`/admin/homes/${home.id}`, {
            method: "PATCH",
            body: JSON.stringify({ archived: !home?.archived }),
          });

          await loadHomes();
          banner("Home updated");
        },
      ],
    ].forEach(([label, fn]) => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = label;
      btn.onclick = fn;
      right && right.appendChild(btn);
    });

    host.appendChild(row);
  });
}

async function createProvider() {
  const payload = {
    name: has("providerName") ? $("providerName").value.trim() : "",
    region: has("providerRegion") ? $("providerRegion").value.trim() || null : null,
    address: has("providerAddress")
      ? $("providerAddress").value.trim() || null
      : null,
    postcode: has("providerPostcode")
      ? $("providerPostcode").value.trim() || null
      : null,
    local_authority: has("providerLA") ? $("providerLA").value.trim() || null : null,
    safeguarding_lead_name: has("providerLeadName")
      ? $("providerLeadName").value.trim() || null
      : null,
    safeguarding_lead_email: has("providerLeadEmail")
      ? $("providerLeadEmail").value.trim() || null
      : null,
  };

  if (!payload.name) return banner("Provider name is required");

  await api("/admin/providers", { method: "POST", body: JSON.stringify(payload) });

  [
    "providerName",
    "providerRegion",
    "providerAddress",
    "providerPostcode",
    "providerLA",
    "providerLeadName",
    "providerLeadEmail",
  ].forEach((id) => has(id) && ($(id).value = ""));

  await loadProviders();
  await loadAdminReferenceData();
  banner("Provider created");
}

async function loadProviders() {
  const data = await api("/admin/providers");
  if (!data) return;

  state.providers = normArray(data?.providers);
  renderProviders();
  updateAdminSummary();
}

function renderProviders() {
  if (!has("providersList")) return;

  const host = $("providersList");
  host.innerHTML = "";

  if (!state.providers.length) {
    host.innerHTML = `<div class="entity-row"><div>No providers found.</div></div>`;
    return;
  }

  state.providers.forEach((provider) => {
    const row = document.createElement("div");
    row.className = "entity-row";

    row.innerHTML = `
      <div>
        <div class="entity-title">${safe(provider?.name || "Unnamed provider")}</div>
        <div class="entity-meta">${safe(provider?.region || "")} · homes: ${safe(
      String(provider?.home_count ?? 0)
    )}</div>
        <div class="entity-meta">${safe(
          provider?.safeguarding_lead_name || "No safeguarding lead"
        )}${provider?.safeguarding_lead_email ? " · " + safe(provider.safeguarding_lead_email) : ""}</div>
      </div>
      <div class="entity-actions"></div>
    `;

    const right = row.querySelector(".entity-actions");

    [
      [
        "Edit",
        async () => {
          const name = prompt("Provider name", provider?.name || "");
          if (name === null) return;

          await api(`/admin/providers/${provider.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name }),
          });

          await loadProviders();
          banner("Provider updated");
        },
      ],
      [
        provider?.archived ? "Unarchive" : "Archive",
        async () => {
          await api(`/admin/providers/${provider.id}`, {
            method: "PATCH",
            body: JSON.stringify({ archived: !provider?.archived }),
          });

          await loadProviders();
          banner("Provider updated");
        },
      ],
    ].forEach(([label, fn]) => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = label;
      btn.onclick = fn;
      right && right.appendChild(btn);
    });

    host.appendChild(row);
  });
}

async function createDocumentRecord() {
  const payload = {
    title: has("docTitle") ? $("docTitle").value.trim() || null : null,
    document_type: has("docType") ? $("docType").value || "policy" : "policy",
    home_id:
      has("docHomeId") && $("docHomeId").value
        ? Number($("docHomeId").value)
        : null,
    owner_id:
      has("docOwnerId") && $("docOwnerId").value
        ? Number($("docOwnerId").value)
        : null,
    issue_date: has("docIssueDate") ? $("docIssueDate").value || null : null,
    review_date: has("docReviewDate") ? $("docReviewDate").value || null : null,
    expiry_date: has("docExpiryDate") ? $("docExpiryDate").value || null : null,
    approval_status: has("docApprovalStatus")
      ? $("docApprovalStatus").value || "not_required"
      : "not_required",
    confidentiality_level: has("docConfLevel")
      ? $("docConfLevel").value || "standard"
      : "standard",
    input_text: has("docInputText") ? $("docInputText").value.trim() || null : null,
  };

  await api("/admin/documents", { method: "POST", body: JSON.stringify(payload) });

  [
    "docTitle",
    "docIssueDate",
    "docReviewDate",
    "docExpiryDate",
    "docInputText",
  ].forEach((id) => has(id) && ($(id).value = ""));

  if (has("docType")) $("docType").value = "policy";
  if (has("docHomeId")) $("docHomeId").value = "";
  if (has("docOwnerId")) $("docOwnerId").value = "";
  if (has("docApprovalStatus")) $("docApprovalStatus").value = "not_required";
  if (has("docConfLevel")) $("docConfLevel").value = "standard";

  await loadDocuments();
  await loadAdminReferenceData();
  banner("Document created");
}

async function loadDocuments() {
  const params = new URLSearchParams();

  if (has("docSearch") && $("docSearch").value.trim()) {
    params.set("q", $("docSearch").value.trim());
  }
  if (has("docHomeFilter") && $("docHomeFilter").value.trim()) {
    params.set("home_id", $("docHomeFilter").value.trim());
  }
  if (has("docTypeFilter") && $("docTypeFilter").value.trim()) {
    params.set("document_type", $("docTypeFilter").value.trim());
  }
  if (has("docApprovalFilter") && $("docApprovalFilter").value.trim()) {
    params.set("approval_status", $("docApprovalFilter").value.trim());
  }

  const data = await api("/admin/documents" + (params.toString() ? `?${params}` : ""));
  if (!data) return;

  state.docs = normArray(data?.documents);
  renderDocuments();
  updateAdminSummary();
}

function renderDocuments() {
  if (!has("docsList")) return;

  const host = $("docsList");
  host.innerHTML = "";

  if (!state.docs.length) {
    host.innerHTML = `<div class="entity-row"><div>No documents found.</div></div>`;
    return;
  }

  state.docs.forEach((doc) => {
    const row = document.createElement("div");
    row.className = "entity-row";

    row.innerHTML = `
      <div>
        <div class="entity-title">${safe(doc?.title || "Untitled document")}</div>
        <div class="entity-meta">${safe(doc?.document_type || "—")} · ${safe(
      doc?.home_name || "home " + (doc?.home_id ?? "—")
    )}</div>
        <div class="entity-meta">approval: ${safe(
          doc?.approval_status || "not_required"
        )} · review: ${safe(doc?.review_date || "—")} · expiry: ${safe(
      doc?.expiry_date || "—"
    )}</div>
      </div>
      <div class="entity-actions"></div>
    `;

    const right = row.querySelector(".entity-actions");

    [
      [
        "Set approved",
        async () => {
          await api(`/admin/documents/${doc.id}`, {
            method: "PATCH",
            body: JSON.stringify({ approval_status: "approved" }),
          });
          await loadDocuments();
          banner("Document updated");
        },
      ],
      [
        "Edit title",
        async () => {
          const title = prompt("Document title", doc?.title || "");
          if (title === null) return;

          await api(`/admin/documents/${doc.id}`, {
            method: "PATCH",
            body: JSON.stringify({ title }),
          });

          await loadDocuments();
          banner("Document updated");
        },
      ],
    ].forEach(([label, fn]) => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = label;
      btn.onclick = fn;
      right && right.appendChild(btn);
    });

    host.appendChild(row);
  });
}

async function loadBilling() {
  try {
    state.billing = await api("/admin/billing/overview");
  } catch {
    state.billing = null;
  }

  renderBilling();
}

function renderBilling() {
  if (has("billingStats")) $("billingStats").innerHTML = "";
  if (has("billingList")) $("billingList").innerHTML = "";
  if (!state.billing) return;

  const totals = normObj(state.billing.totals);

  [
    ["Total users", totals.total_users ?? 0],
    ["Active users", totals.active_users ?? 0],
    ["Archived users", totals.archived_users ?? 0],
    ["Active subscriptions", totals.active_subscriptions ?? 0],
    ["Inactive subscriptions", totals.inactive_subscriptions ?? 0],
  ].forEach(([label, value]) => {
    if (has("billingStats")) {
      $("billingStats").insertAdjacentHTML(
        "beforeend",
        `<div class="stat"><div class="n">${safe(
          String(value)
        )}</div><div class="l">${safe(label)}</div></div>`
      );
    }
  });

  const users = normArray(state.billing.users);
  if (!users.length) {
    if (has("billingList")) {
      $("billingList").innerHTML = `<div class="entity-row"><div>No billing rows found.</div></div>`;
    }
    return;
  }

  users.forEach((user) => {
    if (has("billingList")) {
      $("billingList").insertAdjacentHTML(
        "beforeend",
        `<div class="entity-row"><div><div class="entity-title">${safe(
          [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
            user?.email ||
            "Unknown user"
        )}</div><div class="entity-meta">${safe(user?.email || "")} · ${safe(
          user?.plan_name || "No plan"
        )}</div><div class="entity-meta">status: ${safe(
          user?.subscription_status || "inactive"
        )} · period end: ${safe(user?.current_period_end || "—")}</div></div></div>`
      );
    }
  });
}

async function loadAudit() {
  try {
    const data = await api("/admin/audit");
    state.audit = normArray(data?.audit);
  } catch {
    state.audit = [];
  }

  renderAudit();
}

function renderAudit() {
  if (!has("auditList")) return;

  const host = $("auditList");
  host.innerHTML = "";

  if (!state.audit.length) {
    host.innerHTML = `<div class="entity-row"><div>No audit entries found.</div></div>`;
    return;
  }

  state.audit.forEach((entry) => {
    host.insertAdjacentHTML(
      "beforeend",
      `<div class="entity-row"><div><div class="entity-title">${safe(
        entry?.action || ""
      )} · ${safe(entry?.target_type || "")} ${safe(
        String(entry?.target_id ?? "")
      )}</div><div class="entity-meta">${safe(
        [entry?.first_name, entry?.last_name].filter(Boolean).join(" ") ||
          entry?.email ||
          "Unknown admin"
      )} · ${safe(entry?.created_at || "")}</div><div class="entity-meta">${safe(
        JSON.stringify(entry?.details || {})
      )}</div></div></div>`
    );
  });
}

/* ---------------------------------------------------------
 * Library
 * --------------------------------------------------------- */

async function loadLibrary() {
  const params = new URLSearchParams();

  if (has("librarySearch") && $("librarySearch").value.trim()) {
    params.set("q", $("librarySearch").value.trim());
  }
  if (has("libraryTypeFilter") && $("libraryTypeFilter").value) {
    params.set("document_type", $("libraryTypeFilter").value);
  }
  if (has("libraryApprovalFilter") && $("libraryApprovalFilter").value) {
    params.set("approval_status", $("libraryApprovalFilter").value);
  }

  const data = await api("/documents/library" + (params.toString() ? `?${params}` : ""));
  if (!data) return;

  state.libraryDocs = normArray(data?.documents);
  renderLibraryList();
  renderManagerLibraryList();

  if (state.selectedLibraryDoc?.id) {
    const fresh = state.libraryDocs.find(
      (d) => Number(d?.id) === Number(state.selectedLibraryDoc.id)
    );
    if (fresh) openLibraryDocument(fresh.id);
  }
}

function renderLibraryList() {
  if (!has("libraryList")) return;

  const host = $("libraryList");
  host.innerHTML = "";

  if (!state.libraryDocs.length) {
    host.innerHTML = `<div class="entity-row"><div>No documents available for your home.</div></div>`;
    return;
  }

  state.libraryDocs.forEach((doc) => {
    const row = document.createElement("div");
    row.className = "entity-row";

    row.innerHTML = `
      <div>
        <div class="entity-title">${safe(doc?.title || "Untitled document")}</div>
        <div class="entity-meta">${safe(doc?.document_type || "—")} · ${safe(
      doc?.home_name || "Your home"
    )}</div>
        <div class="entity-meta">
          <span class="tag ${
            doc?.approval_status === "approved"
              ? "ok"
              : doc?.approval_status === "pending"
              ? "warn"
              : "neutral"
          }">${safe(doc?.approval_status || "not_required")}</span>
          <span class="tag neutral">${safe(doc?.confidentiality_level || "standard")}</span>
        </div>
      </div>
      <div class="entity-actions"></div>
    `;

    const right = row.querySelector(".entity-actions");

    [
      ["Open", () => openLibraryDocument(doc.id)],
      ...(canManageLibrary() ? [["Edit", () => populateLibraryEditor(doc)]] : []),
    ].forEach(([label, fn]) => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = label;
      btn.onclick = fn;
      right && right.appendChild(btn);
    });

    host.appendChild(row);
  });
}

function renderManagerLibraryList() {
  if (!has("managerLibraryList")) return;

  const host = $("managerLibraryList");
  host.innerHTML = "";

  if (!canManageLibrary()) {
    host.innerHTML = `<div class="entity-row"><div>Read-only access.</div></div>`;
    return;
  }

  if (!state.libraryDocs.length) {
    host.innerHTML = `<div class="entity-row"><div>No home documents found.</div></div>`;
    return;
  }

  state.libraryDocs.forEach((doc) => {
    host.insertAdjacentHTML(
      "beforeend",
      `<div class="entity-row"><div><div class="entity-title">${safe(
        doc?.title || "Untitled document"
      )}</div><div class="entity-meta">${safe(
        doc?.document_type || "—"
      )} · review ${safe(doc?.review_date || "—")}</div></div><div class="entity-actions"><button class="chip" data-doc-edit="${safe(
        String(doc?.id ?? "")
      )}">Edit</button></div></div>`
    );
  });

  host.querySelectorAll("[data-doc-edit]").forEach((btn) => {
    btn.onclick = () =>
      populateLibraryEditor(
        state.libraryDocs.find((d) => Number(d?.id) === Number(btn.dataset.docEdit))
      );
  });
}

async function openLibraryDocument(id) {
  if (!id || !has("libraryViewer")) return;

  const data = await api(`/documents/library/${id}`);
  const doc = data?.document;
  if (!doc) return;

  state.selectedLibraryDoc = doc;

  $("libraryViewer").innerHTML = `
    <h3>${safe(doc?.title || "Untitled document")}</h3>
    <p><strong>Type:</strong> ${safe(doc?.document_type || "—")}</p>
    <p><strong>Approval:</strong> ${safe(
      doc?.approval_status || "not_required"
    )} · <strong>Confidentiality:</strong> ${safe(
    doc?.confidentiality_level || "standard"
  )}</p>
    <p><strong>Issue date:</strong> ${safe(
      doc?.issue_date || "—"
    )} · <strong>Review date:</strong> ${safe(
    doc?.review_date || "—"
  )} · <strong>Expiry date:</strong> ${safe(doc?.expiry_date || "—")}</p>
    <hr style="border:none;border-top:1px solid var(--line);margin:14px 0;">
    <div>${render(
      doc?.input_text || doc?.generated_text || "No content available.",
      "assistant"
    )}</div>
  `;
}

function resetLibraryEditor() {
  state.editingLibraryDocId = null;

  if (has("libraryFormTitle")) $("libraryFormTitle").textContent = "Create document";

  [
    "libraryDocTitle",
    "libraryIssueDate",
    "libraryReviewDate",
    "libraryExpiryDate",
    "libraryInputText",
  ].forEach((id) => has(id) && ($(id).value = ""));

  if (has("libraryDocType")) $("libraryDocType").value = "policy";
  if (has("libraryApprovalStatus")) $("libraryApprovalStatus").value = "not_required";
  if (has("libraryConfidentiality")) $("libraryConfidentiality").value = "standard";
  if (has("libraryOwnerId")) $("libraryOwnerId").value = "";

  if (has("deleteLibraryDocBtn")) {
    $("deleteLibraryDocBtn").classList.add("hidden");
  }
}

function populateLibraryEditor(doc) {
  if (!canManageLibrary() || !doc) return;

  state.editingLibraryDocId = doc.id;

  if (has("libraryFormTitle")) $("libraryFormTitle").textContent = "Edit document";
  if (has("libraryDocTitle")) $("libraryDocTitle").value = doc?.title || "";
  if (has("libraryDocType")) $("libraryDocType").value = doc?.document_type || "policy";
  if (has("libraryIssueDate")) $("libraryIssueDate").value = doc?.issue_date || "";
  if (has("libraryReviewDate")) $("libraryReviewDate").value = doc?.review_date || "";
  if (has("libraryExpiryDate")) $("libraryExpiryDate").value = doc?.expiry_date || "";
  if (has("libraryApprovalStatus")) {
    $("libraryApprovalStatus").value = doc?.approval_status || "not_required";
  }
  if (has("libraryConfidentiality")) {
    $("libraryConfidentiality").value = doc?.confidentiality_level || "standard";
  }
  if (has("libraryOwnerId")) $("libraryOwnerId").value = doc?.owner_id || "";
  if (has("libraryInputText")) {
    $("libraryInputText").value = doc?.input_text || doc?.generated_text || "";
  }
  if (has("deleteLibraryDocBtn")) {
    $("deleteLibraryDocBtn").classList.remove("hidden");
  }

  setLibraryTab("editor");
}

async function saveLibraryDocument() {
  if (!canManageLibrary()) {
    return banner("Manager or admin access required");
  }

  const payload = {
    title: has("libraryDocTitle") ? $("libraryDocTitle").value.trim() : "",
    document_type: has("libraryDocType") ? $("libraryDocType").value : "policy",
    issue_date: has("libraryIssueDate") ? $("libraryIssueDate").value || null : null,
    review_date: has("libraryReviewDate") ? $("libraryReviewDate").value || null : null,
    expiry_date: has("libraryExpiryDate") ? $("libraryExpiryDate").value || null : null,
    approval_status: has("libraryApprovalStatus")
      ? $("libraryApprovalStatus").value
      : "not_required",
    confidentiality_level: has("libraryConfidentiality")
      ? $("libraryConfidentiality").value
      : "standard",
    owner_id:
      has("libraryOwnerId") && $("libraryOwnerId").value
        ? Number($("libraryOwnerId").value)
        : null,
    input_text: has("libraryInputText")
      ? $("libraryInputText").value.trim() || null
      : null,
  };

  if (!payload.title) return banner("Title is required");

  if (state.editingLibraryDocId) {
    await api(`/documents/library/${state.editingLibraryDocId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    banner("Document updated");
  } else {
    await api("/documents/library", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    banner("Document created");
  }

  resetLibraryEditor();
  await loadLibrary();
  setLibraryTab("list");
}

async function deleteLibraryDocument() {
  if (!state.editingLibraryDocId || !confirm("Delete this document?")) return;

  await api(`/documents/library/${state.editingLibraryDocId}`, {
    method: "DELETE",
  });

  banner("Document deleted");
  resetLibraryEditor();

  if (has("libraryViewer")) {
    $("libraryViewer").innerHTML =
      `<h3>Select a document</h3><p>Open a policy or document from the list to read it here.</p>`;
  }

  await loadLibrary();
  setLibraryTab("list");
}

/* ---------------------------------------------------------
 * Manager
 * --------------------------------------------------------- */

function updateManagerSummary() {
  if (has("mgrStatUsers")) {
    $("mgrStatUsers").textContent = String(state.managerUsers.length || 0);
  }
  if (has("mgrStatDocs")) {
    $("mgrStatDocs").textContent = String(state.managerDocuments.length || 0);
  }
  if (has("mgrStatManagers")) {
    $("mgrStatManagers").textContent = String(
      state.managerUsers.filter(
        (u) => String(u?.role || "").toLowerCase() === "manager"
      ).length || 0
    );
  }
  if (has("mgrStatStaffOnly")) {
    $("mgrStatStaffOnly").textContent = String(
      state.managerUsers.filter(
        (u) => String(u?.role || "").toLowerCase() === "staff"
      ).length || 0
    );
  }
}

async function createManagerStaff() {
  const payload = {
    first_name: has("mgrFirst") ? $("mgrFirst").value.trim() : "",
    last_name: has("mgrLast") ? $("mgrLast").value.trim() : "",
    email: has("mgrEmail") ? $("mgrEmail").value.trim() : "",
    password: has("mgrPass") ? $("mgrPass").value : "",
    role: has("mgrRole") ? $("mgrRole").value : "staff",
  };

  if (!payload.first_name || !payload.last_name || !payload.email || !payload.password) {
    return banner("Complete all staff fields");
  }

  await api("/manager/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  ["mgrFirst", "mgrLast", "mgrEmail", "mgrPass"].forEach(
    (id) => has(id) && ($(id).value = "")
  );
  if (has("mgrRole")) $("mgrRole").value = "staff";

  await loadManager();
  banner("Staff created");
}

async function saveManagerDoc() {
  const payload = {
    title: has("mgrDocTitle") ? $("mgrDocTitle").value.trim() : "",
    input_text: has("mgrDocText") ? $("mgrDocText").value.trim() : "",
  };

  if (!payload.title) return banner("Title is required");

  await api("/manager/documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (has("mgrDocTitle")) $("mgrDocTitle").value = "";
  if (has("mgrDocText")) $("mgrDocText").value = "";

  await loadManager();
  banner("Document saved");
}

async function loadManager() {
  try {
    const data = await api("/manager/overview");
    if (!data) return;

    state.managerUsers = normArray(data?.users);
    state.managerDocuments = normArray(data?.documents);

    renderManagerUsers();
    renderManagerDocuments();
    updateManagerSummary();
  } catch (e) {
    if (/manager access required/i.test(String(e.message || ""))) {
      banner("Your account does not have manager access.");
    } else {
      banner(e.message || "Could not load manager panel.");
    }
    throw e;
  }
}

function renderManagerUsers() {
  if (!has("mgrUsers")) return;

  const host = $("mgrUsers");
  host.innerHTML = "";

  if (!state.managerUsers.length) {
    host.innerHTML = `<div class="entity-row"><div>No staff found.</div></div>`;
    return;
  }

  state.managerUsers.forEach((user) => {
    host.insertAdjacentHTML(
      "beforeend",
      `<div class="entity-row">
        <div>
          <div class="entity-title">${safe(
            `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
              user?.email ||
              "Unnamed user"
          )}</div>
          <div class="entity-meta">${safe(user?.email || "")}</div>
          <div class="entity-meta"><span class="tag ${
            String(user?.role || "").toLowerCase() === "manager"
              ? "warn"
              : "neutral"
          }">${safe(user?.role || "staff")}</span></div>
        </div>
      </div>`
    );
  });
}

function renderManagerDocuments() {
  if (!has("mgrDocs")) return;

  const host = $("mgrDocs");
  host.innerHTML = "";

  if (!state.managerDocuments.length) {
    host.innerHTML = `<div class="entity-row"><div>No home documents found.</div></div>`;
    return;
  }

  state.managerDocuments.forEach((doc) => {
    host.insertAdjacentHTML(
      "beforeend",
      `<div class="entity-row">
        <div>
          <div class="entity-title">${safe(doc?.title || "Untitled document")}</div>
          <div class="entity-meta">${safe(doc?.document_type || "home_document")}</div>
        </div>
      </div>`
    );
  });
}

/* ---------------------------------------------------------
 * Preferences
 * --------------------------------------------------------- */

function restorePrefs() {
  document.body.classList.toggle(
    "theme-dark",
    (localStorage.getItem("indicare_theme") || "light") === "dark"
  );

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
  loadContextState();
  syncHelpers();
  setLibraryTab("list");
  setManagerTab("staff");
  renderScopeBadges(getPageAssistantScope());
  renderAssistantInsights();
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
  on("footerTermsBtn", "click", () => openLegalModal("terms"));
  on("footerPrivacyBtn", "click", () => openLegalModal("privacy"));
  on("footerIPBtn", "click", () => openLegalModal("ip"));
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
  on("backWelcome", "click", resetWelcome);
  on("logout", "click", logoutNow);

  on("theme", "click", () => {
    document.body.classList.toggle("theme-dark");
    localStorage.setItem(
      "indicare_theme",
      document.body.classList.contains("theme-dark") ? "dark" : "light"
    );
    syncHelpers();
  });

  on("privacy", "click", () => {
    if (has("app")) $("app").classList.toggle("privacy-active");
    syncHelpers();
  });

  on("voiceReplies", "click", () => {
    setVoicePref(!state.speechEnabled);
  });

  on("stopVoiceBtn", "click", stopSpeaking);

  on("voiceSelect", "change", () => {
    const selected = has("voiceSelect") ? $("voiceSelect").value : "";
    saveVoiceName(selected);
    state.indicareVoice = null;
    pickIndiCareVoice();
  });

  on("copilot", "change", saveCopilotPref);
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
  on("navLibrary", "click", showLibraryView);
  on("navManager", "click", showManagerView);
  on("navAdmin", "click", showAdminView);

  on("toggleInsights", "click", () => {
    if (!has("assistantInsights")) return;
    const open = !$("assistantInsights").classList.contains("hidden");
    $("assistantInsights").classList.toggle("hidden", open);
    if (has("toggleInsights")) {
      $("toggleInsights").setAttribute("aria-expanded", open ? "false" : "true");
    }
  });

  document.querySelectorAll(".tabbtn[data-tab]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      setAdminTab(btn.dataset.tab);
      await loadActiveAdminTab();
    })
  );

  document
    .querySelectorAll(".tabbtn[data-library-tab]")
    .forEach((btn) =>
      btn.addEventListener("click", () => setLibraryTab(btn.dataset.libraryTab))
    );

  document
    .querySelectorAll(".tabbtn[data-manager-tab]")
    .forEach((btn) =>
      btn.addEventListener("click", () => setManagerTab(btn.dataset.managerTab))
    );

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

  on("adminActiveToggle", "click", () => {
    state.adminCreateActive = !state.adminCreateActive;
    syncHelpers();
  });

  on("createUserBtn", "click", createAdminUser);
  on("refreshUsersBtn", "click", loadAdminUsers);
  on("userSearch", "input", loadAdminUsers);
  on("userRoleFilter", "change", loadAdminUsers);
  on("userHomeFilter", "change", loadAdminUsers);
  on("userArchivedFilter", "change", loadAdminUsers);

  on("createHomeBtn", "click", createHome);
  on("refreshHomesBtn", "click", loadHomes);

  on("createProviderBtn", "click", createProvider);
  on("refreshProvidersBtn", "click", loadProviders);

  on("createDocBtn", "click", createDocumentRecord);
  on("refreshDocsBtn", "click", loadDocuments);
  on("docSearch", "input", loadDocuments);
  on("docHomeFilter", "change", loadDocuments);
  on("docTypeFilter", "change", loadDocuments);
  on("docApprovalFilter", "change", loadDocuments);

  on("refreshBillingBtn", "click", loadBilling);
  on("refreshAuditBtn", "click", loadAudit);

  on("refreshLibraryBtn", "click", loadLibrary);
  on("refreshManagerLibraryBtn", "click", loadLibrary);
  on("librarySearch", "input", loadLibrary);
  on("libraryTypeFilter", "change", loadLibrary);
  on("libraryApprovalFilter", "change", loadLibrary);
  on("saveLibraryDocBtn", "click", saveLibraryDocument);
  on("resetLibraryDocBtn", "click", resetLibraryEditor);
  on("deleteLibraryDocBtn", "click", deleteLibraryDocument);

  on("createStaff", "click", createManagerStaff);
  on("saveDoc", "click", saveManagerDoc);
  on("refreshManagerBtn", "click", loadManager);
  on("refreshManagerDocsBtn", "click", loadManager);

  bindLegalControls();
}

/* ---------------------------------------------------------
 * Init
 * --------------------------------------------------------- */

async function init() {
  bind();
  restorePrefs();
  initSpeech();
  resize();

  try {
    await loadMe();
  } catch (_) {
    return;
  }

  if (isAdmin()) setAdminTab(activeAdminTab());
  setWelcome();

  try {
    await loadConversations();
  } catch (e) {
    console.error("loadConversations failed", e);
    banner(indiCareCopy("conversationsLoadFail"));
  }

  if (isAdmin()) {
    try {
      await loadAdminReferenceData();
      await loadActiveAdminTab();
    } catch (e) {
      console.error("loadAdminReferenceData failed", e);
      banner(indiCareCopy("adminDataLoadFail"));
    }
  }

  if (isManager()) {
    try {
      await loadManager();
    } catch (e) {
      console.error("loadManager failed", e);
    }
  }

  try {
    await loadLibrary();
  } catch (e) {
    console.error("loadLibrary failed", e);
  }

  renderScopeBadges(getPageAssistantScope());
  renderAssistantInsights();

  showAssistantView();
  enforceLegalGate();
}

window.quick = quick;
window.resize = resize;

document.addEventListener("DOMContentLoaded", init);
