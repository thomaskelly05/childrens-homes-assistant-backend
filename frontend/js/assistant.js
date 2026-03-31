/*
  © 2026 IndiCare. All rights reserved.
  Proprietary and confidential. Unauthorised copying, reproduction,
  reverse engineering, redistribution, or commercial exploitation prohibited.
*/

window.onerror = function(message, source, line, col, error) {
  console.error("window.onerror", { message, source, line, col, error });
};

window.onunhandledrejection = function(event) {
  console.error("unhandledrejection", event.reason);
};

let conversationId = null;
let currentDocumentText = null;
let currentDocumentName = null;
let isStreaming = false;
let queue = [];
let typing = false;
let lastPrompt = "";
let cache = [];

let currentUser = null;
let adminCreateActive = true;
let adminUsers = [];
let homes = [];
let providers = [];
let docs = [];
let billing = null;
let audit = [];
let libraryDocs = [];
let selectedLibraryDoc = null;
let editingLibraryDocId = null;

let managerUsers = [];
let managerDocuments = [];

let indicareVoice = null;
let speechEnabled = false;
let speechReady = false;
let availableVoices = [];

let currentIntent = "general";
let lastAssistantText = "";

let currentStreamMeta = {
  sources: [],
  runtime: {}
};

let contextState = {
  child: "",
  home: "",
  shift: ""
};

const DEFAULT_LANGUAGE = "en-GB";
const REG_PROMPT = " [SYSTEM: Verify response against Ofsted SCCIF and Quality Standards for Children's Homes. Use a calm, professional, safeguarding-aware tone. Keep wording clear, factual, structured, and suitable for care records, management review, and professional communication. Avoid slang, exaggeration, or overly casual wording.]";
const RESP = { quick: "Quick", balanced: "Balanced", deep: "Deep" };
const LANG = { "en-GB": "English", "pl-PL": "Polish", "ro-RO": "Romanian", "ur-PK": "Urdu", "ar": "Arabic" };
const GREET = [
  n => `Good morning, ${n}.`,
  n => `Welcome back, ${n}.`,
  n => `Ready when you are, ${n}.`,
  n => `Good to see you, ${n}.`
];

const LEGAL_VERSION = "2026-03-29-v1";
const LEGAL_ACCEPTANCE_KEY = "indicare_legal_acceptance";
const LEGAL_TABS = ["terms", "privacy", "ip", "acceptance"];
const ASSISTANT_REDIRECT_GUARD_KEY = "indicare_assistant_redirect_guard";

const $ = id => document.getElementById(id);
const has = id => !!document.getElementById(id);

const safe = s => String(s || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const role = () => String(currentUser?.role || "").toLowerCase();
const isAdmin = () => ["admin", "provider_admin"].includes(role());
const isManager = () => role() === "manager";
const isStaff = () => role() === "staff";
const canManageLibrary = () => isAdmin() || isManager();

const selectedLang = () => has("lang") ? ($("lang").value || DEFAULT_LANGUAGE) : DEFAULT_LANGUAGE;
const selectedMode = () => has("mode") ? ($("mode").value || "balanced") : "balanced";
const firstName = () => currentUser?.first_name || localStorage.getItem("first_name") || "there";

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
    sessionStorage.setItem(ASSISTANT_REDIRECT_GUARD_KEY, String(Date.now()));
  } catch (_) {}
}

function clearAssistantRedirectGuard() {
  try {
    sessionStorage.removeItem(ASSISTANT_REDIRECT_GUARD_KEY);
  } catch (_) {}
}

function banner(t, ms = 2400) {
  const e = $("status");
  if (!e) return;
  e.textContent = t;
  e.style.display = "block";
  clearTimeout(banner.t);
  banner.t = setTimeout(() => {
    e.style.display = "none";
  }, ms);
}

function stripSystem(s) {
  return String(s || "").replace(/\s*\[SYSTEM:[\s\S]*$/i, "").trim();
}

function setTitle(t = "Intelligence for Care") {
  if (has("title")) $("title").textContent = t;
}

function resize() {
  if (!has("input")) return;
  const t = $("input");
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 120) + "px";
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
  if (has("langHelp")) $("langHelp").textContent = `Assistant replies in ${LANG[selectedLang()] || "English"}.`;
  if (has("modeHelp")) $("modeHelp").textContent = `Mode: ${RESP[selectedMode()]}`;
  if (has("theme")) $("theme").classList.toggle("active", document.body.classList.contains("theme-dark"));
  if (has("privacy") && has("app")) $("privacy").classList.toggle("active", $("app").classList.contains("privacy-active"));
  if (has("adminActiveToggle")) $("adminActiveToggle").classList.toggle("active", adminCreateActive);
  if (has("voiceReplies")) $("voiceReplies").classList.toggle("active", speechEnabled);
}

function userInitials() {
  const full = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || firstName();
  const p = String(full).trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "Y";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[1][0]).toUpperCase();
}

function setWelcome() {
  if (has("welcomeTitle")) $("welcomeTitle").textContent = GREET[Math.floor(Math.random() * GREET.length)](firstName());
  if (has("welcomeText")) $("welcomeText").textContent = "Your assistant is ready to help with records, safeguarding, risk, guidance, and drafting.";
}

function buildLangInstruction() {
  return selectedLang() === DEFAULT_LANGUAGE
    ? ""
    : ` [SYSTEM: Reply in ${LANG[selectedLang()]}. Keep safeguarding, care, and formal documentation wording clear and professional.]`;
}

function openSettings() {
  if (has("settingsOverlay")) $("settingsOverlay").classList.add("show");
  if (has("settings")) $("settings").classList.add("open");
}

function closeSettings() {
  if (has("settingsOverlay")) $("settingsOverlay").classList.remove("show");
  if (has("settings")) $("settings").classList.remove("open");
}

function summariseTitle(text) {
  const clean = stripSystem(text).replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim();
  if (!clean) return "New Log";
  const stop = new Set(["the", "a", "an", "and", "or", "but", "for", "with", "from", "about", "who", "what", "when", "where", "why", "how", "are", "is", "do", "does", "did", "please", "tell", "write", "good", "morning", "indicare"]);
  const words = clean.split(" ").filter(Boolean);
  const pool = words.filter(w => !stop.has(w.toLowerCase()));
  const picked = (pool.length ? pool : words).slice(0, 3);
  return picked.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "New Log";
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
      html += line.trim() === "" ? "<br>" : /^<h3>.*<\/h3>$/.test(line) ? line : `<p>${line}</p>`;
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

function normArray(value) {
  return Array.isArray(value) ? value : [];
}

function normObj(value) {
  return value && typeof value === "object" ? value : {};
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
    contextSaved: "Context saved."
  };
  return map[key] || "";
}

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
    incident: "Respond as a professional incident record using factual, neutral language. Include headings: Summary, What happened, Staff response, Outcome, Follow-up.",
    risk: "Generate a structured risk assessment. Include headings: Presenting risks, Triggers, Protective factors, Staff actions, Review actions.",
    handover: "Write a clear handover summary for the next shift. Include: Key events, Risks, Actions completed, Outstanding actions.",
    chronology: "Write a factual chronology entry in neutral language, suitable for care records.",
    keywork: "Write a keywork record with discussion, young person's views, support given, and next steps.",
    review: "Write a formal review summary aligned with care standards and Ofsted expectations.",
    safeguarding: "Write a safeguarding-focused response prioritising risk, protection, immediate actions, and recording expectations.",
    daily_note: "Write a daily note suitable for care records using clear, factual wording.",
    report: "Write a formal report summary using structured, professional language.",
    general: "Respond clearly and professionally for care documentation."
  };
  return map[intent] || map.general;
}

function copilotPrompt() {
  const mode = has("copilot") ? $("copilot").value : "default";
  if (mode === "safeguarding") return "You are IndiCare Safeguarding Copilot. Prioritise immediate safety, risk, protection, and accurate recording.";
  if (mode === "manager") return "You are IndiCare Manager Copilot. Focus on oversight, accountability, actions, and compliance.";
  if (mode === "ofsted") return "You are IndiCare Ofsted Copilot. Write in a way that is defensible, inspection-ready, and aligned to standards.";
  if (mode === "documentation") return "You are IndiCare Documentation Copilot. Produce clear, factual, well-structured records ready to paste.";
  return "You are IndiCare Assistant. Be calm, professional, structured, and safeguarding-aware.";
}

