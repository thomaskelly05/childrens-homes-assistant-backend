const API = "/api";

/* ---------- LOAD DASHBOARD ---------- */
async function loadDashboard() {
  document.getElementById("pageTitle").innerText = "Shift Dashboard";

  const res = await fetch(`${API}/young-people`);
  const data = await res.json();

  const content = document.getElementById("content");
  content.innerHTML = "";

  data.forEach(yp => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${yp.name}</h3>
      <p>Age: ${yp.age}</p>
      <button onclick="viewYoungPerson(${yp.id})">Open</button>
    `;
    content.appendChild(card);
  });
}

/* ---------- LOAD YOUNG PEOPLE ---------- */
async function loadYoungPeople() {
  document.getElementById("pageTitle").innerText = "Young People";

  const res = await fetch(`${API}/young-people`);
  const data = await res.json();

  const content = document.getElementById("content");
  content.innerHTML = "";

  data.forEach(yp => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${yp.name}</h3>
      <button onclick="viewYoungPerson(${yp.id})">View Profile</button>
    `;
    content.appendChild(card);
  });
}

/* ---------- VIEW PROFILE ---------- */
async function viewYoungPerson(id) {
  const res = await fetch(`${API}/young-people/${id}`);
  const yp = await res.json();

  document.getElementById("pageTitle").innerText = yp.name;

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="card">
      <h2>${yp.name}</h2>
      <p>Age: ${yp.age}</p>
      <p>Risk: ${yp.risk_level || "N/A"}</p>
    </div>
  `;
}

/* ---------- HANDOVER ---------- */
async function loadHandover() {
  document.getElementById("pageTitle").innerText = "Handover";

  const res = await fetch(`${API}/handover`);
  const data = await res.json();

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="card">
      <h3>Shift Summary</h3>
      <p>${data.summary}</p>
    </div>
  `;
}

/* ---------- MODALS ---------- */
function openNoteModal() {
  document.getElementById("noteModal").classList.remove("hidden");
}

function openIncidentModal() {
  document.getElementById("incidentModal").classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

/* ---------- AI NOTE ---------- */
async function generateAINote() {
  const input = document.getElementById("noteInput").value;

  const res = await fetch(`${API}/ai/notes`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({text: input})
  });

  const data = await res.json();
  document.getElementById("noteOutput").value = data.output;
}

/* ---------- SAVE NOTE ---------- */
async function saveNote() {
  const text = document.getElementById("noteOutput").value;

  await fetch(`${API}/young-people/daily-notes`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({text})
  });

  closeModal("noteModal");
  loadDashboard();
}

/* ---------- AI INCIDENT ---------- */
async function generateAIIncident() {
  const input = document.getElementById("incidentInput").value;

  const res = await fetch(`${API}/ai/incident`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({text: input})
  });

  const data = await res.json();
  document.getElementById("incidentOutput").value = data.output;
}

/* ---------- SAVE INCIDENT ---------- */
async function saveIncident() {
  const text = document.getElementById("incidentOutput").value;

  await fetch(`${API}/incidents`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({text})
  });

  closeModal("incidentModal");
  loadDashboard();
}

/* ---------- INIT ---------- */
loadDashboard();
