import { apiSend } from "../young-people-shell/core/api.js";
import { getOsContext, getOperationalSession, scopeContextToSession, childKey, childName, escapeHtml } from "./indicare-os-context.js";

const QUICK_TYPES = [
  { id: "incident", label: "Incident", workspace: "incident", prompt: "What happened? Include who, where, when, staff response and immediate safety actions." },
  { id: "safeguarding", label: "Safeguarding", workspace: "safeguarding", prompt: "What is the concern, immediate safety action, who has been informed, and what happens next?" },
  { id: "handover", label: "Handover", workspace: "handover_item", prompt: "What does the next shift need to know? Include risk, action and manager oversight." },
  { id: "welfare", label: "Welfare check", workspace: "health", prompt: "Record presentation, wellbeing, voice of the child and any action needed." },
  { id: "medication", label: "Medication note", workspace: "health", prompt: "Record medication context, consent/refusal, presentation, side effects and action needed." },
  { id: "daily", label: "Daily note", workspace: "daily", prompt: "Capture the key daily update, child voice, positives, wellbeing and actions required." },
];

const QUICK_STATE = {
  open: false,
  type: QUICK_TYPES[0],
  recording: false,
  recognition: null,
};

bootQuickCapture();

function bootQuickCapture() {
  ensureLauncher();
  ensurePanel();
  document.addEventListener("click", handleClicks, true);
  document.addEventListener("submit", handleSubmit, true);
  window.addEventListener("indicare:os-context-ready", renderPanel);
  new MutationObserver(() => ensureLauncher()).observe(document.body, { childList: true, subtree: true });
}

function ensureLauncher() {
  if (document.getElementById("ic-mobile-quick-capture")) return;
  const button = document.createElement("button");
  button.id = "ic-mobile-quick-capture";
  button.type = "button";
  button.className = "os-mobile-capture-button";
  button.dataset.openQuickCapture = "true";
  button.innerHTML = `<span>＋</span><strong>Quick capture</strong>`;
  document.body.appendChild(button);
}

function ensurePanel() {
  if (document.getElementById("ic-quick-capture-panel")) return;
  const panel = document.createElement("aside");
  panel.id = "ic-quick-capture-panel";
  panel.className = "os-quick-capture-panel";
  panel.setAttribute("aria-label", "Quick operational capture");
  document.body.appendChild(panel);
  renderPanel();
}

function renderPanel() {
  ensurePanel();
  const panel = document.getElementById("ic-quick-capture-panel");
  if (!panel) return;
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const children = context.children || [];
  panel.classList.toggle("open", QUICK_STATE.open);
  panel.innerHTML = `
    <header>
      <div><span>Mobile operations</span><strong>Quick capture</strong><small>${escapeHtml(getOperationalSession()?.homeName || "No home selected")}</small></div>
      <button type="button" data-close-quick-capture>×</button>
    </header>
    <section class="os-quick-types">
      ${QUICK_TYPES.map((type) => `<button type="button" class="${QUICK_STATE.type.id === type.id ? "active" : ""}" data-quick-type="${escapeHtml(type.id)}"><strong>${escapeHtml(type.label)}</strong><span>${escapeHtml(type.workspace)}</span></button>`).join("")}
    </section>
    <form class="os-quick-form" data-quick-capture-form>
      <label><span>Young person</span><select name="young_person_id">${children.length ? children.map((child) => `<option value="${escapeHtml(childKey(child))}">${escapeHtml(childName(child))}</option>`).join("") : `<option value="">No young people in session</option>`}</select></label>
      <label><span>${escapeHtml(QUICK_STATE.type.label)} note</span><textarea name="note" placeholder="${escapeHtml(QUICK_STATE.type.prompt)}"></textarea></label>
      <div class="os-quick-capture-tools">
        <button type="button" data-start-dictation>${QUICK_STATE.recording ? "Stop dictation" : "Voice note"}</button>
        <button type="button" data-ai-cleanup>AI cleanup</button>
        <button type="submit" class="primary">Save</button>
      </div>
      <p class="os-quick-hint">Saves through workspace-records where the backend table exists, then refreshes OS context and routes into IndiCare Docs.</p>
    </form>`;
}

