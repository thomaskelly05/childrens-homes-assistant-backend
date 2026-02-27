// IndiCare Admin – Single-file Admin Console
// ------------------------------------------
// Load this file from Squarespace using:
//
// <div id="indicare-admin-root"></div>
// <script src="https://childrens-homes-assistant-backend-new.onrender.com/script.js"></script>

(function () {
  const BACKEND = "https://childrens-homes-assistant-backend-new.onrender.com";

  const IndiCare = {
    api: async (path, options = {}) => {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const res = await fetch(`${BACKEND}${path}`, { ...options, headers });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    }
  };

  // ---------------------------------------------------------
  // Base Layout
  // ---------------------------------------------------------
  function renderBaseLayout() {
    const root = document.getElementById("indicare-admin-root");
    if (!root) return;

    root.innerHTML = `
      <style>
        body { margin: 0; font-family: system-ui, sans-serif; }

        .ic-admin-shell { display: flex; min-height: 100vh; background: #f8fafc; }
        .ic-admin-sidebar { width: 260px; background: #0f172a; color: #e5e7eb; padding: 24px 18px; display: flex; flex-direction: column; gap: 28px; }
        .ic-admin-sidebar-title { font-size: 18px; font-weight: 600; }
        .ic-admin-sidebar-subtitle { font-size: 12px; color: #9ca3af; }

        .ic-admin-nav { display: flex; flex-direction: column; gap: 6px; }
        .ic-admin-nav-item { padding: 8px 10px; border-radius: 6px; font-size: 14px; cursor: pointer; }
        .ic-admin-nav-item:hover { background: #1e293b; }
        .ic-admin-nav-item.active { background: #1e293b; color: #fff; }

        .ic-admin-main { flex: 1; padding: 32px; }
        .ic-admin-header-title { font-size: 24px; font-weight: 600; }
        .ic-admin-header-subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }

        .ic-admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
        .ic-admin-panel { background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .ic-admin-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .ic-admin-panel-title { font-size: 16px; font-weight: 600; }
        .ic-admin-panel-subtitle { font-size: 13px; color: #6b7280; }
        .ic-admin-badge { background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 6px; font-size: 12px; }

        .ic-health-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f2f5; font-size: 13px; }
        .ic-health-label { color: #374151; }
        .ic-health-value { font-weight: 500; color: #111827; }
        .ic-health-value.good { color: #065f46; }
        .ic-health-value.bad { color: #b91c1c; }

        .ic-overview-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f2f5; font-size: 13px; }

        /* Providers & Homes */
        .ic-provider { border-bottom: 1px solid #e5e7eb; padding: 10px 0; cursor: pointer; }
        .ic-provider-name { font-weight: 600; font-size: 14px; }
        .ic-provider-homes { margin-top: 8px; padding-left: 12px; display: none; }
        .ic-home { padding: 6px 0; font-size: 13px; color: #374151; }

        .ic-add-btn { margin-top: 10px; font-size: 13px; color: #0369a1; cursor: pointer; }

        /* Drawer */
        .ic-drawer { position: fixed; top: 0; right: -400px; width: 360px; height: 100%; background: #fff; box-shadow: -2px 0 6px rgba(0,0,0,0.1); padding: 24px; transition: right 0.25s ease; z-index: 9999; }
        .ic-drawer.open { right: 0; }
        .ic-drawer-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
        .ic-input { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 12px; }
        .ic-btn { background: #0f172a; color: #fff; padding: 10px 14px; border-radius: 6px; cursor: pointer; width: 100%; text-align: center; }
      </style>

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
          <header>
            <div class="ic-admin-header-title">Operational console</div>
            <div class="ic-admin-header-subtitle">Providers, homes, staff, and system health in one calm surface.</div>
          </header>

          <section class="ic-admin-grid" id="ic-section-health">
            <div class="ic-admin-panel">
              <div class="ic-admin-panel-header">
                <div>
                  <div class="ic-admin-panel-title">System health</div>
                  <div class="ic-admin-panel-subtitle">Live view of IndiCare’s backend and authentication.</div>
                </div>
                <span class="ic-admin-badge">Live</span>
              </div>
              <div class="ic-admin-panel-body">
                <div id="ic-health-status">Checking system health…</div>
                <div id="ic-health-details" style="display:none; margin-top:10px;">
                  <div class="ic-health-row"><div class="ic-health-label">API status</div><div class="ic-health-value" id="ic-health-api"></div></div>
                  <div class="ic-health-row"><div class="ic-health-label">Response time</div><div class="ic-health-value" id="ic-health-latency"></div></div>
                  <div class="ic-health-row"><div class="ic-health-label">Token expiry</div><div class="ic-health-value" id="ic-health-token"></div></div>
                  <div class="ic-health-row"><div class="ic-health-label">Last successful call</div><div class="ic-health-value" id="ic-health-last"></div></div>
                </div>
              </div>
            </div>

            <div class="ic-admin-panel" id="ic-section-overview">
              <div class="ic-admin-panel-header">
                <div>
                  <div class="ic-admin-panel-title">Quick overview</div>
                  <div class="ic-admin-panel-subtitle">Providers, homes, and staff at a glance.</div>
                </div>
                <span class="ic-admin-badge">Live</span>
              </div>
              <div class="ic-admin-panel-body">
                <div id="ic-overview-loading">Loading overview…</div>
                <div id="ic-overview-content" style="display:none; margin-top:10px;">
                  <div class="ic-overview-row"><div>Providers</div><div id="ic-overview-providers"></div></div>
                  <div class="ic-overview-row"><div>Homes</div><div id="ic-overview-homes"></div></div>
                  <div class="ic-overview-row"><div>Staff</div><div id="ic-overview-staff"></div></div>
                  <div class="ic-overview-row"><div>Assigned staff</div><div id="ic-overview-assigned"></div></div>
                  <div class="ic-overview-row"><div>Unassigned staff</div><div id="ic-overview-unassigned"></div></div>
                  <div class="ic-overview-row"><div>Homes with no staff</div><div id="ic-overview-emptyhomes"></div></div>
                </div>
              </div>
            </div>
          </section>

          <section class="ic-admin-grid" id="ic-section-providers">
            <div class="ic-admin-panel">
              <div class="ic-admin-panel-header">
                <div>
                  <div class="ic-admin-panel-title">Providers & homes</div>
                  <div class="ic-admin-panel-subtitle">Minimal, calm accordion.</div>
                </div>
                <span class="ic-admin-badge">Live</span>
              </div>
              <div class="ic-admin-panel-body">
                <div class="ic-add-btn" id="ic-add-provider">+ Add provider</div>
                <div id="ic-providers-list" style="margin-top:12px;"></div>
              </div>
            </div>

            <div class="ic-admin-panel" id="ic-section-staff">
              <div class="ic-admin-panel-header">
                <div>
                  <div class="ic-admin-panel-title">Staff</div>
                  <div class="ic-admin-panel-subtitle">Coming soon.</div>
                </div>
                <span class="ic-admin-badge">Next</span>
              </div>
              <div class="ic-admin-panel-body">Staff module will be added next.</div>
            </div>
          </section>
        </main>
      </div>

      <div class="ic-drawer" id="ic-drawer">
        <div class="ic-drawer-title" id="ic-drawer-title"></div>
        <input class="ic-input" id="ic-drawer-input" placeholder="Name…" />
        <div class="ic-btn" id="ic-drawer-save">Save</div>
      </div>
    `;
  }

  // ---------------------------------------------------------
  // Sidebar Navigation
  // ---------------------------------------------------------
  function enhanceSidebar() {
    const items = document.querySelectorAll(".ic-admin-nav-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        const target = document.getElementById(item.dataset.target);
        if (target) {
          window.scrollTo({ top: target.offsetTop - 20, behavior: "smooth" });
        }
        items.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
      });
    });
  }

  // ---------------------------------------------------------
  // System Health
  // ---------------------------------------------------------
  async function runHealthCheck() {
    const statusEl = document.getElementById("ic-health-status");
    const detailsEl = document.getElementById("ic-health-details");
    const apiEl = document.getElementById("ic-health-api");
    const latencyEl = document.getElementById("ic-health-latency");
    const tokenEl = document.getElementById("ic-health-token");
    const lastEl = document.getElementById("ic-health-last");

    const start = performance.now();

    try {
      await IndiCare.api("/health");
      const latency = Math.round(performance.now() - start);

      statusEl.style.display = "none";
      detailsEl.style.display = "block";

      apiEl.textContent = "Online";
      apiEl.classList.add("good");
      latencyEl.textContent = latency + " ms";

      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const mins = Math.floor((payload.exp * 1000 - Date.now()) / 60000);
        tokenEl.textContent = mins + " min remaining";
      } else {
        tokenEl.textContent = "No token";
        tokenEl.classList.add("bad");
      }

      lastEl.textContent = new Date().toLocaleString();
    } catch {
      statusEl.textContent = "API unreachable";
      statusEl.style.color = "#b91c1c";
    }
  }

  // ---------------------------------------------------------
  // Overview
  // ---------------------------------------------------------
  async function loadOverview() {
    const loading = document.getElementById("ic-overview-loading");
    const content = document.getElementById("ic-overview-content");

    try {
      const data = await IndiCare.api("/overview");

      const set = (id, v) => (document.getElementById(id).textContent = v);

      set("ic-overview-providers", data.providers);
      set("ic-overview-homes", data.homes);
      set("ic-overview-staff", data.staff);
      set("ic-overview-assigned", data.assigned_staff);
      set("ic-overview-unassigned", data.unassigned_staff);
      set("ic-overview-emptyhomes", data.homes_without_staff);

      loading.style.display = "none";
      content.style.display = "block";
    } catch {
      loading.textContent = "Error loading overview";
      loading.style.color = "#b91c1c";
    }
  }

  // ---------------------------------------------------------
  // Drawer
  // ---------------------------------------------------------
  const Drawer = {
    el: null,
    titleEl: null,
    inputEl: null,
    saveEl: null,
    mode: null,
    providerId: null,

    init() {
      this.el = document.getElementById("ic-drawer");
      this.titleEl = document.getElementById("ic-drawer-title");
      this.inputEl = document.getElementById("ic-drawer-input");
      this.saveEl = document.getElementById("ic-drawer-save");

      this.saveEl.addEventListener("click", () => this.save());
    },

    open(mode, providerId = null) {
      this.mode = mode;
      this.providerId = providerId;
      this.inputEl.value = "";

      if (mode === "provider") this.titleEl.textContent = "Add provider";
      if (mode === "home") this.titleEl.textContent = "Add home";

      this.el.classList.add("open");
    },

    close() {
      this.el.classList.remove("open");
    },

    async save() {
      const name = this.inputEl.value.trim();
      if (!name) return;

      try {
        if (this.mode === "provider") {
          await IndiCare.api("/providers", {
            method: "POST",
            body: JSON.stringify({ name })
          });
        }

        if (this.mode === "home") {
          await IndiCare.api("/homes", {
            method: "POST",
            body: JSON.stringify({ name, provider_id: this.providerId })
          });
        }

        this.close();
        loadProviders();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ---------------------------------------------------------
  // Providers & Homes (Accordion)
  // ---------------------------------------------------------
  async function loadProviders() {
    const list = document.getElementById("ic-providers-list");
    list.innerHTML = "Loading…";

    try {
      const providers = await IndiCare.api("/providers");
      const homes = await IndiCare.api("/homes");

      list.innerHTML = "";

      providers.forEach(provider => {
        const providerEl = document.createElement("div");
        providerEl.className = "ic-provider";

        providerEl.innerHTML = `
          <div class="ic-provider-name">${provider.name}</div>
          <div class="ic-provider-homes" id="homes-${provider.id}"></div>
        `;

        providerEl.addEventListener("click", () => {
          const homesEl = document.getElementById(`homes-${provider.id}`);
          const isOpen = homesEl.style.display === "block";
          homesEl.style.display = isOpen ? "none" : "block";
        });

        list.appendChild(providerEl);

        const homesEl = document.getElementById(`homes-${provider.id}`);
        const providerHomes = homes.filter(h => h.provider_id === provider.id);

        providerHomes.forEach(home => {
          const homeEl = document.createElement("div");
          homeEl.className = "ic-home";
          homeEl.textContent = home.name;
          homesEl.appendChild(homeEl);
        });

        const addHome = document.createElement("div");
        addHome.className = "ic-add-btn";
        addHome.textContent = "+ Add home";
        addHome.addEventListener("click", e => {
          e.stopPropagation();
          Drawer.open("home", provider.id);
        });
        homesEl.appendChild(addHome);
      });
    } catch (err) {
      list.textContent = "Error loading providers";
    }
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  function init() {
    renderBaseLayout();
    enhanceSidebar();
    Drawer.init();
