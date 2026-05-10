/* IndiCare Assistant Device Permissions
   Permission layer for the standalone IndiCare AI tools platform.
   Requests mic/camera access clearly on the assistant page and shares status with voice/camera tools.
*/
(function () {
  const PERMISSION_KEY = "indicare_device_permissions_choice";
  const STATUS_KEY = "indicare_device_permissions_status";
  const $ = (id) => document.getElementById(id);

  const state = {
    mic: "unknown",
    camera: "unknown",
    stream: null,
    checked: false,
  };

  function loadCss() {
    if (document.querySelector('link[data-indicare-permissions-css="true"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/indicare-device-permissions.css";
    link.dataset.indicarePermissionsCss = "true";
    document.head.appendChild(link);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function supportsMediaDevices() {
    return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  function saveStatus() {
    const payload = {
      mic: state.mic,
      camera: state.camera,
      checked: state.checked,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(STATUS_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("indicare:device-permissions", { detail: payload }));
  }

  function setStatus(mic, camera) {
    state.mic = mic || state.mic;
    state.camera = camera || state.camera;
    state.checked = true;
    saveStatus();
    renderStatus();
  }

  function installUi() {
    if ($("indicarePermissionsPanel")) return;
    const node = document.createElement("section");
    node.id = "indicarePermissionsPanel";
    node.className = "ic-permissions-panel hidden";
    node.innerHTML = `
      <div class="ic-permissions-card" role="dialog" aria-label="IndiCare AI device permissions">
        <div class="ic-permissions-head">
          <div>
            <strong>Set up IndiCare AI voice and camera</strong>
            <span>Allow access so “Hey IndiCare”, I-Notes, transcription and future camera tools can work smoothly.</span>
          </div>
          <button id="permissionsClose" type="button" aria-label="Close permissions setup">×</button>
        </div>
        <div class="ic-permissions-body">
          <div class="ic-permission-row">
            <div><strong>Microphone</strong><span id="micPermissionText">Checking...</span></div>
            <span id="micPermissionBadge" class="ic-permission-badge unknown">Unknown</span>
          </div>
          <div class="ic-permission-row">
            <div><strong>Camera</strong><span id="cameraPermissionText">Checking...</span></div>
            <span id="cameraPermissionBadge" class="ic-permission-badge unknown">Unknown</span>
          </div>
          <p class="ic-permissions-note">Your browser controls permission. IndiCare only asks when you choose to enable these tools.</p>
          <video id="permissionsPreview" class="ic-permissions-preview hidden" muted playsinline></video>
        </div>
        <div class="ic-permissions-actions">
          <button id="requestMicOnly" type="button">Allow microphone</button>
          <button id="requestMicCamera" type="button" class="primary">Allow mic and camera</button>
          <button id="skipPermissions" type="button">Not now</button>
        </div>
      </div>
    `;
    document.body.appendChild(node);
  }

  function statusLabel(value) {
    if (value === "granted") return "Allowed";
    if (value === "denied") return "Blocked";
    if (value === "prompt") return "Needs permission";
    if (value === "unsupported") return "Not supported";
    return "Unknown";
  }

  function statusText(kind, value) {
    if (value === "granted") return kind === "mic" ? "Voice and I-Notes can use your microphone." : "Camera tools can use your camera when needed.";
    if (value === "denied") return "Blocked in the browser. You may need to change site settings.";
    if (value === "prompt") return "Permission has not been granted yet.";
    if (value === "unsupported") return "This browser does not support this device access.";
    return "Permission status has not been checked yet.";
  }

  function updateBadge(id, value) {
    const badge = $(id);
    if (!badge) return;
    badge.className = `ic-permission-badge ${escapeHtml(value)}`;
    badge.textContent = statusLabel(value);
  }

  function renderStatus() {
    if ($("micPermissionText")) $("micPermissionText").textContent = statusText("mic", state.mic);
    if ($("cameraPermissionText")) $("cameraPermissionText").textContent = statusText("camera", state.camera);
    updateBadge("micPermissionBadge", state.mic);
    updateBadge("cameraPermissionBadge", state.camera);

    const voiceButton = $("openVoiceCompanion");
    if (voiceButton) {
      voiceButton.dataset.micPermission = state.mic;
      if (state.mic !== "granted") voiceButton.title = "Allow microphone access to use Hey IndiCare";
    }
  }

  async function queryPermission(name) {
    if (!navigator.permissions || !navigator.permissions.query) return "unknown";
    try {
      const result = await navigator.permissions.query({ name });
      result.onchange = () => {
        if (name === "microphone") state.mic = result.state;
        if (name === "camera") state.camera = result.state;
        saveStatus();
        renderStatus();
      };
      return result.state;
    } catch (_) {
      return "unknown";
    }
  }

  async function checkPermissions() {
    if (!supportsMediaDevices()) {
      setStatus("unsupported", "unsupported");
      return;
    }
    const mic = await queryPermission("microphone");
    const camera = await queryPermission("camera");
    setStatus(mic, camera);
  }

  async function requestDevices({ audio, video }) {
    if (!supportsMediaDevices()) {
      setStatus("unsupported", "unsupported");
      return;
    }
    try {
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
        state.stream = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: !!audio, video: !!video });
      state.stream = stream;
      const hasAudio = stream.getAudioTracks().length > 0;
      const hasVideo = stream.getVideoTracks().length > 0;
      setStatus(hasAudio ? "granted" : state.mic, video ? (hasVideo ? "granted" : "denied") : state.camera);
      localStorage.setItem(PERMISSION_KEY, video ? "mic_camera" : "mic");
      const preview = $("permissionsPreview");
      if (preview && hasVideo) {
        preview.srcObject = stream;
        preview.classList.remove("hidden");
        preview.play().catch(() => null);
      }
      window.dispatchEvent(new CustomEvent("indicare:media-stream", { detail: { stream, audio: hasAudio, video: hasVideo } }));
    } catch (error) {
      const denied = error && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
      if (audio) state.mic = denied ? "denied" : "unknown";
      if (video) state.camera = denied ? "denied" : "unknown";
      state.checked = true;
      saveStatus();
      renderStatus();
    }
  }

  function openPanel(force) {
    const panel = $("indicarePermissionsPanel");
    if (!panel) return;
    const choice = localStorage.getItem(PERMISSION_KEY);
    if (!force && choice === "skipped") return;
    panel.classList.remove("hidden");
  }

  function closePanel() {
    $("indicarePermissionsPanel")?.classList.add("hidden");
  }

  function shouldPromptOnAssistantLanding() {
    const path = window.location.pathname || "";
    if (!/assistant/i.test(path)) return false;
    const choice = localStorage.getItem(PERMISSION_KEY);
    if (choice && choice !== "skipped") return false;
    if (choice === "skipped") return false;
    return true;
  }

  function bind() {
    $("permissionsClose")?.addEventListener("click", closePanel);
    $("skipPermissions")?.addEventListener("click", () => {
      localStorage.setItem(PERMISSION_KEY, "skipped");
      closePanel();
    });
    $("requestMicOnly")?.addEventListener("click", () => requestDevices({ audio: true, video: false }));
    $("requestMicCamera")?.addEventListener("click", () => requestDevices({ audio: true, video: true }));

    document.addEventListener("click", (event) => {
      if (event.target.closest("#openVoiceCompanion") && state.mic !== "granted") {
        openPanel(true);
      }
    }, true);

    window.addEventListener("indicare:request-device-permissions", (event) => {
      openPanel(true);
      if (event.detail && event.detail.request) requestDevices(event.detail.request);
    });
  }

  window.IndiCareDevicePermissions = {
    open: () => openPanel(true),
    request: requestDevices,
    status: () => ({ mic: state.mic, camera: state.camera, checked: state.checked }),
  };

  window.addEventListener("DOMContentLoaded", async () => {
    loadCss();
    installUi();
    bind();
    await checkPermissions();
    if (shouldPromptOnAssistantLanding()) {
      window.setTimeout(() => openPanel(false), 900);
    }
  });
})();