function loadContextState() {
  try {
    contextState = JSON.parse(localStorage.getItem("indicare_context_state") || "{}");
  } catch {
    contextState = {};
  }
  contextState = {
    child: contextState.child || "",
    home: contextState.home || "",
    shift: contextState.shift || ""
  };
  if (has("contextChild")) $("contextChild").value = contextState.child;
  if (has("contextHome")) $("contextHome").value = contextState.home;
  if (has("contextShift")) $("contextShift").value = contextState.shift;
}

function saveContextState() {
  contextState = {
    child: has("contextChild") ? $("contextChild").value.trim() : "",
    home: has("contextHome") ? $("contextHome").value.trim() : "",
    shift: has("contextShift") ? $("contextShift").value.trim() : ""
  };
  localStorage.setItem("indicare_context_state", JSON.stringify(contextState));
  banner(indiCareCopy("contextSaved"));
}

function buildContextBlock() {
  const lines = [];
  if (contextState.child) lines.push(`Current child: ${contextState.child}`);
  if (contextState.home) lines.push(`Current home: ${contextState.home}`);
  if (contextState.shift) lines.push(`Current shift: ${contextState.shift}`);
  return lines.length ? `[CONTEXT]\n${lines.join("\n")}\n\n` : "";
}

function loadCopilotPref() {
  if (!has("copilot")) return;
  $("copilot").value = localStorage.getItem("indicare_copilot_mode") || "default";
}

function saveCopilotPref() {
  if (!has("copilot")) return;
  localStorage.setItem("indicare_copilot_mode", $("copilot").value);
}

function convertPrompt(type) {
  const prompts = {
    incident: "Convert the last response into a formal incident report.",
    risk: "Convert the last response into a full risk assessment.",
    handover: "Rewrite the last response as a handover summary.",
    chronology: "Rewrite the last response as a chronology entry.",
    keywork: "Rewrite the last response as a keywork record.",
    review: "Rewrite the last response as a manager review summary."
  };
  return prompts[type] || "Rewrite the last response in a more formal structured format.";
}

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
    user_id: currentUser?.id || null,
    email: currentUser?.email || null
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
        accepted_at: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn("Legal acceptance log skipped:", e?.message || e);
  }
}

function setLegalTab(name = "terms") {
  const tab = LEGAL_TABS.includes(name) ? name : "terms";
  document.querySelectorAll("[data-legal-tab]").forEach(btn => {
    const active = btn.dataset.legalTab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll("[data-legal-panel]").forEach(panel => {
    panel.classList.toggle("hidden", panel.dataset.legalPanel !== tab);
  });
}

function legalControlsDisabled(disabled) {
  [
    "send", "input", "upload", "mic", "newChat", "navAssistant", "navLibrary",
    "navManager", "navAdmin", "openSettings", "sideToggle", "mobileMenu"
  ].forEach(id => {
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

function convert(type) {
  if (!lastAssistantText || !has("input")) return;
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");
  $("input").value = `${convertPrompt(type)}\n\n${lastAssistantText}`;
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
        conversation_id: conversationId,
        context: contextState
      })
    });
    banner("Saved to record");
  } catch (e) {
    banner(e.message || "Save failed");
  }
}

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
  availableVoices.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(opt);
  });
  if ([...sel.options].some(o => o.value === current)) sel.value = current;
  else sel.value = "";
}

function pickIndiCareVoice() {
  if (!("speechSynthesis" in window)) return null;
  const savedName = getSavedVoiceName();
  const voices = window.speechSynthesis.getVoices() || [];
  availableVoices = voices.slice().sort((a, b) => {
    const gbA = /en-GB/i.test(a.lang) ? 0 : 1;
    const gbB = /en-GB/i.test(b.lang) ? 0 : 1;
    if (gbA !== gbB) return gbA - gbB;
    return a.name.localeCompare(b.name);
  });
  populateVoiceSelect();
  if (!voices.length) return null;
  indicareVoice =
    voices.find(v => savedName && v.name === savedName) ||
    voices.find(v => /en-GB/i.test(v.lang) && /female|samantha|serena|karen|libby|hazel|susan|zira/i.test(v.name)) ||
    voices.find(v => /en-GB/i.test(v.lang)) ||
    voices.find(v => /en/i.test(v.lang)) ||
    voices[0] || null;
  speechReady = true;
  return indicareVoice;
}

function stopSpeaking() {
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch {}
}

function speakText(text) {
  if (!speechEnabled) return;
  if (!("speechSynthesis" in window)) return;
  const clean = cleanSpeechText(text);
  if (!clean) return;
  try {
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.voice = indicareVoice || pickIndiCareVoice();
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
  speechEnabled = localStorage.getItem("indicare_voice_replies") === "true";
  if (has("voiceReplies")) $("voiceReplies").classList.toggle("active", speechEnabled);
}

function setVoicePref(value) {
  speechEnabled = !!value;
  localStorage.setItem("indicare_voice_replies", String(speechEnabled));
  if (has("voiceReplies")) $("voiceReplies").classList.toggle("active", speechEnabled);
}

function initSpeech() {
  if (!("speechSynthesis" in window)) {
    speechReady = false;
    availableVoices = [];
    populateVoiceSelect();
    if (has("voiceReplies")) $("voiceReplies").classList.remove("active");
    return;
  }
  pickIndiCareVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    pickIndiCareVoice();
  };
}

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
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {})
    }
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
    console.warn("401 detected → redirecting to login");
    markAssistantRedirectGuard();
    window.location.replace("/login");
    return null;
  }

  if (res.status === 403 && redirectFor403(data)) {
    return null;
  }

  if (!res.ok) {
    throw new Error(data?.detail || data?.error || `Request failed (${res.status})`);
  }

  return data || {};
}

async function logoutNow() {
  try {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
  } catch {}
  localStorage.removeItem("current_user");
  sessionStorage.removeItem("current_user");
  localStorage.removeItem("first_name");
  sessionStorage.removeItem("indicare_login_redirect_guard");
  sessionStorage.removeItem("indicare_assistant_redirect_guard");
  window.location.replace("/login");
}

async function loadMe() {
  if (window.auth && typeof window.auth.validateSession === "function") {
    const state = await window.auth.validateSession();

    if (!state || !state.authenticated) {
      if (!hasRecentAssistantRedirectGuard()) {
        markAssistantRedirectGuard();
        window.location.replace("/login");
      }
      throw new Error("Not authenticated");
    }

    if (!state.mfa_enabled) {
      if (!hasRecentAssistantRedirectGuard()) {
        markAssistantRedirectGuard();
        window.location.replace("/mfa-setup");
      }
      throw new Error("MFA setup required");
    }

    if (!state.mfa_verified) {
      if (!hasRecentAssistantRedirectGuard()) {
        markAssistantRedirectGuard();
        window.location.replace("/mfa");
      }
      throw new Error("MFA verification required");
    }
  }

  const data = await api("/auth/me");
  if (!data?.user) throw new Error("No user");

  currentUser = data.user;
  localStorage.setItem("first_name", currentUser.first_name || "");
  clearAssistantRedirectGuard();

  if (isAdmin() || isManager() || isStaff()) has("navLibrary") && $("navLibrary").classList.remove("hidden");
  if (isManager()) has("navManager") && $("navManager").classList.remove("hidden");
  if (isAdmin()) has("navAdmin") && $("navAdmin").classList.remove("hidden");
  if (canManageLibrary()) has("managerEditorTab") && $("managerEditorTab").classList.remove("hidden");
}

function closeMobilePanels() {
  if (window.innerWidth <= 768) {
    has("sidebar") && $("sidebar").classList.remove("open");
    has("overlay") && $("overlay").classList.remove("show");
    closeSettings();
  }
}

function hideAllPanels() {
  ["assistantPanel", "libraryPanel", "managerPanel", "adminPanel"].forEach(id => has(id) && $(id).classList.add("hidden"));
  ["navAssistant", "navLibrary", "navManager", "navAdmin"].forEach(id => has(id) && $(id).classList.remove("active"));
}

