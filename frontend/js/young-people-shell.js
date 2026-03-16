const state = {
  youngPeople: [],
  selectedYoungPerson: null,
  activeTab: "overview"
};

const els = {

  youngPeopleList: document.getElementById("youngPeopleList"),
  search: document.getElementById("youngPersonSearch"),

  selectedName: document.getElementById("selectedYoungPersonName"),
  selectedMeta: document.getElementById("selectedYoungPersonMeta"),

  tabs: document.querySelectorAll(".tab-btn"),
  panels: document.querySelectorAll(".tab-panel"),

  refreshBtn: document.getElementById("refreshYoungPeopleBtn"),

  complianceContent: document.getElementById("complianceContent"),
  complianceStatusFilter: document.getElementById("complianceStatusFilter"),
  complianceCategoryFilter: document.getElementById("complianceCategoryFilter"),

  standardsSummary: document.getElementById("standardsSummary"),
  standardsEvidenceList: document.getElementById("standardsEvidenceList"),

  chronologyContent: document.getElementById("chronologyContent"),

  monthlyReviewsList: document.getElementById("monthlyReviewsList"),
  monthlyReviewDetail: document.getElementById("monthlyReviewDetail"),
  generateMonthlyReviewBtn: document.getElementById("generateMonthlyReviewBtn"),
  monthlyReviewMonth: document.getElementById("monthlyReviewMonth"),

  inspectionPackBtn: document.getElementById("inspectionPackBtn")
};

const endpoints = {

  youngPeople: "/young-people/list",

  compliance: (id) => `/compliance/young-person/${id}`,

  standardsSummary: (id) => `/standards-evidence/young-person/${id}/summary`,
  standardsEvidence: (id) => `/standards-evidence/young-person/${id}`,

  chronology: (id) => `/chronology/young-person/${id}`,

  monthlyReviewsList: (id) => `/monthly-reviews/young-person/${id}`,
  monthlyReviewDetail: (id) => `/monthly-reviews/${id}`,
  monthlyReviewGenerate: (id, month) =>
    `/monthly-reviews/young-person/${id}/generate?review_month=${month}`,

  inspectionPack: (id) => `/ofsted/inspection-pack/${id}`

};


async function fetchJson(url, opts = {}) {

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });

  if (!res.ok) {
    throw new Error("Request failed");
  }

  return res.json();

}


function bindTabs() {

  els.tabs.forEach(btn => {

    btn.addEventListener("click", () => {

      const tab = btn.dataset.tab;

      state.activeTab = tab;

      els.tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      els.panels.forEach(p => p.classList.remove("active"));

      document
        .getElementById(`tab-${tab}`)
        .classList.add("active");

      loadActiveTab();

    });

  });

}


async function loadYoungPeople() {

  els.youngPeopleList.innerHTML = "Loading...";

  const rows = await fetchJson(endpoints.youngPeople);

  state.youngPeople = rows;

  renderYoungPeople(rows);

}


function renderYoungPeople(list) {

  els.youngPeopleList.innerHTML = list.map(p => `

    <div class="yp-row" data-id="${p.id}">
      ${p.first_name} ${p.last_name}
    </div>

  `).join("");

  document.querySelectorAll(".yp-row").forEach(row => {

    row.onclick = () => {

      const id = row.dataset.id;

      selectYoungPerson(id);

    };

  });

}


async function selectYoungPerson(id) {

  const yp = state.youngPeople.find(p => p.id == id);

  state.selectedYoungPerson = yp;

  els.selectedName.textContent =
    `${yp.first_name} ${yp.last_name}`;

  els.selectedMeta.textContent =
    `ID ${yp.id}`;

  loadActiveTab();

}


async function loadActiveTab() {

  if (!state.selectedYoungPerson) return;

  const id = state.selectedYoungPerson.id;

  switch (state.activeTab) {

    case "compliance":
      loadCompliance(id);
      break;

    case "standards":
      loadStandards(id);
      break;

    case "chronology":
      loadChronology(id);
      break;

    case "monthly_reviews":
      loadMonthlyReviews(id);
      break;

  }

}


async function loadCompliance(id) {

  els.complianceContent.innerHTML = "Loading...";

  const rows = await fetchJson(
    endpoints.compliance(id)
  );

  renderCompliance(rows);

}


