(function () {
  // ---------------------------------------------------------
  // IndiCare API Wrapper
  // ---------------------------------------------------------
  const IndiCare = {
    async api(path, options = {}) {
      const url = "https://childrens-homes-assistant-backend-new.onrender.com" + path;

      const res = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "include"
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error: ${res.status} - ${text}`);
      }

      return res.json();
    }
  };

  // ---------------------------------------------------------
  // Base Layout Rendering
  // ---------------------------------------------------------
  function renderBaseLayout() {
    const root = document.getElementById("ic-admin-root");
    if (!root) return;

    root.innerHTML = `
      <div id="ic-admin-container">
        <aside id="ic-sidebar"></aside>
        <main id="ic-main">
          <section id="ic-overview"></section>
          <section id="ic-providers">
            <h2>Providers & Homes</h2>
            <div id="ic-providers-list"></div>
          </section>
        </main>
      </div>
    `;
  }

  // ---------------------------------------------------------
  // Sidebar Enhancements
  // ---------------------------------------------------------
  function enhanceSidebar() {
    const sidebar = document.getElementById("ic-sidebar");
    if (!sidebar) return;

    sidebar.innerHTML = `
      <div class="ic-sidebar-item" data-target="overview">Overview</div>
      <div class="ic-sidebar-item" data-target="providers">Providers & Homes</div>
    `;

    sidebar.querySelectorAll(".ic-sidebar-item").forEach(item => {
      item.addEventListener("click", () => {
        const target = item.getAttribute("data-target");
        document.getElementById("ic-main").scrollTo({
          top: document.getElementById("ic-" + target).offsetTop,
          behavior: "smooth"
        });
      });
    });
  }

  // ---------------------------------------------------------
  // Drawer Component
  // ---------------------------------------------------------
  const Drawer = {
    init() {
      let drawer = document.getElementById("ic-drawer");
      if (!drawer) {
        drawer = document.createElement("div");
        drawer.id = "ic-drawer";
        document.body.appendChild(drawer);
      }
    },

    open(type, providerId) {
      const drawer = document.getElementById("ic-drawer");
      drawer.innerHTML = `
        <div class="ic-drawer-content">
          <h3>Create Home</h3>
          <input id="ic-home-name" placeholder="Home name" />
          <button id="ic-save-home">Save</button>
          <button id="ic-close-drawer">Close</button>
        </div>
      `;

      drawer.style.display = "block";

      document.getElementById("ic-close-drawer").onclick = () => {
        drawer.style.display = "none";
      };

      document.getElementById("ic-save-home").onclick = async () => {
        const name = document.getElementById("ic-home-name").value.trim();
        if (!name) return alert("Enter a name");

        await IndiCare.api("/homes", {
          method: "POST",
          body: {
            provider_id: providerId,
            name
          }
        });

        drawer.style.display = "none";
        loadProviders();
      };
    }
  };

  // ---------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------
  async function runHealthCheck() {
    try {
      await IndiCare.api("/health");
      console.log("Backend healthy");
    } catch (err) {
      console.error("Health check failed", err);
    }
  }

  // ---------------------------------------------------------
  // Overview Loader
  // ---------------------------------------------------------
  async function loadOverview() {
    const el = document.getElementById("ic-overview");
    if (!el) return;

    try {
      const data = await IndiCare.api("/overview");
      el.innerHTML = `
        <div class="ic-overview-card">
          <h3>Overview</h3>
          <p>Providers: ${data.providers}</p>
          <p>Homes: ${data.homes}</p>
          <p>Staff: ${data.staff}</p>
        </div>
      `;
    } catch (err) {
      console.error(err);
      el.innerHTML = "Error loading overview";
    }
  }

  // ---------------------------------------------------------
  // Providers & Homes (Accordion)
  // ---------------------------------------------------------
  async function loadProviders() {
    const list = document.getElementById("ic-providers-list");
    if (!list) return;

    list.innerHTML = "Loading...";

    try {
      // UPDATED ENDPOINTS
      const providers = await IndiCare.api("/public/providers");
      const homes = await IndiCare.api("/public/homes");

      list.innerHTML = "";

      providers.forEach(provider => {
        const providerEl = document.createElement("div");
        providerEl.className = "ic-provider";

        providerEl.innerHTML = [
          '<div class="ic-provider-name">',
          provider.name,
          '</div>',
          '<div class="ic-provider-homes" id="homes-',
          provider.id,
          '"></div>'
        ].join("");

        providerEl.addEventListener("click", () => {
          const homesEl = document.getElementById("homes-" + provider.id);
          if (!homesEl) return;
          const isOpen = homesEl.style.display === "block";
          homesEl.style.display = isOpen ? "none" : "block";
        });

        list.appendChild(providerEl);

        const homesEl = document.getElementById("homes-" + provider.id);
        if (!homesEl) return;

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
      console.error(err);
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
    runHealthCheck();
    loadOverview();
    loadProviders();
  }

  init();
})();