function showAssistantView() {
  hideAllPanels();
  has("assistantPanel") && $("assistantPanel").classList.remove("hidden");
  has("inputWrap") && $("inputWrap").classList.remove("hidden");
  has("navAssistant") && $("navAssistant").classList.add("active");
  setTitle(conversationId ? (has("title") ? $("title").textContent : "Intelligence for Care") : "Intelligence for Care");
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
  loadLibrary().catch(e => {
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
  conversationId = null;
  currentDocumentText = null;
  currentDocumentName = null;
  currentStreamMeta = { sources: [], runtime: {} };
  stopSpeaking();
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

function renderHistory(rows) {
  if (!has("history")) return;
  const host = $("history");
  host.innerHTML = "";
  normArray(rows).forEach(r => {
    const item = document.createElement("div");
    item.className = `item ${Number(r?.id) === Number(conversationId) ? "active" : ""}`;
    item.innerHTML = `<div class="row"><button class="mainbtn"><div class="ttl">${safe(stripSystem(r?.title || "Observation"))}</div></button><button class="mini">⧉</button><button class="mini danger">🗑</button></div>`;
    const buttons = item.querySelectorAll("button");
    const main = buttons[0];
    const copy = buttons[1];
    const del = buttons[2];
    if (main) main.onclick = () => {
      if (!legalAcceptanceValid()) return openLegalModal("acceptance");
      showAssistantView();
      openConversation(r?.id, stripSystem(r?.title || "Observation"));
    };
    if (copy) copy.onclick = e => {
      e.stopPropagation();
      navigator.clipboard.writeText(stripSystem(r?.title || "Observation"));
      banner(indiCareCopy("copied"));
    };
    if (del) del.onclick = e => {
      e.stopPropagation();
      deleteConversation(r?.id);
    };
    host.appendChild(item);
  });
}

function filterConversations() {
  const q = has("search") ? $("search").value.trim().toLowerCase() : "";
  renderHistory(q ? cache.filter(r => stripSystem(r?.title || "").toLowerCase().includes(q)) : cache);
}

async function loadConversations() {
  const data = await api("/chat/conversations");
  if (!data) return [];
  cache = normArray(data?.conversations || data);
  renderHistory(cache);
  return cache;
}

async function openConversation(id, title) {
  if (!id) return;
  const data = await api(`/chat/conversations/${id}`);
  if (!data) return;
  conversationId = id;
  currentStreamMeta = { sources: [], runtime: {} };
  if (has("messages")) {
    $("messages").innerHTML = "";
    has("empty") && $("empty").classList.add("hidden");
    $("messages").classList.remove("hidden");
  }
  normArray(data.messages).forEach(m => appendMessage(m?.role || "assistant", m?.message || "", { messageId: m?.id }));
  if (data.document) {
    currentDocumentText = data.document.text || data.document.input_text || "";
    currentDocumentName = data.document.filename || data.document.name || "";
    docShow(currentDocumentName);
  } else {
    currentDocumentText = null;
    currentDocumentName = null;
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
    await api(`/chat/conversations/${id}/rename`, { method: "POST", body: JSON.stringify({ title: short }) });
  } catch {}
  setTitle(short);
  try {
    await loadConversations();
  } catch {}
}

async function deleteConversation(id) {
  if (!id || !confirm("Delete this conversation?")) return;
  await api(`/chat/conversations/${id}`, { method: "DELETE" });
  if (Number(conversationId) === Number(id)) resetWelcome();
  await loadConversations();
  banner(indiCareCopy("deleted"));
}

function renderSourceCard(source) {
  const type = safe(source?.type || "source");
  const label = safe(source?.label || source?.document_title || "Source");
  const excerpt = safe(source?.excerpt || "");
  const section = safe(source?.section || "");
  const page = source?.page_number != null ? safe(String(source.page_number)) : "";
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
        ${excerpt ? `<div class="entity-meta" style="margin-top:8px;line-height:1.55;">${excerpt}</div>` : ""}
        ${url ? `<div class="entity-meta" style="margin-top:8px;"><a href="${safe(url)}" target="_blank" rel="noopener noreferrer">Open source</a></div>` : ""}
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

function renderRuntimeHtml(runtime) {
  const data = normObj(runtime);
  if (!Object.keys(data).length) return "";
  const chips = [];
  if (data.mode) chips.push(`<span class="tag neutral">${safe(data.mode)}</span>`);
  if (data.task_type) chips.push(`<span class="tag neutral">${safe(data.task_type)}</span>`);
  if (data.output_type) chips.push(`<span class="tag neutral">${safe(data.output_type)}</span>`);
  if (data.urgency) chips.push(`<span class="tag ${data.urgency === "urgent" ? "bad" : data.urgency === "heightened" ? "warn" : "neutral"}">${safe(data.urgency)}</span>`);
  if (data.safeguarding_level) chips.push(`<span class="tag ${data.safeguarding_level === "urgent" ? "bad" : data.safeguarding_level === "heightened" ? "warn" : "neutral"}">${safe(data.safeguarding_level)}</span>`);
  const actions = normArray(data.suggested_actions);
  return `
    <div class="card" style="margin-top:10px;padding:12px;">
      <div style="font-weight:600;margin-bottom:8px;">IndiCare reasoning</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">${chips.join("")}</div>
      ${actions.length ? `
        <div class="entity-meta" style="margin-top:10px;font-weight:600;">Suggested priorities</div>
        <ul style="margin:8px 0 0 18px;">
          ${actions.map(a => `<li style="margin-bottom:6px;">${safe(a)}</li>`).join("")}
        </ul>
      ` : ""}
    </div>
  `;
}

function attachMetaToWrap(wrap, meta = {}) {
  if (!wrap) return;
  const block = wrap.querySelector(".block");
  if (!block) return;
  let oldMetaBox = wrap.querySelector(".assistant-source-box");
  if (oldMetaBox) oldMetaBox.remove();
  const html = `${renderRuntimeHtml(meta.runtime)}${renderSourcesHtml(meta.sources)}`;
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

function appendMessage(roleName, text, opts = {}) {
  if (!has("messages")) return;
  const shown = roleName === "user" ? stripSystem(text) : text;
  if (roleName === "assistant") lastAssistantText = shown;

  const wrap = document.createElement("div");
  wrap.className = `wrap ${roleName}`;
  wrap.innerHTML = `
    <div class="avatar">${roleName === "assistant" ? "IC" : userInitials()}</div>
    <div class="block">
      <div class="msg">${roleName === "assistant" ? render(shown, "assistant") : safe(shown)}</div>
      ${opts.meta ? `<div class="meta">${safe(opts.meta)}</div>` : ""}
      <div class="actions"></div>
    </div>
  `;

  const actions = wrap.querySelector(".actions");
  const addChip = (label, fn) => {
    if (!actions) return;
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = label;
    b.onclick = fn;
    actions.appendChild(b);
  };

  addChip("Copy", () =>
    navigator.clipboard.writeText(shown)
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

  if (roleName === "assistant" && (opts.sources || opts.runtime)) {
    attachMetaToWrap(wrap, {
      sources: opts.sources || [],
      runtime: opts.runtime || {}
    });
  }

  $("messages").appendChild(wrap);
  if (has("assistantPanel")) $("assistantPanel").scrollTop = $("assistantPanel").scrollHeight;
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
      <div class="meta">Reply language: ${LANG[selectedLang()] || "English"} · Mode: ${RESP[selectedMode()]}</div>
    </div>
  `;
  $("messages").appendChild(wrap);
  if (has("assistantPanel")) $("assistantPanel").scrollTop = $("assistantPanel").scrollHeight;
  return wrap;
}

function startTyping() {
  if (typing) return;
  typing = true;
  const el = document.querySelector("#streaming .msg");
  if (!el) {
    typing = false;
    return;
  }

  let raw = el.getAttribute("data-raw") || "";
  const tick = setInterval(() => {
    if (queue.length) {
      raw += queue.shift();
      el.innerHTML = render(raw, "assistant");
      el.setAttribute("data-raw", raw);
      if (has("assistantPanel")) $("assistantPanel").scrollTop = $("assistantPanel").scrollHeight;
    } else if (!isStreaming) {
      clearInterval(tick);
      typing = false;
      el.classList.remove("typing");
      const finalRaw = el.getAttribute("data-raw") || "";
      lastAssistantText = finalRaw;
      attachMetaToStreamingMessage(currentStreamMeta);
      speakText(finalRaw);
    }
  }, 2);
}

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

function handleMetaEvent(payload) {
  let parsed = {};
  try {
    parsed = JSON.parse(payload || "{}");
  } catch {
    parsed = {};
  }
  currentStreamMeta = {
    sources: normArray(parsed.sources),
    runtime: normObj(parsed.runtime)
  };
  attachMetaToStreamingMessage(currentStreamMeta);
}

async function stream(url, body) {
  body = normObj(body);
  currentIntent = body.intent || detectIntent(body.message || "");
  currentStreamMeta = { sources: [], runtime: {} };

  const promptPrefix =
    copilotPrompt() + "\n\n" +
    buildContextBlock() +
    buildStructuredPrompt(currentIntent) + "\n\n";

  body.message =
    promptPrefix +
    String(body.message || "") +
    REG_PROMPT +
    buildLangInstruction();

  body.intent = currentIntent;
  body.structured = true;
  body.reply_language = selectedLang();
  body.reply_language_label = LANG[selectedLang()] || "English";
  body.response_mode = selectedMode();
  body.context = contextState;

  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
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
      if (contentType.includes("application/json")) data = await res.json();
    } catch {}
    if (redirectFor403(data)) return;
  }

  if (!res.ok) throw new Error(await res.text() || `Chat request failed (${res.status})`);

  if (!res.body || contentType.includes("application/json")) {
    let data = {};
    try {
      data = await res.json();
    } catch {}
    const reply = data.reply || data.message || data.output || "Done.";
    appendMessage("assistant", reply, {
      sources: normArray(data.sources),
      runtime: normObj(data.runtime)
    });
    speakText(reply);
    return;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";

  createStreamMsg();
  queue.push(" ");
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
      if (eventName === "message") {
        if (!payload) return;
        for (const ch of payload) queue.push(ch);
        startTyping();
      }
    });
  }
}

async function uploadDoc(file) {
  const fd = new FormData();
  fd.append("file", file);
  if (conversationId) fd.append("conversation_id", conversationId);
  const data = await api("/chat/upload", { method: "POST", body: fd });
  if (!data) return;
  currentDocumentText = data?.text || data?.document_text || "";
  currentDocumentName = data?.filename || data?.name || file?.name || "";
  docShow(currentDocumentName);
  banner(`Document attached: ${currentDocumentName}`);
}

async function editMessage(messageId, currentText) {
  if (!messageId) return;
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  const edited = prompt("Edit message", currentText);
  if (edited === null) return;
  const cleaned = stripSystem(edited).trim();
  if (!cleaned) return banner("Message cannot be empty");

  isStreaming = true;
  if (has("send")) $("send").disabled = true;

  try {
    await stream(`/chat/messages/${messageId}/edit`, {
      message: cleaned,
      intent: detectIntent(cleaned),
      structured: true,
      document_text: currentDocumentText,
      document_name: currentDocumentName,
      response_mode: selectedMode()
    });

    if (conversationId) {
      await openConversation(conversationId, has("title") ? $("title").textContent : "Observation");
    }
    banner(indiCareCopy("updated"));
  } catch (e) {
    banner(e.message || "Edit failed");
  } finally {
    isStreaming = false;
    if (has("send")) $("send").disabled = false;
  }
}

async function sendMessage() {
  if (!has("input")) return;
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  const raw = $("input").value.trim();
  const text = stripSystem(raw);
  if (!text || isStreaming) return;

  const prev = conversationId;
  lastPrompt = text;
  currentIntent = detectIntent(text);

  isStreaming = true;
  if (has("send")) $("send").disabled = true;
  if (has("empty")) $("empty").classList.add("hidden");
  if (has("messages")) $("messages").classList.remove("hidden");

  appendMessage("user", text, { meta: `Mode: ${RESP[selectedMode()]} · Intent: ${currentIntent}` });
  $("input").value = "";
  resize();

  try {
    await stream("/chat/", {
      message: text,
      intent: currentIntent,
      structured: true,
      conversation_id: conversationId,
      document_text: currentDocumentText,
      document_name: currentDocumentName
    });
  } catch (e) {
    const streamEl = document.querySelector("#streaming .msg");
    if (streamEl) {
      streamEl.classList.remove("typing");
      streamEl.innerHTML = render(`Sorry, there was a problem: ${e.message}`, "assistant");
      attachMetaToStreamingMessage(currentStreamMeta);
    } else {
      appendMessage("assistant", `Sorry, there was a problem: ${e.message}`);
    }
  } finally {
    isStreaming = false;
    if (has("send")) $("send").disabled = false;
    try {
      const rows = await loadConversations();
      if (!prev && !conversationId && rows.length) {
        conversationId = rows[0]?.id;
        await renameShort(conversationId, lastPrompt);
      }
    } catch {}
  }
}

function quick(type) {
  if (!has("input")) return;
  if (!legalAcceptanceValid()) return openLegalModal("acceptance");

  const prompts = {
    ofsted: "Rewrite the above documentation so it aligns with Ofsted Quality Standards and is ready for professional review.",
    risk: "Generate a formal risk assessment based on this situation. Include presenting risks, protective factors, staff actions, and follow-up actions."
  };
  $("input").value = prompts[type] || "Rewrite this in a more formal professional format.";
  resize();
  sendMessage();
}

function startSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return banner(indiCareCopy("speechUnsupported"));

  const rec = new SR();
  rec.lang = selectedLang() || "en-GB";
  rec.interimResults = true;
  rec.continuous = false;
  if (has("mic")) $("mic").style.color = "var(--accent)";

  rec.onresult = e => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
    if (has("input")) $("input").value = text.trim();
    resize();
  };

  rec.onerror = () => banner(indiCareCopy("speechFailed"));
  rec.onend = () => {
    if (has("mic")) $("mic").style.color = "";
  };
  rec.start();
}

function fillSelect(id, rows, placeholder, valueKey = "id", labelFn = r => r.name) {
  if (!has(id)) return;
  const sel = $(id);
  const current = sel.value;
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  normArray(rows).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r?.[valueKey] ?? "";
    opt.textContent = labelFn(r || {}) || "";
    sel.appendChild(opt);
  });
  if ([...sel.options].some(o => String(o.value) === String(current))) sel.value = current;
}

function updateAdminSummary() {
  if (has("sumUsers")) $("sumUsers").textContent = String(adminUsers.length || 0);
  if (has("sumHomes")) $("sumHomes").textContent = String(homes.length || 0);
  if (has("sumProviders")) $("sumProviders").textContent = String(providers.length || 0);
  if (has("sumDocs")) $("sumDocs").textContent = String(docs.length || 0);
}

function activeAdminTab() {
  return localStorage.getItem("indicare_admin_tab") || "users";
}

function setAdminTab(name) {
  document.querySelectorAll(".tabbtn[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.add("hidden"));
  if (has("tab-" + name)) $("tab-" + name).classList.remove("hidden");
  localStorage.setItem("indicare_admin_tab", name);
}

function setLibraryTab(name) {
  document.querySelectorAll(".tabbtn[data-library-tab]").forEach(b => b.classList.toggle("active", b.dataset.libraryTab === name));
  if (has("library-list-tab")) $("library-list-tab").classList.toggle("hidden", name !== "list");
  if (has("library-editor-tab")) $("library-editor-tab").classList.toggle("hidden", name !== "editor");
  if (name === "editor" && !canManageLibrary()) setLibraryTab("list");
}

function setManagerTab(name) {
  document.querySelectorAll(".tabbtn[data-manager-tab]").forEach(b => b.classList.toggle("active", b.dataset.managerTab === name));
  document.querySelectorAll(".manager-tab").forEach(t => t.classList.add("hidden"));
  if (has("manager-" + name + "-tab")) $("manager-" + name + "-tab").classList.remove("hidden");
}

async function loadAdminReferenceData() {
  const [h, p, u] = await Promise.allSettled([
    api("/admin/homes"),
    api("/admin/providers"),
    api("/admin/users")
  ]);

  homes = normArray(h.status === "fulfilled" ? h.value?.homes : []);
  providers = normArray(p.status === "fulfilled" ? p.value?.providers : []);
  adminUsers = normArray(u.status === "fulfilled" ? u.value?.users : []);

  fillSelect("adminHomeId", homes, "Select home");
  fillSelect("userHomeFilter", homes, "All homes");
  fillSelect("docHomeFilter", homes, "All homes");
  fillSelect("docHomeId", homes, "Select home");
  fillSelect("homeProviderId", providers, "Select provider");

  const managers = adminUsers.filter(u => ["manager", "admin", "provider_admin"].includes(String(u?.role || "").toLowerCase()));
  fillSelect("homeRegisteredManagerId", managers, "Select manager", "id", r => `${r?.first_name || ""} ${r?.last_name || ""}`.trim() || r?.email || "");
  fillSelect("docOwnerId", adminUsers, "Select owner", "id", r => `${r?.first_name || ""} ${r?.last_name || ""}`.trim() || r?.email || "");
  fillSelect("libraryOwnerId", adminUsers, "Select owner", "id", r => `${r?.first_name || ""} ${r?.last_name || ""}`.trim() || r?.email || "");

  updateAdminSummary();
}

async function loadActiveAdminTab() {
  const t = activeAdminTab();
  if (t === "users") await loadAdminUsers();
  if (t === "homes") await loadHomes();
  if (t === "providers") await loadProviders();
  if (t === "documents") await loadDocuments();
  if (t === "billing") await loadBilling();
  if (t === "audit") await loadAudit();
}

function clearAdminForm() {
  ["adminFirstName", "adminLastName", "adminEmail", "adminPassword"].forEach(id => has(id) && ($(id).value = ""));
  if (has("adminRole")) $("adminRole").value = "staff";
  if (has("adminHomeId")) $("adminHomeId").value = "";
  adminCreateActive = true;
  syncHelpers();
}

function adminPayloadFromForm() {
  return {
    first_name: has("adminFirstName") ? $("adminFirstName").value.trim() : "",
    last_name: has("adminLastName") ? $("adminLastName").value.trim() : "",
    email: has("adminEmail") ? $("adminEmail").value.trim() : "",
    password: has("adminPassword") ? $("adminPassword").value : "",
    role: has("adminRole") ? $("adminRole").value : "staff",
    home_id: has("adminHomeId") && $("adminHomeId").value ? Number($("adminHomeId").value) : null,
    is_active: adminCreateActive
  };
}

async function createAdminUser() {
  const p = adminPayloadFromForm();
  if (!p.first_name || !p.last_name || !p.email || !p.password || !p.role) return banner("Complete all user fields");
  await api("/admin/users", { method: "POST", body: JSON.stringify(p) });
  clearAdminForm();
  await loadAdminUsers();
  await loadAdminReferenceData();
  banner("User created");
}

async function loadAdminUsers() {
  const params = new URLSearchParams();
  if (has("userSearch") && $("userSearch").value.trim()) params.set("q", $("userSearch").value.trim());
  if (has("userRoleFilter") && $("userRoleFilter").value) params.set("role", $("userRoleFilter").value);
  if (has("userHomeFilter") && $("userHomeFilter").value.trim()) params.set("home_id", $("userHomeFilter").value.trim());
  if (has("userArchivedFilter") && $("userArchivedFilter").value) params.set("archived", $("userArchivedFilter").value);
  const data = await api("/admin/users" + (params.toString() ? `?${params}` : ""));
  if (!data) return;
  adminUsers = normArray(data?.users);
  renderAdminUsers();
  updateAdminSummary();
}

function renderAdminUsers() {
  if (!has("adminUsersList")) return;
  const host = $("adminUsersList");
  host.innerHTML = "";
  if (!adminUsers.length) return host.innerHTML = `<div class="entity-row"><div>No users found.</div></div>`;
  adminUsers.forEach(user => {
    const row = document.createElement("div");
    row.className = "entity-row";
    row.innerHTML = `<div><div class="entity-title">${safe([user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Unknown user")}</div><div class="entity-meta">${safe(user?.email || "")} · ${safe(user?.role || "")} · home ${safe(String(user?.home_id ?? ""))}</div><div class="entity-meta"><span class="tag ${user?.is_active ? "ok" : "bad"}">${user?.is_active ? "active" : "inactive"}</span><span class="tag ${user?.archived ? "bad" : "neutral"}">${user?.archived ? "archived" : "live"}</span></div></div><div class="entity-actions"></div>`;
    const right = row.querySelector(".entity-actions");
    const add = (label, fn) => {
      if (!right) return;
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = label;
      b.onclick = fn;
      right.appendChild(b);
    };
    add(user?.is_active ? "Deactivate" : "Activate", async () => {
      await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !user?.is_active }) });
      await loadAdminUsers();
      banner("User updated");
    });
    add(user?.archived ? "Unarchive" : "Archive", async () => {
      await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ archived: !user?.archived }) });
      await loadAdminUsers();
      banner("User updated");
    });
    add("Role", async () => {
      const newRole = prompt(`Set role for ${user?.email || "user"}`, user?.role || "staff");
      if (newRole === null) return;
      await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ role: newRole }) });
      await loadAdminUsers();
      banner("Role updated");
    });
    add("Home", async () => {
      const choices = homes.map(h => `${h?.id}: ${h?.name}`).join("\n");
      const homeId = prompt(`Set home id for ${user?.email || "user"}\n\n${choices}`, String(user?.home_id ?? ""));
      if (homeId === null) return;
      await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ home_id: homeId ? Number(homeId) : null }) });
      await loadAdminUsers();
      banner("Home updated");
    });
    add("Reset password", async () => {
      const password = prompt(`Set new password for ${user?.email || "user"}`);
      if (password === null || !password.trim()) return banner("Password cannot be empty");
      await api(`/admin/users/${user.id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) });
      banner("Password reset");
    });
    host.appendChild(row);
  });
}

async function createHome() {
  const p = {
    name: has("homeName") ? $("homeName").value.trim() : "",
    address: has("homeAddress") ? $("homeAddress").value.trim() || null : null,
    postcode: has("homePostcode") ? $("homePostcode").value.trim() || null : null,
    region: has("homeRegion") ? $("homeRegion").value.trim() || null : null,
    local_authority: has("homeLocalAuthority") ? $("homeLocalAuthority").value.trim() || null : null,
    ofsted_urn: has("homeOfstedUrn") ? $("homeOfstedUrn").value.trim() || null : null,
    provider_id: has("homeProviderId") && $("homeProviderId").value ? Number($("homeProviderId").value) : null,
    registered_manager_id: has("homeRegisteredManagerId") && $("homeRegisteredManagerId").value ? Number($("homeRegisteredManagerId").value) : null,
    geofence_radius_m: has("homeGeofence") && $("homeGeofence").value.trim() ? Number($("homeGeofence").value) : null
  };
  if (!p.name) return banner("Home name is required");
  await api("/admin/homes", { method: "POST", body: JSON.stringify(p) });
  ["homeName", "homeAddress", "homePostcode", "homeRegion", "homeLocalAuthority", "homeOfstedUrn", "homeGeofence"].forEach(id => has(id) && ($(id).value = ""));
  if (has("homeProviderId")) $("homeProviderId").value = "";
  if (has("homeRegisteredManagerId")) $("homeRegisteredManagerId").value = "";
  await loadHomes();
  await loadAdminReferenceData();
  banner("Home created");
}

async function loadHomes() {
  const data = await api("/admin/homes");
  if (!data) return;
  homes = normArray(data?.homes);
  renderHomes();
  updateAdminSummary();
}

function renderHomes() {
  if (!has("homesList")) return;
  const host = $("homesList");
  host.innerHTML = "";
  if (!homes.length) return host.innerHTML = `<div class="entity-row"><div>No homes found.</div></div>`;
  homes.forEach(home => {
    const row = document.createElement("div");
    row.className = "entity-row";
    row.innerHTML = `<div><div class="entity-title">${safe(home?.name || "Unnamed home")}</div><div class="entity-meta">${safe(home?.postcode || "")} · ${safe(home?.region || "")} · ${safe(home?.local_authority || "")}</div><div class="entity-meta">URN: ${safe(home?.ofsted_urn || "—")} · users: ${safe(String(home?.user_count ?? 0))}</div></div><div class="entity-actions"></div>`;
    const right = row.querySelector(".entity-actions");
    [["Edit", async () => {
      const name = prompt("Home name", home?.name || "");
      if (name === null) return;
      await api(`/admin/homes/${home.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      await loadHomes();
      banner("Home updated");
    }], [home?.archived ? "Unarchive" : "Archive", async () => {
      await api(`/admin/homes/${home.id}`, { method: "PATCH", body: JSON.stringify({ archived: !home?.archived }) });
      await loadHomes();
      banner("Home updated");
    }]].forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = label;
      b.onclick = fn;
      right && right.appendChild(b);
    });
    host.appendChild(row);
  });
}