function renderCompliance(rows) {

  const status = els.complianceStatusFilter.value;
  const category = els.complianceCategoryFilter.value;

  const filtered = rows.filter(r => {

    if (status !== "all" && r.status !== status)
      return false;

    if (category !== "all" && r.category !== category)
      return false;

    return true;

  });

  els.complianceContent.innerHTML = `

  <table class="data-table">

    <thead>
      <tr>
        <th>Category</th>
        <th>Title</th>
        <th>Status</th>
        <th>Due</th>
      </tr>
    </thead>

    <tbody>

      ${filtered.map(r => `

        <tr>

          <td>${r.category}</td>

          <td>${r.title}</td>

          <td>
            <span class="status ${r.status}">
              ${r.status}
            </span>
          </td>

          <td>${formatDate(r.next_due_date)}</td>

        </tr>

      `).join("")}

    </tbody>

  </table>

  `;

}


async function loadStandards(id) {

  const summary = await fetchJson(
    endpoints.standardsSummary(id)
  );

  els.standardsSummary.innerHTML = `

  <table class="data-table">

  <thead>
    <tr>
      <th>Standard</th>
      <th>Evidence</th>
    </tr>
  </thead>

  <tbody>

  ${summary.map(s => `

    <tr>

      <td>${s.code}</td>

      <td>${s.evidence_count}</td>

    </tr>

  `).join("")}

  </tbody>

  </table>

  `;

}


async function loadChronology(id) {

  const rows = await fetchJson(
    endpoints.chronology(id)
  );

  els.chronologyContent.innerHTML = rows.map(r => `

  <div class="timeline-row">

    <div class="timeline-date">
      ${formatDate(r.event_date)}
    </div>

    <div class="timeline-body">
      <strong>${r.source_table}</strong>
      <p>${r.summary}</p>
    </div>

  </div>

  `).join("");

}


async function loadMonthlyReviews(id) {

  const rows = await fetchJson(
    endpoints.monthlyReviewsList(id)
  );

  els.monthlyReviewsList.innerHTML = `

  <table class="data-table">

  <thead>
  <tr>
  <th>Month</th>
  <th>Status</th>
  <th>Title</th>
  <th></th>
  </tr>
  </thead>

  <tbody>

  ${rows.map(r => `

  <tr>

  <td>${formatDate(r.review_month)}</td>

  <td>${r.status}</td>

  <td>${r.review_title || ""}</td>

  <td>

  <button onclick="loadMonthlyReviewDetail(${r.id})">
  Open
  </button>

  </td>

  </tr>

  `).join("")}

  </tbody>

  </table>

  `;

}


async function loadMonthlyReviewDetail(id) {

  const data = await fetchJson(
    endpoints.monthlyReviewDetail(id)
  );

  const r = data.review;

  els.monthlyReviewDetail.innerHTML = `

  <h3>${r.review_title}</h3>

  <p>${r.summary_of_month}</p>

  <h4>Child Voice</h4>

  <p>${r.child_voice_summary}</p>

  <h4>Concerns</h4>

  <p>${r.concerns_and_risks}</p>

  `;

}


function formatDate(d) {

  if (!d) return "";

  return new Date(d)
    .toISOString()
    .split("T")[0];

}


function bindEvents() {

  els.refreshBtn.onclick = loadYoungPeople;

  els.search.oninput = () => {

    const term = els.search.value.toLowerCase();

    const filtered = state.youngPeople.filter(p =>
      `${p.first_name} ${p.last_name}`
        .toLowerCase()
        .includes(term)
    );

    renderYoungPeople(filtered);

  };

  els.generateMonthlyReviewBtn.onclick = async () => {

    const id = state.selectedYoungPerson.id;

    const month = els.monthlyReviewMonth.value;

    await fetchJson(
      endpoints.monthlyReviewGenerate(
        id,
        month + "-01"
      ),
      { method: "POST" }
    );

    loadMonthlyReviews(id);

  };

  els.inspectionPackBtn.onclick = () => {

    if (!state.selectedYoungPerson) return;

    window.open(
      endpoints.inspectionPack(
        state.selectedYoungPerson.id
      )
    );

  };

}


function init() {

  bindTabs();
  bindEvents();
  loadYoungPeople();

}

init();
