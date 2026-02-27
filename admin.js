(function () {
  const API = async (path, options = {}) => {
    const url = "https://childrens-homes-assistant-backend-new.onrender.com" + path;

    const res = await fetch(url, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include"
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  /* ---------------------------------------------------------
     Render Base Layout
  --------------------------------------------------------- */
  function renderBase() {
    const root = document.getElementById("ic-admin-root");
    root.innerHTML = `
      <div id="ic-admin-container">
        <aside id="ic-sidebar">
          <div class="ic-sidebar-item active" data-target="overview">Overview</div>
          <div class="ic-sidebar-item" data-target="providers">Providers & Homes</div>
        </aside>

        <main id="ic-main">
          <section id="ic-overview">
            <div id="ic-overview-cards"></div>
          </section>

          <section id="ic-providers">
            <h2 style="color:#6CAEE0; margin-bottom:16px;">Providers & Homes</h2>
            <div id="ic-providers-list"></div>
          </section>
        </main>
      </div>

      <div id="ic-drawer"></div>
    `;
  }

  /* ---------------------------------------------------------
     Sidebar Behaviour
  --------------------------------------------------------- */
  function initSidebar() {
    document.querySelectorAll(".ic-sidebar-item").forEach(item => {
      item.addEventListener("click", () => {
        document.querySelectorAll(".ic-sidebar-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        const target = item.dataset.target;
        const section = document.getElementById("ic-" + target);
        section.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  /* ---------------------------------------------------------
     Overview Cards
  --------------------------------------------------------- */
  async function loadOverview() {
    const data = await API("/overview");

    const container = document.getElementById("ic-overview-cards");
    container.innerHTML = `
      <div class="ic-card">
        <div class="ic-card-number">${data.providers}</div>
        <div class="ic-card-label">Providers</div>
      </div>
      <div class="ic-card">
        <div class="ic-card-number">${data.homes}</div>
        <div class="ic-card-label">Homes</div>
      </div>
      <div class="ic-card">
        <div class="ic-card-number">${data.staff}</div>
        <div class="ic-card-label">Staff</div>
      </div>
    `;
  }

  /* ---------------------------------------------------------
     Providers & Homes
  --------------------------------------------------------- */
  async function loadProviders() {
    const providers = await API("/public/providers");
    const homes = await API("/public/homes");

    const grouped = {};
    homes.forEach(h => {
      if (!grouped[h.provider_id]) grouped[h.provider_id] = [];
      grouped[h.provider_id].push(h);
    });

    const container = document.getElementById("ic-providers-list");
    container.innerHTML = "";

    providers.forEach(p => {
      const card = document.createElement("div");
      card.className = "ic-provider-card";

      card.innerHTML = `
        <div class="ic-provider-title">${p.name}</div>
        <div class="ic-homes"></div>
        <div class="ic-add-home-btn" data-provider="${p.id}">+ Add home</div>
      `;

      const homesContainer = card.querySelector(".ic-homes");
      (grouped[p.id] || []).forEach(h => {
        const hCard = document.createElement("div");
        hCard.className = "ic-home-card";
        hCard.textContent = h.name;
        homesContainer.appendChild(hCard);
      });

      container.appendChild(card);
    });

    initAddHomeButtons();
  }

  /* ---------------------------------------------------------
     Drawer for Adding Homes
  --------------------------------------------------------- */
  function initAddHomeButtons() {
    document.querySelectorAll(".ic-add-home-btn").forEach(btn => {
      btn.addEventListener("click", () => openDrawer(btn.dataset.provider));
    });
  }

  function openDrawer(providerId) {
    const drawer = document.getElementById("ic-drawer");
    drawer.innerHTML = `
      <h3>Add Home</h3>
      <input id="ic-home-name" placeholder="Home name">
      <button id="ic-create-home">Create</button>
    `;
    drawer.classList.add("open");

    document.getElementById("ic-create-home").onclick = async () => {
      const name = document.getElementById("ic-home-name").value.trim();
      if (!name) return;

      await API("/homes", {
        method: "POST",
        body: { name, provider_id: Number(providerId) }
      });

      drawer.classList.remove("open");
      loadProviders();
    };
  }

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  renderBase();
  initSidebar();
  loadOverview();
  loadProviders();
})();