async function createProvider() {
  const p = {
    name: has("providerName") ? $("providerName").value.trim() : "",
    region: has("providerRegion") ? $("providerRegion").value.trim() || null : null,
    address: has("providerAddress") ? $("providerAddress").value.trim() || null : null,
    postcode: has("providerPostcode") ? $("providerPostcode").value.trim() || null : null,
    local_authority: has("providerLA") ? $("providerLA").value.trim() || null : null,
    safeguarding_lead_name: has("providerLeadName") ? $("providerLeadName").value.trim() || null : null,
    safeguarding_lead_email: has("providerLeadEmail") ? $("providerLeadEmail").value.trim() || null : null
  };
  if (!p.name) return banner("Provider name is required");
  await api("/admin/providers", { method: "POST", body: JSON.stringify(p) });
  ["providerName", "providerRegion", "providerAddress", "providerPostcode", "providerLA", "providerLeadName", "providerLeadEmail"].forEach(id => has(id) && ($(id).value = ""));
  await loadProviders();
  await loadAdminReferenceData();
  banner("Provider created");
}

async function loadProviders() {
  const data = await api("/admin/providers");
  if (!data) return;
  providers = normArray(data?.providers);
  renderProviders();
  updateAdminSummary();
}

function renderProviders() {
  if (!has("providersList")) return;
  const host = $("providersList");
  host.innerHTML = "";
  if (!providers.length) return host.innerHTML = `<div class="entity-row"><div>No providers found.</div></div>`;
  providers.forEach(provider => {
    const row = document.createElement("div");
    row.className = "entity-row";
    row.innerHTML = `<div><div class="entity-title">${safe(provider?.name || "Unnamed provider")}</div><div class="entity-meta">${safe(provider?.region || "")} · homes: ${safe(String(provider?.home_count ?? 0))}</div><div class="entity-meta">${safe(provider?.safeguarding_lead_name || "No safeguarding lead")}${provider?.safeguarding_lead_email ? " · " + safe(provider.safeguarding_lead_email) : ""}</div></div><div class="entity-actions"></div>`;
    const right = row.querySelector(".entity-actions");
    [["Edit", async () => {
      const name = prompt("Provider name", provider?.name || "");
      if (name === null) return;
      await api(`/admin/providers/${provider.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      await loadProviders();
      banner("Provider updated");
    }], [provider?.archived ? "Unarchive" : "Archive", async () => {
      await api(`/admin/providers/${provider.id}`, { method: "PATCH", body: JSON.stringify({ archived: !provider?.archived }) });
      await loadProviders();
      banner("Provider updated");
    }]].forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = label;
      b.onclick = fn;
      right && right.appendChild(b);
    });
    host.appendChild(row);
  });
}

async function createDocumentRecord() {
  const p = {
    title: has("docTitle") ? $("docTitle").value.trim() || null : null,
    document_type: has("docType") ? $("docType").value || "policy" : "policy",
    home_id: has("docHomeId") && $("docHomeId").value ? Number($("docHomeId").value) : null,
    owner_id: has("docOwnerId") && $("docOwnerId").value ? Number($("docOwnerId").value) : null,
    issue_date: has("docIssueDate") ? $("docIssueDate").value || null : null,
    review_date: has("docReviewDate") ? $("docReviewDate").value || null : null,
    expiry_date: has("docExpiryDate") ? $("docExpiryDate").value || null : null,
    approval_status: has("docApprovalStatus") ? $("docApprovalStatus").value || "not_required" : "not_required",
    confidentiality_level: has("docConfLevel") ? $("docConfLevel").value || "standard" : "standard",
    input_text: has("docInputText") ? $("docInputText").value.trim() || null : null
  };
  await api("/admin/documents", { method: "POST", body: JSON.stringify(p) });
  ["docTitle", "docIssueDate", "docReviewDate", "docExpiryDate", "docInputText"].forEach(id => has(id) && ($(id).value = ""));
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
  if (has("docSearch") && $("docSearch").value.trim()) params.set("q", $("docSearch").value.trim());
  if (has("docHomeFilter") && $("docHomeFilter").value.trim()) params.set("home_id", $("docHomeFilter").value.trim());
  if (has("docTypeFilter") && $("docTypeFilter").value.trim()) params.set("document_type", $("docTypeFilter").value.trim());
  if (has("docApprovalFilter") && $("docApprovalFilter").value.trim()) params.set("approval_status", $("docApprovalFilter").value.trim());
  const data = await api("/admin/documents" + (params.toString() ? `?${params}` : ""));
  if (!data) return;
  docs = normArray(data?.documents);
  renderDocuments();
  updateAdminSummary();
}

function renderDocuments() {
  if (!has("docsList")) return;
  const host = $("docsList");
  host.innerHTML = "";
  if (!docs.length) return host.innerHTML = `<div class="entity-row"><div>No documents found.</div></div>`;
  docs.forEach(doc => {
    const row = document.createElement("div");
    row.className = "entity-row";
    row.innerHTML = `<div><div class="entity-title">${safe(doc?.title || "Untitled document")}</div><div class="entity-meta">${safe(doc?.document_type || "—")} · ${safe(doc?.home_name || ("home " + (doc?.home_id ?? "—")))}</div><div class="entity-meta">approval: ${safe(doc?.approval_status || "not_required")} · review: ${safe(doc?.review_date || "—")} · expiry: ${safe(doc?.expiry_date || "—")}</div></div><div class="entity-actions"></div>`;
    const right = row.querySelector(".entity-actions");
    [["Set approved", async () => {
      await api(`/admin/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify({ approval_status: "approved" }) });
      await loadDocuments();
      banner("Document updated");
    }], ["Edit title", async () => {
      const title = prompt("Document title", doc?.title || "");
      if (title === null) return;
      await api(`/admin/documents/${doc.id}`, { method: "PATCH", body: JSON.stringify({ title }) });
      await loadDocuments();
      banner("Document updated");
    }]].forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = label;
      b.onclick = fn;
      right && right.appendChild(b);
    });
    host.appendChild(row);
  });
}

