// IndiCare Admin – Single-file Admin Console
// ------------------------------------------
// 1) Save this as script.js in your backend repo
// 2) Serve it at: https://childrens-homes-assistant-backend-new.onrender.com/script.js
// 3) In Squarespace footer, keep ONLY:
//
//    <div id="indicare-admin-root"></div>
//    <script src="https://childrens-homes-assistant-backend-new.onrender.com/script.js"></script>
//
// Delete all other IndiCare-related <script> and <style> blocks from the footer.

(function () {
  const BACKEND_BASE_URL = "https://childrens-homes-assistant-backend-new.onrender.com";

  // -----------------------------
  // Core API helper
  // -----------------------------
  const IndiCare = {
    api: async (path, options = {}) => {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
        ...options,
        headers
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      return res.json();
    }
  };

  // -----------------------------
  // Base layout injection
  // -----------------------------
  function renderBaseLayout() {
    const root = document.getElementById("indicare-admin-root");
    if (!root) return;

    root.innerHTML = `
      <div class="ic-admin-shell">
        <aside class="ic-admin-sidebar">
          <div>
            <div class="ic-admin-sidebar-title">IndiCare Admin</div>
            <div class="ic-admin-sidebar-subtitle">Operational console</div>
          </div>

          <nav class="ic-admin-nav">
            <div class="ic-admin-nav-item active" data-target="ic-section-health">System health</div>
            <div class="ic-admin-nav-item" data-target="ic-section-overview">Overview</div>
            <div class="ic-admin-nav-item" data-target="ic-section-providers">Providers & homes</div>
            <div class="ic-admin-nav-item" data-target="ic-section-staff">Staff</div>
          </nav>
        </aside>

        <main class="ic-admin-main">
          <header class="ic-admin-header">
            <div class="ic-admin-header-title">Operational console</div>
            <div class="ic-admin-header-subtitle">
              Providers, homes, staff, and system health in one calm surface.
            </div>
          </header>

          <!-- System health + Overview -->
          <section class="ic-admin-grid ic-admin-section" id="ic-section-health">
            <div class="ic-admin-panel">
              <div class="ic-admin-panel-header">
                <div>
                  <div class="ic-admin-panel-title">System health</div>
                  <div class="ic-admin-panel-subtitle">
                    Live view of IndiCare’s backend and authentication.
                  </div>
                </div>
                <span class="ic-admin-badge">Live</span>
              </div>
              <div class="ic-admin-panel-body">
                <div id="ic-health-status" class="ic-health-loading">Checking system health…</div>
                <div id="ic-health-details" style="margin-top: 10px; display: none;">
                  <div class="ic-health-row">
                    <div class="ic-health-label">API status</div>
                    <div class="ic-health-value" id="ic-health-api"></div>
                  </div>
                  <div class="ic-health-row">
                    <div class="ic-health-label">Response time</div>
                    <div class="ic-health-value" id="ic-health-latency"></div>
                  </div>
                  <div class="ic-health-row">
                    <div class="ic-health-label">Token expiry</div>
                    <div class="ic-health-value" id="ic-health-token"></div>
                  </div>
                  <div class="ic-health-row">
                    <div class="ic-health-label">Last successful call</div>
                    <div class="ic-health-value" id="ic-health-last"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="ic-admin-panel ic-admin-section" id="ic-section-overview">
              <div class="ic-admin-panel-header">
                <div>
                  <div class="ic-admin-panel-title">Quick overview</div>
                  <div class="ic-admin-panel-subtitle">
                    Providers, homes, and staff at a glance.
                  </div>
                </div>
                <span class="ic-admin-badge">Live</span>
              </div>
              <div class="ic-admin-panel-body">
                <div id="ic-overview-loading" style="font-size: 13px; color: #6b7280;">
                  Loading overview…
                </div>

                <div id="ic-overview-content" style="display:none; margin-top:10px;">
                  <div class="ic-overview-row">
                    <div class="ic-overview-label">Providers</div>
                    <div class="ic-overview-value" id="ic-overview-providers"></div>
                  </div>

                  <div class="ic-overview-row">
                    <div class="ic-overview-label">Homes</div>
                    <div class="ic-overview-value" id="ic-overview-homes"></div>
                  </div>

                  <div class="ic-overview-row">
                    <div class="ic-overview-label">Staff</div>
                    <div class="ic-overview-value" id="ic-overview-staff"></div>
                  </div>

                  <div class="ic-overview-row">
                    <div class="ic-overview-label">Assigned staff</div>
                    <div class="ic-overview-value" id="ic-overview-assigned"></div>
                  </div>

                  <div class="ic-overview-row">
                    <div class="ic-overview-label">Unassigned staff</div>
                    <div class="ic-overview-value" id="ic-overview-unassigned"></div>
                  </div>

                  <div class="ic-overview-row">
                    <div class="ic-overview-label">Homes with no staff</div>
                    <div class="ic-overview-value" id="ic-overview-emptyhomes"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Providers & Homes + Staff -->
          <section class="ic-admin-grid ic-admin-section" id="ic-section-providers" style="margin-top: 4px;">
            <div class="ic-admin-panel">
              <div class="ic-admin-panel-header">
                <div>
                  <div class="ic-admin-panel-title">Providers & homes</div>
                  <div class="ic-admin-panel-subtitle">
                    Creation and management will appear here.
                  </div>
                </div>
                <span class="ic-admin-badge">Coming next</span>
              </div>
              <div class="ic-admin-panel-body">
                The next module will replace this with live provider and home management.
              </div>
            </div>

            <div class="ic-admin-panel ic-admin-section" id="ic-section-staff">
              <div class="ic-admin-panel-header">
                <div>
                  <div class="ic-admin-panel-title">Staff</div>
                  <div class="ic-admin-panel-subtitle">
                    Assignment, movement, and archiving.
                  </div>
                </div>
                <span class="ic-admin-badge">Coming next</span>
              </div>
              <div class="ic-admin-panel-body">
                The staff panel and slide-over drawer will be wired in subsequent modules.
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    console.log("🟢 IndiCare Admin – Base Layout rendered");
  }

  // -----------------------------
  // Sidebar navigation
  // -----------------------------
  function enhanceSidebar() {
    const root = document.getElementById("indicare-admin-root");
    if (!root) return;

    const sidebar = root.querySelector(".ic-admin-sidebar");
    if (!sidebar) return;

    const items = sidebar.querySelectorAll(".ic-admin-nav-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        const targetId = item.getAttribute("data-target");
        const target = document.getElementById(targetId);
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 20,
            behavior: "smooth"
          });
        }

        items.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
      });
    });

    console.log("🟢 IndiCare Admin – Sidebar Navigation ready");
  }

  // -----------------------------
  // System health wiring
  // -----------------------------
  async function runHealthCheck() {
    const statusEl = document.getElementById("ic-health-status");
    const detailsEl = document.getElementById("ic-health-details");

    const apiEl = document.getElementById("ic-health-api");
    const latencyEl = document.getElementById("ic-health-latency");
    const tokenEl = document.getElementById("ic-health-token");
    const lastEl = document.getElementById("ic-health-last");

    if (!statusEl) return;

    const start = performance.now();

    try {
      await IndiCare.api("/health");
      const end = performance.now();
      const latency = Math.round(end - start);

      statusEl.style.display = "none";
      if (detailsEl) detailsEl.style.display = "block";

      if (apiEl) {
        apiEl.textContent = "Online";
        apiEl.classList.add("good");
      }

      if (latencyEl) {
        latencyEl.textContent = latency + " ms";
      }

      const token = localStorage.getItem("token");
      if (token && token.split(".").length === 3) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const exp = payload.exp * 1000;
          const remaining = exp - Date.now();
          const mins = Math.floor(remaining / 60000);
          if (tokenEl) tokenEl.textContent = mins + " min remaining";
        } catch {
          if (tokenEl) {
            tokenEl.textContent = "Token parse error";
            tokenEl.classList.add("bad");
          }
        }
      } else {
        if (tokenEl) {
          tokenEl.textContent = "No token";
          tokenEl.classList.add("bad");
        }
      }

      if (lastEl) {
        lastEl.textContent = new Date().toLocaleString();
      }
    } catch (err) {
      statusEl.textContent = "API unreachable";
      statusEl.style.color = "#b91c1c";
    }

    console.log("🟢 IndiCare Admin – System Health check complete");
  }

  // -----------------------------
  // Overview wiring
  // -----------------------------
  async function loadOverview() {
    const loadingEl = document.getElementById("ic-overview-loading");
    const contentEl = document.getElementById("ic-overview-content");

    if (!loadingEl || !contentEl) return;

    try {
      const data = await IndiCare.api("/overview");

      const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };

      set("ic-overview-providers", data.providers ?? "0");
      set("ic-overview-homes", data.homes ?? "0");
      set("ic-overview-staff", data.staff ?? "0");
      set("ic-overview-assigned", data.assigned_staff ?? "0");
      set("ic-overview-unassigned", data.unassigned_staff ?? "0");
      set("ic-overview-emptyhomes", data.homes_without_staff ?? "0");

      loadingEl.style.display = "none";
      contentEl.style.display = "block";

      console.log("🟢 IndiCare Admin – Overview loaded");
    } catch (err) {
      loadingEl.textContent = "Error loading overview";
      loadingEl.style.color = "#b91c1c";
      console.error("Overview error", err);
    }
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    renderBaseLayout();
    enhanceSidebar();
    runHealthCheck();
    loadOverview();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  console.log("🟢 IndiCare Admin – Console initialised");
})();
