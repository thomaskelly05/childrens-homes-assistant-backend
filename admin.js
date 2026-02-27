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
     Base Layout
  --------------------------------------------------------- */
  function renderBase() {
    const root = document.getElementById("ic-admin-root");
    root.innerHTML = `
      <div id="ic-admin-container">
        <aside id="ic-sidebar">
          <div class="ic-sidebar-item active" data-target="overview">Overview</div>
          <div class="ic-sidebar-item" data-target="providers">Providers & Homes</div>
          <div class="ic-sidebar-item" data-target="staff">Staff</div>
        </aside>

        <main id="ic-main">
          <section id="ic-overview">
            <div id="ic-overview-cards"></div>
          </section>

          <section id="ic-providers">
            <h2 style="color:#6CAEE0; margin-bottom:16px;">Providers & Homes</h2>
            <div id="ic-providers-list"></div>
          </section>

          <section id="ic-staff">
            <h2 style="color:#6CAEE0; margin-bottom:16px;">Staff</h2>
            <div id="ic-staff-list"></div>
          </section>
        </main>
      </div>

      <div id="ic-drawer"></div>
    `;
  }

  /* ---------------------------------------------------------
     Sidebar
  --------------------------------------------------------- */
  function initSidebar() {
    document.querySelectorAll(".ic-sidebar-item").forEach(item => {
      item.addEventListener("click", () => {
        document.querySelectorAll(".ic-sidebar-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        const target = item.dataset.target;

        if (target === "staff") loadStaff();

        document.getElementById("ic-" + target).scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  /* ---------------------------------------------------------
     Overview
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
      btn.addEventListener("click", () => openHomeDrawer(btn.dataset.provider));
    });
  }

  function openHomeDrawer(providerId) {
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
     Staff List
  --------------------------------------------------------- */
  async function loadStaff() {
    const list = document.getElementById("ic-staff-list");
    list.innerHTML = "Loading...";

    const staff = await API("/staff");
    const homes = await API("/public/homes");

    const homeMap = {};
    homes.forEach(h => homeMap[h.id] = h);

    list.innerHTML = "";

    staff.forEach(s => {
      const item = document.createElement("div");
      item.className = "ic-staff-item";

      const home = homeMap[s.home_id];
      const homeName = home ? home.name : "Unassigned";

      item.innerHTML = `
        <strong>${s.email}</strong>
        <div>${homeName}</div>
      `;

      item.addEventListener("click", () => openStaffDrawer(s, homeMap));
      list.appendChild(item);
    });
  }

  /* ---------------------------------------------------------
     Staff Drawer
  --------------------------------------------------------- */
  function openStaffDrawer(staff, homeMap) {
    const drawer = document.getElementById("ic-drawer");

    drawer.innerHTML = `
      <h3>${staff.email}</h3>

      <label>Assigned home</label>
      <select id="ic-staff-home-select"></select>

      <button id="ic-save-staff">Save</button>
    `;

    const select = drawer.querySelector("#ic-staff-home-select");

    Object.values(homeMap).forEach(home => {
      const opt = document.createElement("option");
      opt.value = home.id;
      opt.textContent = home.name;
      if (home.id === staff.home_id) opt.selected = true;
      select.appendChild(opt);
    });

    drawer.classList.add("open");

    document.getElementById("ic-save-staff").onclick = async () => {
      const newHomeId = Number(select.value);

      await API(`/staff/${staff.id}/reassign?new_home_id=${newHomeId}`, {
        method: "POST"
      });

      drawer.classList.remove("open");
      loadStaff();
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