async function loadBilling() {
  try {
    billing = await api("/admin/billing/overview");
  } catch {
    billing = null;
  }
  renderBilling();
}

function renderBilling() {
  if (has("billingStats")) $("billingStats").innerHTML = "";
  if (has("billingList")) $("billingList").innerHTML = "";
  if (!billing) return;
  const totals = normObj(billing.totals);
  [
    ["Total users", totals.total_users ?? 0],
    ["Active users", totals.active_users ?? 0],
    ["Archived users", totals.archived_users ?? 0],
    ["Active subscriptions", totals.active_subscriptions ?? 0],
    ["Inactive subscriptions", totals.inactive_subscriptions ?? 0]
  ].forEach(([l, n]) => {
    if (has("billingStats")) $("billingStats").insertAdjacentHTML("beforeend", `<div class="stat"><div class="n">${safe(String(n))}</div><div class="l">${safe(l)}</div></div>`);
  });
  const users = normArray(billing.users);
  if (!users.length) {
    if (has("billingList")) $("billingList").innerHTML = `<div class="entity-row"><div>No billing rows found.</div></div>`;
    return;
  }
  users.forEach(user => {
    if (has("billingList")) {
      $("billingList").insertAdjacentHTML("beforeend",
        `<div class="entity-row"><div><div class="entity-title">${safe([user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Unknown user")}</div><div class="entity-meta">${safe(user?.email || "")} · ${safe(user?.plan_name || "No plan")}</div><div class="entity-meta">status: ${safe(user?.subscription_status || "inactive")} · period end: ${safe(user?.current_period_end || "—")}</div></div></div>`
      );
    }
  });
}