function handleClicks(event) {
  if (event.target.closest?.("[data-open-quick-capture]")) {
    event.preventDefault();
    QUICK_STATE.open = true;
    renderPanel();
    return;
  }
  if (event.target.closest?.("[data-close-quick-capture]")) {
    event.preventDefault();
    QUICK_STATE.open = false;
    renderPanel();
    return;
  }
  const typeButton = event.target.closest?.("[data-quick-type]");
  if (typeButton) {
    event.preventDefault();
    QUICK_STATE.type = QUICK_TYPES.find((type) => type.id === typeButton.dataset.quickType) || QUICK_TYPES[0];
    renderPanel();
    return;
  }
  if (event.target.closest?.("[data-start-dictation]")) {
    event.preventDefault();
    toggleDictation();
    return;
  }
  if (event.target.closest?.("[data-ai-cleanup]")) {
    event.preventDefault();
    openAssistantForCleanup();
  }
}

async function handleSubmit(event) {
  const form = event.target.closest?.("[data-quick-capture-form]");
  if (!form) return;
  event.preventDefault();
  const note = form.note.value.trim();
  const youngPersonId = form.young_person_id.value;
  if (!note || !youngPersonId) return;
  const context = scopeContextToSession(getOsContext(), getOperationalSession());
  const child = context.children.find((item) => childKey(item) === youngPersonId);
  const payload = buildPayload(note, child);
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Saving...";
  try {
    const response = await apiSend(`/workspace-records/${encodeURIComponent(QUICK_STATE.type.workspace)}`, "POST", payload, { invalidatePrefixes: ["/workspace-records", "/api/os/context"] });
    if (response?.ok === false) throw new Error(response.error || response.detail || "Quick capture failed");
    window.dispatchEvent(new CustomEvent("indicare:refresh-live-os"));
    QUICK_STATE.open = false;
    renderPanel();
    window.dispatchEvent(new CustomEvent("indicare:open-record", { detail: { ...payload, id: response.id, record_type: QUICK_STATE.type.workspace, type: QUICK_STATE.type.workspace } }));
  } catch (error) {
    alert(error?.message || "Unable to save quick capture.");
  } finally {
    submit.disabled = false;
    submit.textContent = "Save";
  }
}

function buildPayload(note, child) {
  const session = getOperationalSession();
  const title = `${QUICK_STATE.type.label} · ${child ? childName(child) : "Young person"}`;
  return {
    title,
    summary: note,
    summary_text: note,
    description: note,
    notes: note,
    content: {
      quick_capture: true,
      capture_type: QUICK_STATE.type.id,
      note,
      captured_from: "mobile_quick_capture",
    },
    status: "draft",
    workflow_status: "draft",
    manager_review_status: "draft",
    young_person_id: child ? childKey(child) : "",
    child_name: child ? childName(child) : "",
    home_id: session?.homeId || "",
    home_name: session?.homeName || "",
    child_voice: /said|told|asked|felt|wants|wishes/i.test(note) ? note : "",
    young_person_voice: /said|told|asked|felt|wants|wishes/i.test(note) ? note : "",
    actions_required: extractAction(note),
    safeguarding_flag: /safeguarding|risk|missing|police|social worker|injury|harm|exploitation/i.test(note),
  };
}

function extractAction(note) {
  const match = note.match(/(?:next|action|follow up|manager|inform|call|review)[^.!?]*(?:[.!?]|$)/i);
  return match ? match[0] : "Review quick capture and complete full record if required.";
}

function toggleDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice dictation is not available in this browser yet.");
    return;
  }
  if (QUICK_STATE.recording && QUICK_STATE.recognition) {
    QUICK_STATE.recognition.stop();
    QUICK_STATE.recording = false;
    renderPanel();
    return;
  }
  const textarea = document.querySelector('#ic-quick-capture-panel textarea[name="note"]');
  const recognition = new SpeechRecognition();
  recognition.lang = "en-GB";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    const text = [...event.results].map((result) => result[0].transcript).join(" ");
    if (textarea) textarea.value = text;
  };
  recognition.onend = () => {
    QUICK_STATE.recording = false;
    renderPanel();
  };
  QUICK_STATE.recognition = recognition;
  QUICK_STATE.recording = true;
  recognition.start();
  renderPanel();
}

function openAssistantForCleanup() {
  const textarea = document.querySelector('#ic-quick-capture-panel textarea[name="note"]');
  const note = textarea?.value?.trim();
  if (!note) return;
  document.querySelector(".sp-ai-bubble")?.click();
  setTimeout(() => {
    const input = document.getElementById("ic-assistant-input");
    if (!input) return;
    input.value = `Turn this quick ${QUICK_STATE.type.label} note into a calm, factual residential children's home record. Do not invent facts. Keep child voice separate if present. Note: ${note}`;
    document.getElementById("ic-send-assistant")?.click();
  }, 160);
}

window.IndiCareQuickCapture = {
  open: () => { QUICK_STATE.open = true; renderPanel(); },
  close: () => { QUICK_STATE.open = false; renderPanel(); },
};