async function loadAudit() {
  try {
    const data = await api("/admin/audit");
    audit = normArray(data?.audit);
  } catch {
    audit = [];
  }
  renderAudit();
}

function renderAudit() {
  if (!has("auditList")) return;
  const host = $("auditList");
  host.innerHTML = "";
  if (!audit.length) return host.innerHTML = `<div class="entity-row"><div>No audit entries found.</div></div>`;
  audit.forEach(a => {
    host.insertAdjacentHTML("beforeend",
      `<div class="entity-row"><div><div class="entity-title">${safe(a?.action || "")} · ${safe(a?.target_type || "")} ${safe(String(a?.target_id ?? ""))}</div><div class="entity-meta">${safe([a?.first_name, a?.last_name].filter(Boolean).join(" ") || a?.email || "Unknown admin")} · ${safe(a?.created_at || "")}</div><div class="entity-meta">${safe(JSON.stringify(a?.details || {}))}</div></div></div>`
    );
  });
}

async function loadLibrary() {
  const params = new URLSearchParams();
  if (has("librarySearch") && $("librarySearch").value.trim()) params.set("q", $("librarySearch").value.trim());
  if (has("libraryTypeFilter") && $("libraryTypeFilter").value) params.set("document_type", $("libraryTypeFilter").value);
  if (has("libraryApprovalFilter") && $("libraryApprovalFilter").value) params.set("approval_status", $("libraryApprovalFilter").value);

  const data = await api("/documents/library" + (params.toString() ? `?${params}` : ""));
  if (!data) return;
  libraryDocs = normArray(data?.documents);
  renderLibraryList();
  renderManagerLibraryList();

  if (selectedLibraryDoc?.id) {
    const fresh = libraryDocs.find(d => Number(d?.id) === Number(selectedLibraryDoc.id));
    if (fresh) openLibraryDocument(fresh.id);
  }
}

function renderLibraryList() {
  if (!has("libraryList")) return;
  const host = $("libraryList");
  host.innerHTML = "";
  if (!libraryDocs.length) return host.innerHTML = `<div class="entity-row"><div>No documents available for your home.</div></div>`;
  libraryDocs.forEach(doc => {
    const row = document.createElement("div");
    row.className = "entity-row";
    row.innerHTML = `<div><div class="entity-title">${safe(doc?.title || "Untitled document")}</div><div class="entity-meta">${safe(doc?.document_type || "—")} · ${safe(doc?.home_name || "Your home")}</div><div class="entity-meta"><span class="tag ${doc?.approval_status === "approved" ? "ok" : doc?.approval_status === "pending" ? "warn" : "neutral"}">${safe(doc?.approval_status || "not_required")}</span><span class="tag neutral">${safe(doc?.confidentiality_level || "standard")}</span></div></div><div class="entity-actions"></div>`;
    const right = row.querySelector(".entity-actions");
    [["Open", () => openLibraryDocument(doc.id)], ...(canManageLibrary() ? [["Edit", () => populateLibraryEditor(doc)]] : [])].forEach(([label, fn]) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = label;
      b.onclick = fn;
      right && right.appendChild(b);
    });
    host.appendChild(row);
  });
}

function renderManagerLibraryList() {
  if (!has("managerLibraryList")) return;
  const host = $("managerLibraryList");
  host.innerHTML = "";
  if (!canManageLibrary()) return host.innerHTML = `<div class="entity-row"><div>Read-only access.</div></div>`;
  if (!libraryDocs.length) return host.innerHTML = `<div class="entity-row"><div>No home documents found.</div></div>`;
  libraryDocs.forEach(doc => {
    host.insertAdjacentHTML("beforeend",
      `<div class="entity-row"><div><div class="entity-title">${safe(doc?.title || "Untitled document")}</div><div class="entity-meta">${safe(doc?.document_type || "—")} · review ${safe(doc?.review_date || "—")}</div></div><div class="entity-actions"><button class="chip" data-doc-edit="${safe(String(doc?.id ?? ""))}">Edit</button></div></div>`
    );
  });
  host.querySelectorAll("[data-doc-edit]").forEach(b => {
    b.onclick = () => populateLibraryEditor(libraryDocs.find(d => Number(d?.id) === Number(b.dataset.docEdit)));
  });
}

async function openLibraryDocument(id) {
  if (!id || !has("libraryViewer")) return;
  const data = await api(`/documents/library/${id}`);
  const doc = data?.document;
  if (!doc) return;
  selectedLibraryDoc = doc;
  $("libraryViewer").innerHTML =
    `<h3>${safe(doc?.title || "Untitled document")}</h3>
     <p><strong>Type:</strong> ${safe(doc?.document_type || "—")}</p>
     <p><strong>Approval:</strong> ${safe(doc?.approval_status || "not_required")} · <strong>Confidentiality:</strong> ${safe(doc?.confidentiality_level || "standard")}</p>
     <p><strong>Issue date:</strong> ${safe(doc?.issue_date || "—")} · <strong>Review date:</strong> ${safe(doc?.review_date || "—")} · <strong>Expiry date:</strong> ${safe(doc?.expiry_date || "—")}</p>
     <hr style="border:none;border-top:1px solid var(--line);margin:14px 0;">
     <div>${render(doc?.input_text || doc?.generated_text || "No content available.", "assistant")}</div>`;
}

function resetLibraryEditor() {
  editingLibraryDocId = null;
  if (has("libraryFormTitle")) $("libraryFormTitle").textContent = "Create document";
  ["libraryDocTitle", "libraryIssueDate", "libraryReviewDate", "libraryExpiryDate", "libraryInputText"].forEach(id => has(id) && ($(id).value = ""));
  if (has("libraryDocType")) $("libraryDocType").value = "policy";
  if (has("libraryApprovalStatus")) $("libraryApprovalStatus").value = "not_required";
  if (has("libraryConfidentiality")) $("libraryConfidentiality").value = "standard";
  if (has("libraryOwnerId")) $("libraryOwnerId").value = "";
  if (has("deleteLibraryDocBtn")) $("deleteLibraryDocBtn").classList.add("hidden");
}

function populateLibraryEditor(doc) {
  if (!canManageLibrary() || !doc) return;
  editingLibraryDocId = doc.id;
  if (has("libraryFormTitle")) $("libraryFormTitle").textContent = "Edit document";
  if (has("libraryDocTitle")) $("libraryDocTitle").value = doc?.title || "";
  if (has("libraryDocType")) $("libraryDocType").value = doc?.document_type || "policy";
  if (has("libraryIssueDate")) $("libraryIssueDate").value = doc?.issue_date || "";
  if (has("libraryReviewDate")) $("libraryReviewDate").value = doc?.review_date || "";
  if (has("libraryExpiryDate")) $("libraryExpiryDate").value = doc?.expiry_date || "";
  if (has("libraryApprovalStatus")) $("libraryApprovalStatus").value = doc?.approval_status || "not_required";
  if (has("libraryConfidentiality")) $("libraryConfidentiality").value = doc?.confidentiality_level || "standard";
  if (has("libraryOwnerId")) $("libraryOwnerId").value = doc?.owner_id || "";
  if (has("libraryInputText")) $("libraryInputText").value = doc?.input_text || doc?.generated_text || "";
  if (has("deleteLibraryDocBtn")) $("deleteLibraryDocBtn").classList.remove("hidden");
  setLibraryTab("editor");
}

async function saveLibraryDocument() {
  if (!canManageLibrary()) return banner("Manager or admin access required");
  const p = {
    title: has("libraryDocTitle") ? $("libraryDocTitle").value.trim() : "",
    document_type: has("libraryDocType") ? $("libraryDocType").value : "policy",
    issue_date: has("libraryIssueDate") ? $("libraryIssueDate").value || null : null,
    review_date: has("libraryReviewDate") ? $("libraryReviewDate").value || null : null,
    expiry_date: has("libraryExpiryDate") ? $("libraryExpiryDate").value || null : null,
    approval_status: has("libraryApprovalStatus") ? $("libraryApprovalStatus").value : "not_required",
    confidentiality_level: has("libraryConfidentiality") ? $("libraryConfidentiality").value : "standard",
    owner_id: has("libraryOwnerId") && $("libraryOwnerId").value ? Number($("libraryOwnerId").value) : null,
    input_text: has("libraryInputText") ? $("libraryInputText").value.trim() || null : null
  };
  if (!p.title) return banner("Title is required");

  if (editingLibraryDocId) {
    await api(`/documents/library/${editingLibraryDocId}`, { method: "PATCH", body: JSON.stringify(p) });
    banner("Document updated");
  } else {
    await api("/documents/library", { method: "POST", body: JSON.stringify(p) });
    banner("Document created");
  }

  resetLibraryEditor();
  await loadLibrary();
  setLibraryTab("list");
}

async function deleteLibraryDocument() {
  if (!editingLibraryDocId || !confirm("Delete this document?")) return;
  await api(`/documents/library/${editingLibraryDocId}`, { method: "DELETE" });
  banner("Document deleted");
  resetLibraryEditor();
  if (has("libraryViewer")) $("libraryViewer").innerHTML = `<h3>Select a document</h3><p>Open a policy or document from the list to read it here.</p>`;
  await loadLibrary();
  setLibraryTab("list");
}

async function createManagerStaff() {
  const payload = {
    first_name: has("mgrFirst") ? $("mgrFirst").value.trim() : "",
    last_name: has("mgrLast") ? $("mgrLast").value.trim() : "",
    email: has("mgrEmail") ? $("mgrEmail").value.trim() : "",
    password: has("mgrPass") ? $("mgrPass").value : "",
    role: has("mgrRole") ? $("mgrRole").value : "staff"
  };
  if (!payload.first_name || !payload.last_name || !payload.email || !payload.password) return banner("Complete all staff fields");
  await api("/manager/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  ["mgrFirst", "mgrLast", "mgrEmail", "mgrPass"].forEach(id => has(id) && ($(id).value = ""));
  if (has("mgrRole")) $("mgrRole").value = "staff";
  await loadManager();
  banner("Staff created");
}

async function saveManagerDoc() {
  const payload = {
    title: has("mgrDocTitle") ? $("mgrDocTitle").value.trim() : "",
    input_text: has("mgrDocText") ? $("mgrDocText").value.trim() : ""
  };
  if (!payload.title) return banner("Title is required");
  await api("/manager/documents", {
    method: "POST",
    body: JSON.stringify(payload)
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
    managerUsers = normArray(data?.users);
    managerDocuments = normArray(data?.documents);
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
  if (!managerUsers.length) return host.innerHTML = `<div class="entity-row"><div>No staff found.</div></div>`;
  managerUsers.forEach(u => {
    host.insertAdjacentHTML("beforeend",
      `<div class="entity-row">
        <div>
          <div class="entity-title">${safe(`${u?.first_name || ""} ${u?.last_name || ""}`.trim() || u?.email || "Unnamed user")}</div>
          <div class="entity-meta">${safe(u?.email || "")}</div>
          <div class="entity-meta"><span class="tag ${String(u?.role || "").toLowerCase() === "manager" ? "warn" : "neutral"}">${safe(u?.role || "staff")}</span></div>
        </div>
      </div>`
    );
  });
}

function renderManagerDocuments() {
  if (!has("mgrDocs")) return;
  const host = $("mgrDocs");
  host.innerHTML = "";
  if (!managerDocuments.length) return host.innerHTML = `<div class="entity-row"><div>No home documents found.</div></div>`;
  managerDocuments.forEach(d => {
    host.insertAdjacentHTML("beforeend",
      `<div class="entity-row">
        <div>
          <div class="entity-title">${safe(d?.title || "Untitled document")}</div>
          <div class="entity-meta">${safe(d?.document_type || "home_document")}</div>
        </div>
      </div>`
    );
  });
}

function updateManagerSummary() {
  if (has("mgrStatUsers")) $("mgrStatUsers").textContent = String(managerUsers.length || 0);
  if (has("mgrStatDocs")) $("mgrStatDocs").textContent = String(managerDocuments.length || 0);
  if (has("mgrStatManagers")) $("mgrStatManagers").textContent = String(managerUsers.filter(u => String(u?.role || "").toLowerCase() === "manager").length || 0);
  if (has("mgrStatStaffOnly")) $("mgrStatStaffOnly").textContent = String(managerUsers.filter(u => String(u?.role || "").toLowerCase() === "staff").length || 0);
}

function restorePrefs() {
  document.body.classList.toggle("theme-dark", (localStorage.getItem("indicare_theme") || "light") === "dark");
  if (has("lang")) $("lang").value = localStorage.getItem("indicare_reply_language") || DEFAULT_LANGUAGE;
  if (has("mode")) $("mode").value = localStorage.getItem("indicare_response_mode") || "balanced";
  loadVoicePref();
  loadCopilotPref();
  loadContextState();
  syncHelpers();
  setLibraryTab("list");
  setManagerTab("staff");
}

function on(id, event, fn) {
  if (!has(id)) return;
  $(id).addEventListener(event, fn);
}

function bindLegalControls() {
  document.querySelectorAll("[data-legal-tab]").forEach(btn => {
    btn.addEventListener("click", () => setLegalTab(btn.dataset.legalTab));
  });

  on("openLegalFromSettings", "click", () => openLegalModal("terms"));
  on("openLegalHeaderBtn", "click", () => openLegalModal("terms"));
  on("footerTermsBtn", "click", () => openLegalModal("terms"));
  on("footerPrivacyBtn", "click", () => openLegalModal("privacy"));
  on("footerIPBtn", "click", () => openLegalModal("ip"));
  on("closeLegalModal", "click", closeLegalModal);

  on("legalOverlay", "click", () => {
    const forced = has("legalModal") && $("legalModal").dataset.force === "true";
    if (!forced || legalAcceptanceValid()) closeLegalModal();
  });

  on("acceptLegalBtn", "click", acceptLegalTerms);
  on("declineLegalBtn", "click", declineLegalTerms);

  document.addEventListener("keydown", e => {
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
      $("overlay").classList.toggle("show", has("sidebar") && $("sidebar").classList.contains("open"));
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
    localStorage.setItem("indicare_theme", document.body.classList.contains("theme-dark") ? "dark" : "light");
    syncHelpers();
  });

  on("privacy", "click", () => {
    if (has("app")) $("app").classList.toggle("privacy-active");
    syncHelpers();
  });

  on("voiceReplies", "click", () => {
    setVoicePref(!speechEnabled);
  });

  on("stopVoiceBtn", "click", stopSpeaking);

  on("voiceSelect", "change", () => {
    const selected = has("voiceSelect") ? $("voiceSelect").value : "";
    saveVoiceName(selected);
    indicareVoice = null;
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

  document.querySelectorAll(".tabbtn[data-tab]").forEach(btn => btn.addEventListener("click", async () => {
    setAdminTab(btn.dataset.tab);
    await loadActiveAdminTab();
  }));

  document.querySelectorAll(".tabbtn[data-library-tab]").forEach(btn => btn.addEventListener("click", () => setLibraryTab(btn.dataset.libraryTab)));
  document.querySelectorAll(".tabbtn[data-manager-tab]").forEach(btn => btn.addEventListener("click", () => setManagerTab(btn.dataset.managerTab)));

  on("search", "input", filterConversations);

  if (has("input")) {
    $("input").addEventListener("keydown", e => {
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
    $("upload").addEventListener("change", async e => {
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
      if (conversationId) await api(`/chat/conversations/${conversationId}/document`, { method: "DELETE" });
    } catch {}
    currentDocumentText = null;
    currentDocumentName = null;
    docHide();
    banner(indiCareCopy("documentRemoved"));
  });

  on("adminActiveToggle", "click", () => {
    adminCreateActive = !adminCreateActive;
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

async function init() {
  bind();
  restorePrefs();
  initSpeech();
  resize();

  try {
    await loadMe();
  } catch (e) {
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

  showAssistantView();
  enforceLegalGate();
}

document.addEventListener("DOMContentLoaded", init);
